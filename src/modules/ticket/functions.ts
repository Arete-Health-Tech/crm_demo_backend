import {
  ChangeStreamDocument,
  ClientSession,
  Collection,
  ObjectId,
} from "mongodb";
import { findConsumerFromWAID } from "../../services/whatsapp/webhook";
import {
  sendMessage,
  sendTemplateMessage,
} from "../../services/whatsapp/whatsapp";
import { FUNCTION_RESPONSE } from "../../types/api/api";
import { CONSUMER } from "../../types/consumer/consumer";
import {
  iEstimate,
  ifollowUp,
  iNote,
  iPrescription,
  iSkip,
  iTicket,
  iTicketDate,
  iTicketUpdate,
  iUpdateTicketData,
  subStageCodeType,
} from "../../types/ticket/ticket";
import MongoService, { Collections } from "../../utils/mongo";
import {
  PRESCRIPTION_DB,
  TICKET_DB,
  createOneFollowUp,
  createOnePrescription,
  createOneTicket,
  findOnePrescription,
  findServices,
  findTicket,
  findTicketById,
} from "./crud";
import { RedisUpdateSingleTicketLookUp } from "./ticketUtils/utilFunctions";
import { IO } from "../../server";
import { REFETCH_TICKETS } from "../../utils/socket/constants";
import { CONSUMER_DB, findOneConsumer } from "../consumer/crud";
export const createTicketHandler = async (
  ticket: iTicket,
  session: ClientSession
) => {
  const createdTicket = await createOneTicket(ticket, session);
  return { status: 200, body: createdTicket };
};
export const getAllTicketHandler = async () => {
  return await MongoService.collection(Collections.TICKET).find({}).toArray();
};
export const getFlowData = async (_id: string) => {
  try {
    const document = await MongoService.collection(
      Collections.FLOWDATA
    ).findOne({ _id });
    if (document) {
      // Extract the specific fields you need
      const { _id, vedio, image, text } = document;
      return { _id, vedio, image, text };
    } else {
      return null; // Document with the given _id not found
    }
  } catch (error) {
    console.error("Error retrieving document by ID:", error);
    throw error;
  }
};
export const findOneTicket = async (ticketId: ObjectId) => {
  return await MongoService.collection(Collections.TICKET).findOne<iTicket>({
    _id: ticketId,
  });
};
export const getConsumerTickets = async (consumerId: ObjectId) => {
  return await MongoService.collection(Collections.TICKET)
    .find<iTicket>({ consumer: consumerId })
    .toArray();
};
export const updateTicket = async (
  ticketId: string,
  body: iTicketUpdate,
  session: ClientSession
) => {
  return await MongoService.collection(Collections.TICKET).updateOne(
    {
      _id: new ObjectId(ticketId),
    },
    { $set: body },
    { session }
  );
};
export const triggerTicketChanges = async (
  event: ChangeStreamDocument<any>
) => {
  // console.log("tkt event", event);
  const { operationType } = event;
  if (operationType === "insert") {
    // New ticket created
    await RedisUpdateSingleTicketLookUp(event?.documentKey._id.toString());
    IO.emit(REFETCH_TICKETS); //trigger client side ticket re-fetch
  } else if (operationType === "update") {
    // Ticket updated
    await RedisUpdateSingleTicketLookUp(event?.documentKey._id.toString());
  }
};
export const watchTicketChangesEvent = async () => {
  const changeStream = MongoService.collection(Collections.TICKET).watch();
  // console.log("stream", changeStream);
  return changeStream.on("change", (event) => triggerTicketChanges(event));
};
export const updateSubStage = async (
  ticketId: ObjectId,
  subStageCode: subStageCodeType,
  session: ClientSession
) => {
  return await MongoService.collection(Collections.TICKET).updateOne(
    { _id: ticketId },
    { $set: { subStageCode } },
    { session }
  );
};
export const getConsumerPrescriptions = async (consumerId: ObjectId) => {
  return await MongoService.collection(Collections.PRESCRIPTION)
    .find<iPrescription>({ consumer: consumerId })
    .toArray();
};
export const createPrescription = async (
  prescription: iPrescription,
  session: ClientSession
) => {
  return await createOnePrescription(prescription, session);
};
///follow
export const createFollowUp = async (followUp: ifollowUp) => {
  return await createOneFollowUp(followUp);
};
export const searchService = async (
  searchQuery: string,
  departmentType: string
): Promise<FUNCTION_RESPONSE> => {
  const query: any = { $text: { $search: searchQuery } };
  departmentType && (query.departmentType = departmentType);
  const consumers = await findServices(query);
  return { status: 200, body: consumers };
};
//prescription
export const getPrescriptionById = async (id: ObjectId) => {
  console.log(id," this is id")
  return await MongoService.collection(
    Collections.PRESCRIPTION
  ).findOne<iPrescription>({ _id: id });
};
export const findTicketAndPrescriptionFromWAID = async (waid: string) => {
  const consumer = await MongoService.collection("consumer")
    .find<CONSUMER>({ phone: waid })
    .toArray();
  const consumerIds = consumer.map((item) => item._id);
  const query = consumer
    ? { consumer: { $in: consumerIds } }
    : { caregiver_phone: waid };
  const prescription = await MongoService.collection(
    Collections.PRESCRIPTION
  ).findOne<iPrescription>(query, {
    sort: { $natural: -1 },
  });
  const ticket = await MongoService.collection(
    Collections.TICKET
  ).findOne<iTicket>({
    prescription: prescription?._id,
  });
  return { prescription, ticket };
};
//estimate
export const createEstimate = async (
  estimate: iEstimate,
  session: ClientSession
) => {
  // If _id is not provided, generate a new ObjectId
  if (!estimate._id) {
    estimate._id = new ObjectId();
  }

  await MongoService.collection(Collections.ESTIMATE).insertOne(estimate, {
    session,
  });

  return estimate;
};
export const findEstimateById = async (
  estimateId: ObjectId,
  session?: ClientSession
) => {
  return await MongoService.collection(Collections.ESTIMATE).findOne<iEstimate>(
    { _id: estimateId },
    { session }
  );
};
export const getTicketEstimates = async (ticketId: ObjectId) => {
  return await MongoService.collection(Collections.ESTIMATE)
    .find<iEstimate>({ ticket: ticketId })
    .toArray();
};
export const updateEstimateTotal = async (
  estimateId: ObjectId,
  total: number,
  session?: ClientSession
) => {
  return await MongoService.collection(Collections.ESTIMATE).findOneAndUpdate(
    { _id: estimateId },
    { $set: { total } },
    { session }
  );
};
// notes
export const createNote = async (note: iNote, session: ClientSession) => {
  await MongoService.collection(Collections.Note).insertOne(note, { session });
  return note;
};
export const getTicketNotes = async (ticketId: ObjectId) => {
  return await MongoService.collection(Collections.Note)
    .find<iNote>({ ticket: ticketId })
    .toArray();
};
//follow up messages
// export const followUpData=async ()=>{
//   return await MongoService.collection()
// }
export const updateTicketLocation = async (
  ticketId: ObjectId,
  uploadedPDFUrl: string,
  session?: ClientSession
) => {
  return await MongoService.collection(Collections.TICKET).findOneAndUpdate(
    { _id: ticketId },
    { $set: { location: uploadedPDFUrl } },
    { session }
  );
};
export const createResult = async (result: iSkip, session: ClientSession) => {
  await MongoService.collection(Collections.SKIP).insertOne(result, {
    session,
  });
  return result;
};

export const updateSubStage2 = async (
  ticketId: ObjectId,
  subStageCode: subStageCodeType
) => {
  const result = await MongoService.collection(Collections.TICKET).updateOne(
    { _id: ticketId },
    { $set: { subStageCode } }
  );
  // if not working uncomment thi code

  // if (result.modifiedCount === 1) {
  //   // The update was successful, return the updated document or a success indicator
  //   return { success: true };
  // } else {
  //   // The update failed or didn't modify any documents
  //   return { success: false };
  // }
};


export const UpdateDate = async (
  ticketId: string,
  body: iTicketDate,
  session: ClientSession
) => {
  return await MongoService.collection(Collections.TICKET).updateOne(
    {
      _id: new ObjectId(ticketId),
    },
    { $set: body },
    { session }
  );
};

export const addFilterWon = async (ticketId: string, wonId: string, session?: ClientSession) => {
  try {
    const wonObjectId = new ObjectId(wonId) ;
    const ticketObjectId = new ObjectId(ticketId);
    console.log(ticketObjectId , "cat");
    console.log(wonId , "wonid");
    
    return await MongoService.collection(Collections.TICKET).findOneAndUpdate(
      { _id: ticketObjectId },
      { $set: { result: wonObjectId } },
      { session }
    );
  } catch (error : any) {
    throw new Error(`Error in addFilterWon: ${error.message}`);
  }
};

export const addFilterlass = async (ticketId: string, lossId: string, session?: ClientSession) => {
  try {
    const lossObjectId = new ObjectId(lossId) ;
    const ticketObjectId = new ObjectId(ticketId);

    return await MongoService.collection(Collections.TICKET).findOneAndUpdate(
      { _id: ticketObjectId },
      { $set: { result: lossObjectId } },
      { session }
    );
  } catch (error : any) {
    throw new Error(`Error in addFilterLoss: ${error.message}`);
  }
};

export const updateTicketConsumer = async (
  ticketId: ObjectId,
  updateData: iUpdateTicketData
) => {
  try {
    const ticket = await findTicketById(ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }
    // Update consumer data
    const consumerId = ticket.consumer;
    const consumerUpdate = updateData.consumer;
    if (consumerId) {
      await MongoService.collection(CONSUMER_DB).updateOne(
        { _id: consumerId },
        { $set: consumerUpdate }
      );
    }
    // Update prescription data
    const prescriptionId = ticket.prescription;
    const prescriptionUpdate = updateData.prescription;
    if (prescriptionId) {
      await MongoService.collection(PRESCRIPTION_DB).updateOne(
        { _id: prescriptionId },
        { $set: prescriptionUpdate }
      );
    }
    // Update the ticket in Redis after MongoDB updates
    await RedisUpdateSingleTicketLookUp(ticketId.toString());
    // Return the updated consumer and prescription
    return {
      consumer: consumerId ? await findOneConsumer(consumerId) : null,
      prescription: prescriptionId
        ? await findOnePrescription(prescriptionId)
        : null,
    };
  } catch (error: any) {
    throw new Error(
      `Error updating consumer and prescription: ${error.message}`
    );
  }
};

// function to  update ticket 
// Add a function to update the ticket status
export const updateTicketStatus1 = async (
  prescriptionId: ObjectId,
  status: string,
) => {
  try {
    console.log(prescriptionId , "prescriptionId inside the prep");
    console.log(status ,"status nubfnidkvc");
    const result = await MongoService.collection(TICKET_DB)
      .updateOne(
        { _id: prescriptionId },
        { $set: { status: "todayTask" } },
      );
      console.log(result , "result bnucbsnkmlsc");

    if (result.modifiedCount > 0) {
      return { success: true };
    } else {
      console.error("No document updated in updateTicketStatus");
      return { success: false, error: "No document updated" };
    }
  } catch (error: any) {
    // Handle the error
    console.error("Error updating ticket status:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
};

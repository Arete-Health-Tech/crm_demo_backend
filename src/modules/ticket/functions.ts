import { ChangeStreamDocument, ClientSession, Collection, ObjectId } from "mongodb";
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
  iTicketUpdate,
  subStageCodeType,
} from "../../types/ticket/ticket";
import MongoService, { Collections } from "../../utils/mongo";
import {
  createOneFollowUp,
  createOnePrescription,
  createOneTicket,
  findServices,
  findTicket,
} from "./crud";
import { RedisUpdateSingleTicketLookUp } from "./ticketUtils/utilFunctions";
import { IO } from "../../server";
import { REFETCH_TICKETS } from "../../utils/socket/constants";
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
  event: ChangeStreamDocument<any>,
) => {
  // console.log("tkt event", event);
  const { operationType} = event;
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
  return changeStream.on("change", (event) =>
    triggerTicketChanges(event)
  );
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
  )
}

export const createResult = async (result: iSkip, session: ClientSession) => {
  await MongoService.collection(Collections.SKIP).insertOne(result, {
    session,
  });
  return result;
};
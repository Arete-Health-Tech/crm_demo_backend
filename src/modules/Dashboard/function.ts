import { FUNCTION_RESPONSE } from "../../types/api/api";
import ErrorHandler from "../../utils/errorHandler";
import MongoService, { Collections } from "../../utils/mongo";
import { ObjectId } from "mongodb";
import { updateSubStage3, updateTicket } from "../ticket/functions";
import { findTicketsByStageAndRepresentative, updateStatus } from "./crud";
import { TICKET_DB, findTicketById } from "../ticket/crud";
import idashboard from "../../types/dashboard/dashboard";
import { RedisUpdateSingleTicketLookUp } from "../ticket/ticketUtils/utilFunctions";
export const updateTicketStatusHandler = async (
  ticketId: ObjectId,
  payload: idashboard
): Promise<FUNCTION_RESPONSE> => {
  try {
    const ticket = await findTicketById(ticketId);
    // console.log(ticket,'ticket')
    // console.log(payload ,"payload");
    

    if (!ticket) {
      return { status: 404, body: { error: "Ticket not found" } };
    }
    
    // const currentTime = new Date();
    // const currentMillis = currentTime.getTime();
    // const timeDifference = currentMillis - ticket.date.getTime();
    // const hoursDifference = timeDifference / (1000 * 60 * 60);

    // if (hoursDifference <= 24 && ticket.subStageCode.code < 3) {
    //   ticket.status = "todayTask";
    // } else if (hoursDifference > 24 && ticket.subStageCode.code < 3) {
    //   ticket.status = "pendingTask";
    // }

    // Check if the payload contains a specific property that should prevent RedisUpdateSingleTicketLookUp
    const skipRedisUpdate = ticket;

    if (skipRedisUpdate) {
      // Call RedisUpdateSingleTicketLookUp only if skipRedisUpdate is not present or false
  
      await RedisUpdateSingleTicketLookUp(ticketId.toString());
    }

    // Check for frontend actions in the payload
    if (payload.select) {
      switch (payload.select) {
        case "DND":
          ticket.status = "dnd";
          break;
        case "Call Completed":
          ticket.status = "CallCompleted";
          break;
        case "Rescheduled Call":
          // Remove the ticket from all lists
          ticket.status = " ";
          break;
        // Add more cases as needed
        default:
          break;
      }
    } else {
      // If no frontend action, retain the existing status
      // Use the existing status property instead of trying to retrieve payload.frontendAction
      // Change this line:
      // ticket.status = ticket.status;
      // to:
      ticket.status = ticket.status;
    }
   
    const id :any =ticket._id
    // console.log(id ,"id");
   if(payload.select == "Call Completed"){
     await updateSubStage3(
      id,
      {
        active: true,
        code: 3,
      },
      )
   }

    const search: ObjectId | undefined = ticket._id;

    if (search) {
    
      const result = await updateStatus(search, ticket.status);
     
    } else {
      return { status: 400, body: { error: "Ticket ID is undefined" } };
    }

    return {
      status: 200,
      body: { message: "Ticket status updated successfully" },
    };
  } catch (error) {
    console.error(error);
    return { status: 500, body: { error: "Internal Server Error" } };
  }
};
// Assuming you have a MongoDB function to find tickets by status and assigned representative
export const findTicketsByStatusAndRepresentative = async (
  status: string,
  representativeId?: ObjectId
) => {
  try {
    const filterAssignedArray = representativeId
      ? [new ObjectId(representativeId)]
      : [];
    // console.log(filterAssignedArray, "filterAssignedArray");

    let query: any = {
      status,
      assigned: { $in: filterAssignedArray },
    };

    const tickets = await MongoService.collection(TICKET_DB)
      .find(query)
      .toArray();
      // console.log(tickets, "tickets");
    return tickets;
  } catch (error: any) {
    console.error("Error finding tickets:", error.message);
    throw new Error("Internal server error");
  }
};

export const findTicketsByStatusAndRepresentativeforAdmin = async (
  status: string,
  representativeId?: ObjectId
) => {
  try {
    // const filterAssignedArray = representativeId
    //   ? [new ObjectId(representativeId)]
    //   : [];
    // console.log(filterAssignedArray, "filterAssignedArray");

    let query: any = {
      status,
      // assigned: { $in: filterAssignedArray },
    };

    const tickets = await MongoService.collection(TICKET_DB)
      .find(query)
      .toArray();
      // console.log(tickets, "tickets");
    return tickets;
  } catch (error: any) {
    console.error("Error finding tickets:", error.message);
    throw new Error("Internal server error");
  }
};

 export const findTicketsByWONandLOSS = async (representativeId?: ObjectId) => {
   try {

     const filterAssignedArray = representativeId
       ? [new ObjectId(representativeId)]
       : [];

     const win = new ObjectId("65991601a62baad220000001");
     const lost = new ObjectId("65991601a62baad220000002");

     // Remove the status condition from the query
     let query: any = {
       assigned: { $in: filterAssignedArray },
       result: { $in: [win, lost] },
     };

     const tickets = await MongoService.collection(TICKET_DB)
       .find(query)
       .toArray();
      //  console.log(tickets," this is win an dlo sssss")
     return tickets;
   } catch (error: any) {
     console.error("Error finding tickets:", error.message);
     throw new Error("Internal server error");
   }
 };

 export const findTicketsByWONandLOSSAdmin = async (representativeId?: ObjectId) => {
  try {

    // const filterAssignedArray = representativeId
    //   ? [new ObjectId(representativeId)]
    //   : [];

    const win = new ObjectId("65991601a62baad220000001");
    const lost = new ObjectId("65991601a62baad220000002");

    // Remove the status condition from the query
    let query: any = {
      // assigned: { $in: filterAssignedArray },
      result: { $in: [win, lost] },
    };

    const tickets = await MongoService.collection(TICKET_DB)
      .find(query)
      .toArray();
     //  console.log(tickets," this is win an dlo sssss")
    return tickets;
  } catch (error: any) {
    console.error("Error finding tickets:", error.message);
    throw new Error("Internal server error");
  }
};


 export const getTicketsCountByStage = async (representativeId?: ObjectId) => {
   try {
     const stages = [
       new ObjectId("6494196d698ecd9a9db95e3a"), // newLead
       new ObjectId("649598d9586b137ea9086788"), // Contacted
       new ObjectId("649ace47bda0ea4d79a1ec38"), // Working
       new ObjectId("649acdbbbda0ea4d79a1ec36"), // Orientation
       new ObjectId("649ace20bda0ea4d79a1ec37"), // Nurturing
     ];

     const ticketsCountByStage = await MongoService.collection(TICKET_DB)
       .aggregate([
         {
           $match: {
             assigned: representativeId,
             stage: { $in: stages },
           },
         },
         {
           $group: {
             _id: "$stage",
             count: { $sum: 1 },
           },
         },
         {
           $project: {
             _id: 0,
             stage: "$_id",
             count: 1,
           },
         },
       ])
       .toArray();
// console.log(ticketsCountByStage,'ticketsCountByStage')
     return ticketsCountByStage;
   } catch (error: any) {
     console.error("Error getting tickets count by stage:", error.message);
     throw new Error("Internal server error");
   }
 };

 export const getTicketsCountByStageAdmin = async () => {
  try {
    const stages = [
      new ObjectId("6494196d698ecd9a9db95e3a"), // newLead
      new ObjectId("649598d9586b137ea9086788"), // Contacted
      new ObjectId("649ace47bda0ea4d79a1ec38"), // Working
      new ObjectId("649acdbbbda0ea4d79a1ec36"), // Orientation
      new ObjectId("649ace20bda0ea4d79a1ec37"), // Nurturing
    ];

    const ticketsCountByStage = await MongoService.collection(TICKET_DB)
      .aggregate([
        {
          $match: {
            // assigned: representativeId,
            stage: { $in: stages },
          },
        },
        {
          $group: {
            _id: "$stage",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            stage: "$_id",
            count: 1,
          },
        },
      ])
      .toArray();
// console.log(ticketsCountByStage,'ticketsCountByStage')
    return ticketsCountByStage;
  } catch (error: any) {
    console.error("Error getting tickets count by stage:", error.message);
    throw new Error("Internal server error");
  }
};
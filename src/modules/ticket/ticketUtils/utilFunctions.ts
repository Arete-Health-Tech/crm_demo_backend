import { IO, redisClient } from "../../../server";
import {
  TICKET_CACHE_OBJECT,
  iTicketsResultJSON,
  modificationDateQuery,
} from "./Constants";
import ErrorHandler from "../../../utils/errorHandler";
import { ObjectId, ReadConcern, ReadConcernLevel } from "mongodb";
import MongoService, { Collections, getCreateDate } from "../../../utils/mongo";
import { getMedia } from "../../../services/aws/s3";
import { getServiceById } from "../../service/functions";
import { findOneService } from "../crud";
import { REFETCH_TICKETS } from "../../../utils/socket/constants";
export const applyPagination = (
  listOfData: any[],
  page: number,
  size: number
) => {
  const start = (page - 1) * size;
  const end = page * size;
  return listOfData.slice(start, end);
};
// export const applyPagination = (
//   listOfData: any,
//   page: number,
//   size: number
// ) => {
//   if (listOfData && Array.isArray(listOfData.tickets)) {
//     const start = (page - 1) * size;
//     const end = page * size;
//     return listOfData.tickets.slice(start, end);
//   } else {
//     // Handle the case where listOfData is not in the expected format
//     return [];
//   }
// };
export async function createTicketLookUps(ticketId?: string) {
  const filterTicket = ticketId
    ? {
        _id: new ObjectId(ticketId),
      }
    : {};
  const dateFilter = ticketId ? {} : modificationDateQuery;
  const customReadConcern: ReadConcern = {
    level: "majority",
    toJSON: () => ({ level: "majority" }),
  };
  // console.log("ticket lookup started...", ticketId);
  let tickets: any = await MongoService.collection(Collections.TICKET)
    .aggregate(
      [
        {
          $lookup: {
            from: Collections.CONSUMER,
            localField: "consumer",
            foreignField: "_id",
            let: { consumer: "$consumer" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$consumer"] } } },
              { $limit: 1 },
            ],
            as: "consumer",
          },
        },
        {
          $match: filterTicket,
        },
        {
          $match: dateFilter,
        },
        {
          $lookup: {
            from: Collections.PRESCRIPTION,
            localField: "prescription",
            let: { prescription: "$prescription" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$prescription"] } } },
              { $limit: 1 },
            ],
            foreignField: "_id",
            as: "prescription",
          },
        },
        {
          $lookup: {
            from: Collections.ESTIMATE,
            let: { id: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$$id", "$ticket"] } } },
              { $sort: { _id: -1 } },
              { $limit: 1 },
            ],
            as: "estimate",
          },
        },
        {
          $lookup: {
            from: Collections.REPRESENTATIVE,
            localField: "creator",
            let: { creator: "$creator" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$creator"] } } },
              { $limit: 1 },
              { $project: { firstName: 1, lastName: 1, email: 1, phone: 1 } },
            ],
            foreignField: "_id",
            as: "creator",
          },
        },
        {
          $sort: {
            _id: -1,
          },
        },
      ],
      { readConcern: customReadConcern }
    )
    .toArray();
  // console.log(`ticket id updated for", ${tickets[0]?._id}`);
  for await (const ticket of tickets) {
    ticket.prescription[0].image = getMedia(ticket.prescription[0].image);
    if (ticket.prescription[0].service) {
      const presService = await getServiceById(ticket.prescription[0].service);
      if (presService) {
        ticket.prescription[0].service = presService;
      }
    }
    ticket.createdAt = getCreateDate(ticket._id);
    ticket.prescription[0].createdAt = getCreateDate(
      ticket.prescription[0]._id
    );
    if (ticket.estimate[0]) {
      const service = await findOneService({
        _id: ticket.estimate[0].service[0]?._id,
      });
      ticket.estimate[0].service[0] = {
        ...ticket.estimate[0].service[0],
        ...service,
      };
      ticket.estimate[0].createdAt = getCreateDate(ticket.estimate[0]._id);
    }
  }
  const result: iTicketsResultJSON = {
    tickets: tickets,
    count: tickets.length,
  };
  // console.log("Ticket Lookup ready to store! ::  Totalcount:", result.count);
  return result;
}
export const RedisUpdateSingleTicketLookUp = async (TicketId?: string) => {
  try {
    console.log("Entering RedisUpdateSingleTicketLookUp");

    // console.log("TicketId:", TicketId);
    const result: iTicketsResultJSON = await createTicketLookUps(TicketId);
    const data = await (await redisClient).GET(TICKET_CACHE_OBJECT);
   
    if (!data) {
      return new Error(
        `No Data found in @Redis cache for Key ${TICKET_CACHE_OBJECT}`
      );
    }

    let ticketObjCache = JSON.parse(data);


    
    //SETTING UPDATED TICKET DATA TO REDIS TICKET CACHE BELOW
    const today = new Date(); // Get today's date
    today.setHours(0, 0, 0, 0);
    const ticketDetail = result.tickets[0];
    
    if (TicketId) {
      // FILTER TICKET BY MODIFIED DATE
      const statusModified = ticketObjCache[TicketId]?.status !== ticketDetail.status;
        console.log(statusModified , "statusModified");
        console.log("Status from cache:", ticketObjCache[TicketId]?.status);
        console.log("Status from result:", ticketDetail.status);
      if (ticketDetail.modifiedDate && statusModified !== true ) {
        const modifiedDatePlus_3 =
          ticketDetail.modifiedDate + 3 * 24 * 60 * 60 * 1000;
        const modifiedDatePlus_45 =
          ticketDetail.modifiedDate + 45 * 24 * 60 * 60 * 1000;

        if (
          ticketDetail.subStageCode.code >= 4 &&
          today >= modifiedDatePlus_3 &&
          today < modifiedDatePlus_45 &&
          !statusModified  
        ) {
          ticketObjCache[TicketId] = result.tickets[0];
        } else {
          delete ticketObjCache[TicketId];
          console.log(
            "modified Date invalidated. Ticket is being removed from the current cache"
          );
        }
      } else {
        if (ticketObjCache[TicketId]) {
          ticketObjCache[TicketId] = result.tickets[0];
        } else {
          ticketObjCache = {
            [TicketId]: result.tickets[0],
            ...ticketObjCache,
          };
        }
      }
    } else {
      // to Fetch all data again in case of restore
      let cacheObj: any = {};
      result.tickets.forEach((currentTicket: any) => {
        let ticket_ID: string = currentTicket._id.toString();
        cacheObj[ticket_ID] = currentTicket;
      }); // setting {id: ticketdata} pair

      ticketObjCache = cacheObj;
    }

    const finalTicketCaches = JSON.stringify(ticketObjCache);

    await (await redisClient).SET(TICKET_CACHE_OBJECT, finalTicketCaches);
    return ticketObjCache;
  } catch (err) {
    console.log("error in redis update", err);
    throw new ErrorHandler("Error occurred while updating redis", 500);
  }
};
export const pushToUpdatedTicketTop = async (
  fetchUpdated: "true" | "false",
  ticketId: string,
  ticketObjCache: any
) => {
  if (fetchUpdated === "true") {
    const fetchSingleTicket = await createTicketLookUps(ticketId);
    delete ticketObjCache[ticketId];
    ticketObjCache = {
      [ticketId]: fetchSingleTicket?.tickets[0],
      ...ticketObjCache,
    };
    await (
      await redisClient
    ).SET(TICKET_CACHE_OBJECT, JSON.stringify(ticketObjCache));
  }
  console.log("\npushing ticket top of cache\n");
  IO.emit(REFETCH_TICKETS); //trigger client side ticket re-fetch
  return ticketObjCache;
};
// export const pushToUpdatedTicketTop2 = async (fetchUpdated : "true" | "false",ticketId: string, ticketObjCache: any ) => {
//   if (fetchUpdated === "true") {
//     const fetchSingleTicket = await createTicketLookUps(ticketId);
//     delete ticketObjCache[ticketId];
//     ticketObjCache = {
//       [ticketId]: fetchSingleTicket?.tickets[0],
//       ...ticketObjCache,
//     };
//     await (
//       await redisClient
//     ).SET(TICKET_CACHE_OBJECT, JSON.stringify(ticketObjCache));
//   }
//   console.log("\npushing ticket top of cache\n")
//   IO.emit(REFETCH_TICKETS); //trigger client side ticket re-fetch
//   return ticketObjCache;
// }
// export async function createsortedData(filterAssigned? : ObjectId) {
//   const matchAssigned = {
//     $match: {
//       assigned: filterAssigned, // Convert filterAssigned to ObjectId
//     },
//   };
//   const customReadConcern: ReadConcern = {
//     level: "majority",
//     toJSON: () => ({ level: "majority" }),
//   };
//   // console.log("ticket lookup started...", ticketId);
//   let tickets: any = await MongoService.collection(Collections.TICKET)
//     .aggregate(
//       [
//         {
//           $lookup: {
//             from: Collections.CONSUMER,
//             localField: "consumer",
//             foreignField: "_id",
//             let: { consumer: "$consumer" },
//             pipeline: [
//               { $match: { $expr: { $eq: ["$_id", "$$consumer"] } } },
//               { $limit: 1 },
//             ],
//             as: "consumer",
//           },
//         },
//         matchAssigned,
//         {
//           $lookup: {
//             from: Collections.PRESCRIPTION,
//             localField: "prescription",
//             let: { prescription: "$prescription" },
//             pipeline: [
//               { $match: { $expr: { $eq: ["$_id", "$$prescription"] } } },
//               { $limit: 1 },
//             ],
//             foreignField: "_id",
//             as: "prescription",
//           },
//         },
//         {
//           $lookup: {
//             from: Collections.ESTIMATE,
//             let: { id: "$_id" },
//             pipeline: [
//               { $match: { $expr: { $eq: ["$$id", "$ticket"] } } },
//               { $sort: { _id: -1 } },
//               { $limit: 1 },
//             ],
//             as: "estimate",
//           },
//         },
//         {
//           $lookup: {
//             from: Collections.REPRESENTATIVE,
//             localField: "creator",
//             let: { creator: "$creator" },
//             pipeline: [
//               { $match: { $expr: { $eq: ["$_id", "$$creator"] } } },
//               { $limit: 1 },
//               { $project: { firstName: 1, lastName: 1, email: 1, phone: 1 } },
//             ],
//             foreignField: "_id",
//             as: "creator",
//           },
//         },
//         {
//           $sort: {
//             _id: -1,
//           },
//         },
//       ],
//       { readConcern: customReadConcern }
//     )
//     .toArray();
//   // console.log(`ticket id updated for", ${tickets[0]?._id}`);
//   for await (const ticket of tickets) {
//     ticket.prescription[0].image = getMedia(ticket.prescription[0].image);
//     if (ticket.prescription[0].service) {
//       const presService = await getServiceById(ticket.prescription[0].service);
//       if (presService) {
//         ticket.prescription[0].service = presService;
//       }
//     }
//     ticket.createdAt = getCreateDate(ticket._id);
//     ticket.prescription[0].createdAt = getCreateDate(
//       ticket.prescription[0]._id
//     );
//     if (ticket.estimate[0]) {
//       const service = await findOneService({
//         _id: ticket.estimate[0].service[0]?._id,
//       });
//       ticket.estimate[0].service[0] = {
//         ...ticket.estimate[0].service[0],
//         ...service,
//       };
//       ticket.estimate[0].createdAt = getCreateDate(ticket.estimate[0]._id);
//     }
//   }
//   const result: iTicketsResultJSON = {
//     tickets: tickets,
//     count: tickets.length,
//   };
//   // console.log("Ticket Lookup ready to store! ::  Totalcount:", result.count);
//   return result;
// }

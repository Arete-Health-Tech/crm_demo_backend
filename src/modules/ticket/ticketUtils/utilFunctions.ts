import { redisClient } from "../../../server";
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

export const applyPagination = (
  listOfData: any[],
  page: number,
  size: number
) => {
  const start = (page - 1) * size;
  const end = page * size;
  return listOfData.slice(start, end);
};
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
  console.log("ticket lookup started...", ticketId);

  let tickets: any = await MongoService.collection(Collections.TICKET)
    .aggregate(
      [
        {
          $match: filterTicket,
        },
        {
          $match: dateFilter,
        },
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

  console.log(`ticket id updated for", ${tickets[0]?._id}`);

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
  console.log("Ticket Lookup ready to store! ::  Totalcount:", result.count);
  return result;
}

export const RedisUpdateSingleTicketLookUp = async (TicketId?: string) => {
  try {
    const result: iTicketsResultJSON = await createTicketLookUps(TicketId);
    const data = await (await redisClient).GET(TICKET_CACHE_OBJECT);

    if (!data) {
      return new Error(
        `No Data found in @Redis cache for Key ${TICKET_CACHE_OBJECT}`
      );
    }

    console.log("result of single ticket \n => ", result.tickets[0]);
    let ticketObjCache = JSON.parse(data);

    //SETTING UPDATED TICKET DATA TO REDIS TICKET CACHE BELOW
    const today = new Date(); // Get today's date
    today.setHours(0, 0, 0, 0);
    const ticketDetail = result.tickets[0];
    if (TicketId) {
      //FILTER TICKET BY MODIFIED DATE
      if (ticketDetail.modifiedDate) {
    
        const modifiedDatePlus_3 =
          ticketDetail.modifiedDate + 3 * 24 * 60 * 60 * 1000;
        const modifiedDatePlus_45 =
          ticketDetail.modifiedDate + 45 * 24 * 60 * 60 * 1000;

        if (ticketDetail.subStageCode.code>=4 && today >= modifiedDatePlus_3 && today < modifiedDatePlus_45) {
          ticketObjCache[TicketId] = result.tickets[0];
        } else {
          delete ticketObjCache[TicketId];
          console.log("Ticjket is deleted");
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
      //to Fetch all data again to in case restore
      let cacheObj: any = {};
      result.tickets.forEach((currentTicket: any) => {
        let ticket_ID: string = currentTicket._id.toString();
        cacheObj[ticket_ID] = currentTicket;
      }); // setting {id: ticketdata} pair

      ticketObjCache = cacheObj;
    }

    console.log("Cache Update done At", new Date());

    const finalTicketCaches = JSON.stringify(ticketObjCache);

    await (await redisClient).SET(TICKET_CACHE_OBJECT, finalTicketCaches);
    return ticketObjCache;
  } catch (err) {
    console.log("error in redis update", err);
    throw new ErrorHandler("Error occure while updating redis", 500);
  }
};


export const pushTopUpdatedTicket = async (fetchUpdated : "true" | "false",ticketId: string, ticketObjCache: any) => {

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

  return ticketObjCache;
}

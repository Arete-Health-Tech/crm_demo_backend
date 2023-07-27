import { redisClient } from "../../../server";
import { TICKET_CACHE_OBJECT, iTicketsResultJSON } from "./Constants";
import { createTicketLookUps } from "../controllers";

export const applyPagination = (
  listOfData: any[],
  page: number,
  size: number
) => {
  const start = (page - 1) * size;
  const end = page * size;
  return listOfData.slice(start, end);
};

export const RedisUpdateSingleTicketLookUp = async (TicketId: string) => {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      (async () => {
        const result: iTicketsResultJSON = await createTicketLookUps(TicketId);
        const data = await (await redisClient).GET(TICKET_CACHE_OBJECT);

        if (!data) {
          return reject(
            new Error(
              `No Data found in @Redis cache for Key ${TICKET_CACHE_OBJECT}`
            )
          );
        }
        console.log(
          "result of single ticket \n => ",
          result.tickets,
          "res:\n",
          result
        );
        const ticketObjCache = JSON.parse(data);

        //SETTING UPDATED TICKET DATA TO REDIS TICKET CACHE BELOW
        ticketObjCache[TicketId] = result.tickets[0];

        const finalTicketCaches = JSON.stringify(ticketObjCache);

        await (await redisClient).SET(TICKET_CACHE_OBJECT, finalTicketCaches);
        return resolve(result.tickets);
      })();
    }, 15000)
  );
};

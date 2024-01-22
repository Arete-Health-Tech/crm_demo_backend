import { Console } from "console";
import { RedisUpdateSingleTicketLookUp } from "../../modules/ticket/ticketUtils/utilFunctions";
import MongoService, { Collections } from "../mongo";
import { TICKET_DB } from "../../modules/ticket/crud";
import { updateTicketStatusPending } from "../../modules/Dashboard/crud";
const fs = require("fs");

export const updateTicketLookUpCache = async () => {
  let log = "";

  try {
    const data = await RedisUpdateSingleTicketLookUp();
    const count = Object.keys(data).length;
    log = `\nticket lookup updated at ${new Date().toISOString()} TotalCount:${count}`;
    await fs.promises.appendFile(
      __dirname + "/../../../../cron-logs/logs.log",
      log
    );
    console.log(`Total Cache Of count ${count} updated successfully by`, new Date().toDateString());
  } catch (err) {
    console.log("Error Occurred", err);
    log = `\n ticket lookup failed to cache at ${new Date().toISOString()} \n ${JSON.stringify(
      err
    )} \n`;
    await fs.promises.appendFile(
      __dirname + "/../../../../cron-logs/logs.log",
      log
    );
  }
};

export const updatePendingTicket = async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    console.log(yesterday ,"yesterdayyesterdayyesterday")

    // Find tickets with status "todayTask" and subStageCode.code < 3
    const ticketsToUpdate = await MongoService.collection(TICKET_DB).find({
      $or: [
        { status: 'todayTask' },
        { status: null },
      ],
      'subStageCode.code': { $lt: 3 },
      date: { $lt: yesterday },
    }).toArray();

    console.log('Matching Tickets:', ticketsToUpdate);

    // Update each ticket
    for (const ticket of ticketsToUpdate) {
      await updateTicketStatusPending(ticket._id, 'pendingTask');
    }

    console.log('Pending ticket update completed.');
  } catch (error) {
    console.error('Error updating pending tickets:', error);
  }
};



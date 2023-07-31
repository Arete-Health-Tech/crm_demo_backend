import { Console } from "console";
import { RedisUpdateSingleTicketLookUp } from "../../modules/ticket/ticketUtils/utilFunctions";
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

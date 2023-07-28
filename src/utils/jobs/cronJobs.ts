import { RedisUpdateSingleTicketLookUp } from "../../modules/ticket/ticketUtils/utilFunctions";
const fs = require("fs");

export const updateTicketLookUpCache = async () => {
  let log = "";

  try {
    await RedisUpdateSingleTicketLookUp();
    log = `ticket lookup updated at ${new Date().toISOString()}`;
    await fs.promises.appendFile("../../../cron-Logs/log.txt",log);
    console.log("Cache Updated successfully", new Date().toDateString());
  } catch (err) {
    console.log("Error Occurred", err);
    log = `ticket lookup failed to cache at ${new Date().toISOString()} \n ${JSON.stringify(err)}`;
    await fs.promises.appendFile("../../../cron-Logs/log.txt",log);
  }
};

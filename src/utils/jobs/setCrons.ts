import { updateTicketLookUpCache } from "./cronJobs";

const cron = require("node-cron");
const cronExpression = "10 * * * *"; //cron set At 12:10AM
// "0 0 * * *";

const settingCrons = () => {
  cron.schedule(cronExpression, updateTicketLookUpCache);
};

export default settingCrons;

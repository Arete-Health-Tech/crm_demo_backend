import { updateTicketLookUpCache } from "./cronJobs";

const cron = require("node-cron");
const cronExpression = "0 0 * * *";
// "0 0 * * *";

const settingCrons = () => {
  cron.schedule(cronExpression, updateTicketLookUpCache);
};

export default settingCrons;

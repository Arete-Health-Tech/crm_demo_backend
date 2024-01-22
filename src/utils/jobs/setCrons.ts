import { updatePendingTicket, updateTicketLookUpCache } from "./cronJobs";

const cron = require("node-cron");
const cronExpression = "10 0 * * *"; //cron set At 12:10AM
const cronPending = "30 * * * *";


const settingCrons = () => {
  cron.schedule(cronExpression, updateTicketLookUpCache);
};

const settingCronPending = () => {
  cron.schedule(cronPending , updatePendingTicket)
}
export { settingCrons, settingCronPending };

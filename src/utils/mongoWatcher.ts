import { watchTicketChangesEvent } from "../modules/ticket/functions";

async function MONGODB_WATCH_COLLECTIONS() {
  //WRITE ALL WATCHER FOR COLLECTION INSIDE IIFE FUNCTION
  return await  watchTicketChangesEvent();
}

export default MONGODB_WATCH_COLLECTIONS;

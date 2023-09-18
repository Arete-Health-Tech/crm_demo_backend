import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const serviceAccount = require("../../../areteSA.json");

export const fsCollections = {
  TICKET: "ticket",
  MESSAGES: "messages",

};

initializeApp({
  credential: cert(serviceAccount),
});

const database = getFirestore();
export default database;

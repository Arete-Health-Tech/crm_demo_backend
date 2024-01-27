import { WithId } from "mongodb";
import { CONSUMER } from "../../types/consumer/consumer";
import MongoService from "../../utils/mongo";
import getDatabase from "../../utils/mongo";

export const CONSUMER_DB = "consumer";

export const createConsumerIndex = async () => {
  await MongoService.collection(CONSUMER_DB).createIndex({
    firstName: "text",
    lastName: "text",
    email: "text",
    phone: "text",
    uid: "text",
    dob: "text",
  });
};

export const createConsumer = async (consumer: CONSUMER): Promise<CONSUMER> => {
  await MongoService.collection(CONSUMER_DB).insertOne(consumer);
  return consumer;
};

export const findOneConsumer = async (
  query: Object
): Promise<WithId<CONSUMER> | null> => {
  return await MongoService.collection(CONSUMER_DB).findOne<CONSUMER>(query);
};

export const findConsumer = async (query: string): Promise<CONSUMER[]> => {
  console.log(query," this is query in crud")
  if (typeof query !== "string" || query.trim() === "") {
    console.log(
      "Invalid search string provided, returning no consumer message"
    );
    return [];
  }

const fieldsToSearch = ["firstName", "uid" /* add more fields as needed */];
console.log(fieldsToSearch, " fieldsToSearch");

  const query1 = {
    $or: [
      { firstName: query },
      { uid: query },
      // Add more fields as needed
    ],
  };
  const consumers = await MongoService.collection(CONSUMER_DB)
    .find<CONSUMER>(query1)
    .toArray();
    console.log(consumers," consumers");
  return consumers as CONSUMER[];
};
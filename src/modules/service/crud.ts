import { CONSUMER } from "../../types/consumer/consumer";
import { iService } from "../../types/service/service";
import getDatabase from "../../utils/mongo";

export const SERVICE_DB = "service";

const createSearchIndex = async () => {
  const database = await getDatabase();
  await database
    .collection(SERVICE_DB)
    .createIndex({ serviceId: "text", name: "text", department: "text", departmentType: "text" });
};

// createSearchIndex();

const createUniqueServiceIndex = async () => {
  const database = await getDatabase();
  await database.collection(SERVICE_DB).createIndex({ serviceId: 1 }, { unique: true });
};

// createUniqueServiceIndex();

export const createManyServices = async (services: iService[]): Promise<any> => {
  const database = await getDatabase();
  await database.collection(SERVICE_DB).insertMany(services);
  return services;
};

export const findOneService = async (query: Object): Promise<CONSUMER> => {
  const database = await getDatabase();
  const consumer = await database.collection(SERVICE_DB).findOne(query);
  return consumer as CONSUMER;
};

export const findServices = async (query: Object): Promise<iService[]> => {
  const database = await getDatabase();
  const services = await database.collection<iService>(SERVICE_DB).find(query).toArray();
  return services;
};

import { iService, iServicePackage } from "../../types/service/service";
import MongoService from "../../utils/mongo";

export const SERVICE_DB = "service";
export const SERVICE_DB_PACK = "servicepck";

export const createSearchIndex = async () => {
  await MongoService.collection(SERVICE_DB).createIndex({
    serviceId: "text",
    name: "text",
    department: "text",
    departmentType: "text",
  });
};

export const createUniqueServiceIndex = async () => {
  await MongoService.collection(SERVICE_DB).createIndex({ serviceId: 1 }, { unique: true });
};

export const createManyServices = async (services: iService[]) => {
  await MongoService.collection(SERVICE_DB).insertMany(services);
  return services;
};

export const findOneService = async (query: Object) => {
  return await MongoService.collection(SERVICE_DB).findOne<iService>(query);
};

// export const findServices = async (query: Object) => {
//   return await MongoService.collection(SERVICE_DB).find<iService>(query).toArray();
// };

export const findServices = async (query: Object) => {
  return await MongoService.collection(SERVICE_DB)
    .find<iService>(query)
    .toArray();
};

export const findServicesPack = async () => {
  return await MongoService.collection(SERVICE_DB_PACK)
    .find()
    .toArray();
};

export const findServicesAll = async () => {
  return await MongoService.collection(SERVICE_DB).find().toArray();
};
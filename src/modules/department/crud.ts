import iDepartment, { iDoctor, iTag } from "../../types/department/department";
import MongoService from "../../utils/mongo";
export const DEPARTMENT_DB = "department";
export const DOCTOR_DB = "doctor";
export const DEPARTMENT_TAG_DB = "department_tag";

export const createDepartment = async (department: iDepartment) => {
  await MongoService.collection(DEPARTMENT_DB).insertOne(department);
  return department;
};

export const findOneDepartment = async (
  query: object
): Promise<iDepartment | null> => {
  return await MongoService.collection(DEPARTMENT_DB).findOne<iDepartment>(
    query
  );
};

export const findDepartment = async (query: object) => {
  return await MongoService.collection(DEPARTMENT_DB)
    .find<iDepartment>(query)
    .toArray();
};

// doctor crud
export const insertOneDoctor = async (doctor: iDoctor) => {
  await MongoService.collection(DOCTOR_DB).insertOne(doctor);
  return doctor;
};

export const findOneDoctor = async (query: object) => {
  return await MongoService.collection(DOCTOR_DB).findOne<iDoctor>(query);
};

export const findDoctor = async (query: object): Promise<iDoctor[]> => {
  return await MongoService.collection(DOCTOR_DB)
    .find<iDoctor>(query)
    .toArray();
};

// tags crud

export const insertOneDeptTag = async (tag: iTag): Promise<iTag> => {
  await MongoService.collection(DEPARTMENT_TAG_DB).insertOne(tag);
  return tag;
};

export const findDeptTag = async (query: any) => {
  return await MongoService.collection(DEPARTMENT_TAG_DB)
    .find<iTag>(query)
    .toArray();
};

import { query } from "express";
import { ClientSession, ObjectId, WithId } from "mongodb";
import { FUNCTION_RESPONSE } from "../../types/api/api";
import iDepartment, { iDoctor, iWard } from "../../types/department/department";
import ErrorHandler from "../../utils/errorHandler";
import MongoService, { Collections } from "../../utils/mongo";
import {
  findOneDepartment,
  createDepartment,
  findDepartment,
  insertOneDoctor,
  findDoctor,
  findOneDoctor,
  insertOneDeptTag,
  findDeptTag,
} from "./crud";

const checkParentExists = async (parent: ObjectId) => {
  const department = await findOneDepartment({ _id: parent });
  if (!department) throw new ErrorHandler("Invalid Parent", 400);
};

export const createDepartmentHandler = async (
  department: iDepartment
): Promise<FUNCTION_RESPONSE> => {
  if (department.parent) {
    department.parent = new ObjectId(department.parent);
    await checkParentExists(department.parent);
  }
  if (!department.parent) {
    department.parent = null;
  }

  await createDepartment(department);
  return { status: 200, body: department };
};

export const getAllDepartments = async (parent?: boolean) => {
  const query = parent ? { parent: null } : {};
  const departments = await findDepartment(query);
  return { status: 200, body: departments };
};

export const getDepartmentById = async (
  id: ObjectId
): Promise<iDepartment | null> => {
  return await findOneDepartment({ _id: id });
};

// doctors

export const doctorDepartmentValidation = async (departments: string[]) => {
  const { body } = await getAllDepartments(); // system departments
  const check = departments.every((item) =>
    body.some((dept) => dept._id?.toString() === item)
  );
  if (!check) throw new ErrorHandler("Invalid department", 400);
};

export const createDoctorHandler = async (
  name: string,
  departments: string[]
) => {
  await doctorDepartmentValidation(departments);
  const doctor = await insertOneDoctor({
    name,
    departments,
    phone: "",
  });
  return { status: 200, body: doctor };
};

export const getDoctorsHandler = async (
  department: string | undefined,
  subDepartment: string | undefined
) => {
  const departments = [];
  if (department) departments.push(department);
  if (subDepartment) departments.push(subDepartment);
  const query =
    departments.length !== 0 ? { departments: { $in: departments } } : {};
  const doctors = await findDoctor(query);
  return { status: 200, body: doctors };
};

export const findDoctorById = async (name: String) => {
  return await findOneDoctor({ _id: name });
};

// tags

export const createDepartmentTagHandler = async (name: string) => {
  return await insertOneDeptTag({ name });
};

export const findAllDepartmentTagsHandler = async () => {
  return await findDeptTag({});
};

// ward
export const createWard = async (ward: iWard, session: ClientSession) => {
  await MongoService.collection(Collections.WARD).insertOne(ward, { session });
  return ward;
};

export const getAllWards = async () => {
  return await MongoService.collection(Collections.WARD)
    .find<iWard>({})
    .toArray();
};

export const getWardById = async (id: ObjectId) => {
  return await MongoService.collection(Collections.WARD).findOne<iWard>({
    _id: id,
  });
};

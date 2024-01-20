import { Collection, ObjectId } from "mongodb";
import { FUNCTION_RESPONSE } from "../../types/api/api";
import { iService } from "../../types/service/service";
import ErrorHandler from "../../utils/errorHandler";
import MongoService, { Collections } from "../../utils/mongo";
import { findDeptTag } from "../department/crud";
import { getAllDepartments } from "../department/functions";
import { createManyServices, findServices, findServicesAll, findServicesPack } from "./crud";

export const departmentValidations = async (services: iService[]) => {
  const { body } = await getAllDepartments();
  console.log(body,"tis dfdflkdfdfdfd")
  const check = services.every(
    (item) =>
      body.some((dept) => dept._id?.toString() === item.department.toString() && dept.parent === null) &&
      body.some(
        (dept) =>
          dept._id?.toString() === item.departmentType.toString() &&
          dept.parent?.toString() === item.department.toString()
      )
  );
  if (!check) throw new ErrorHandler("Invalid department or department type passed", 400);
};

const tagValidation = async (services: iService[]) => {
  const tags = await findDeptTag({});
  const check = services.every(
    (item) => tags.findIndex((tag) => tag._id!.toString() === item.tag.toString()) !== -1
  );
  if (!check) throw new ErrorHandler("Invalid Tag Passed", 400);
};

export const createServiceHandler = async (services: any[]): Promise<FUNCTION_RESPONSE> => {
  await departmentValidations(services);
  await tagValidation(services);
  services = services.map((item) => ({
    name: item.name,
    serviceId: item.serviceId,
    department: item.department,
    departmentType: item.departmentType,
    tag: item.tag,
    charges: [
      {
        opd: item.opd_one,
        ipd: item.ipd_one,
        four: item.four_one,
        twin: item.twin_one,
        single: item.single_one,
        deluxe: item.deluxe_one,
        vip: item.vip_one,
      },
      // {
      //   opd: item.opd_two,
      //   ipd: item.ipd_two,
      //   four: item.four_two,
      //   twin: item.twin_two,
      //   single: item.single_two,
      //   deluxe: item.deluxe_two,
      //   vip: item.vip_two,
      // },
    ],
  }));
  const createdServices = await createManyServices(services);
  return { status: 200, body: createdServices };
};

export const searchService = async (searchQuery: string, tag: string): Promise<FUNCTION_RESPONSE> => {
  // const query: any = {
  //   $text: { $search: `/${searchQuery}/i`, $caseSensitive: false, $diacriticSensitive: false },
  // };
  const query: any = { name: { $regex: searchQuery, $options: "i" } };
  tag && (query.tag = new ObjectId(tag));
  const services = await findServices(query);
  return { status: 200, body: services };
};





export const searchServicePck = async (
): Promise<FUNCTION_RESPONSE> => {
  const services = await findServicesPack();
  return { status: 200, body: services };
};


export const searchServiceAll = async (): Promise<FUNCTION_RESPONSE> => {
  const services = await findServicesAll();
  return { status: 200, body: services };
};


export const getServiceById = async (id: ObjectId) => {
  return await MongoService.collection(Collections.SERVICE).findOne<iService>({ _id: id });
};

export const getTotalServiceCount = async () => {
  return await MongoService.collection(Collections.SERVICE).countDocuments();
};

export const getServices = async (page: number, pageLength: number) => {
  return await MongoService.collection(Collections.SERVICE)
    .find<iService>({})
    .limit(pageLength > 50 ? 50 : pageLength)
    .skip(page * pageLength)
    .toArray();
};

import { ObjectId } from "mongodb";

export interface iService {
  name: string;
  serviceId: string;
  department: ObjectId;
  departmentType: ObjectId;
  tag: ObjectId;
  charges: {
    opd: number;
    ipd: number;
    four: number;
    twin: number;
    single: number;
    deluxe: number;
    vip: number;
  }[];
}

export interface iServicePackage {
  name: string;
  serviceId: string;
  department: ObjectId;
  departmentType: ObjectId;
  tag: ObjectId;
  charges: {
    genward: number;
    semi: number;
    pvt: number;
    suite: number;
    opd: number;
    icu: number;
    delux: number;
  }[];
}

import { ObjectId } from "mongodb";
export default interface iDepartment {
  name: string;
  tags: ObjectId[];
  parent: ObjectId | null;
  _id?: ObjectId;
}
export interface iDoctor {
  name: string;
  departments: string[];
  _id?: ObjectId;
  phone: string;
}
export interface iTag {
  name: string;
  _id?: ObjectId;
}
export interface iWard {
  charges: any;
  _id?: ObjectId;
  name: string;
  type: number; // 1 ward bed 2 icu bed
  code: string;
  roomRent: number;
  consultation: number;
  emergencyConsultation: number;
}
export interface iQuery {
  _id: ObjectId;
  title: string;
  note: string;
  departmentId: ObjectId;
  doctorId: ObjectId;
}

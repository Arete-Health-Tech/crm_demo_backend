import { ObjectId } from "mongodb";

export default interface iDepartment {
  name: string;
  tags: string[];
  parent: string | null;
  _id?: ObjectId;
}

export interface iDoctor {
  name: string;
  departments: string[];
  _id?: ObjectId;
}

export interface iTag {
  name: string;
  _id?: ObjectId;
}

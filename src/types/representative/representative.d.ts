import { ObjectId } from "mongodb";
export interface REPRESENTATIVE {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  department: ObjectId | null; // Change this to allow null
  group: ObjectId | null;
  email: string;
  phone: string;
  uid: string;
  role: REPRESENTATIVE_ROLES;
  image: string;
  password?: string;
  leadAssignedCount: number;
  //  add the group in the schema
}
export interface GROUP {
  _id: ObjectId;
  name: string;
  Members: ObjectId[];
}

export type REPRESENTATIVE_ROLES =
  | "SUPPORT"
  | "REPRESENTATIVE"
  | "LEADER"
  | "TEAMLEADER"
  | "MANAGER"
  | "EXECUTIVE"
  | "ADMIN"
  | "REPRESENTATIVEONE"
  | "REPRESENTATIVETWO"
  | "REPRESENTATIVETHREE"
  | "REPRESENTATIVEFOUR"
  | "REPRESENTATIVEFIVE";

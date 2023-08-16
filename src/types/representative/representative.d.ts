import { ObjectId } from "mongodb";

export interface REPRESENTATIVE {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  uid: string;
  role: REPRESENTATIVE_ROLES;
  image: string;
  password?: string;
  leadAssignedCount: number;
}

export type REPRESENTATIVE_ROLES =
  | "SUPPORT"
  | "REPRESENTATIVE"
  | "LEADER"
  | "MANAGER"
  | "EXECUTIVE"
  | "ADMIN"
  | "REPRESENTATIVEONE"
  | "REPRESENTATIVETWO"
  | "REPRESENTATIVETHREE"
  | "REPRESENTATIVEFOUR"
  | "REPRESENTATIVEFIVE";

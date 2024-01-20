import { FirstName, PhoneNumber } from "aws-sdk/clients/finspacedata";
import { ObjectId } from "mongodb";

export interface iReminder {
  _id?: ObjectId;
  date: Date;
  title: string;
  description: string;
  creator: ObjectId;
  ticket: ObjectId;
}

export interface iRescheduler {
  _id?: ObjectId;
  date: Date;
  title: string;
  description: string;
  creator: ObjectId;
  ticket: ObjectId;
}

export interface iTodo {
  _id?: ObjectId;
  date: Date;
  title: string;
  description: string;
  creator: ObjectId;
  ticket: ObjectId;
  status: boolean;
}

export interface iFollowup {
  _id?: ObjectId;
  date: Date;
  title: string;
  name: string;
  doctor: string;
  phone: number;
}

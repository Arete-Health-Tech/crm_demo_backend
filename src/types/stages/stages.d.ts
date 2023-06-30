import { ObjectId } from "mongodb";

export interface iStage {
  name: string;
  description: string;
  parent: string | null;
  code: number;
  _id?: ObjectId;
  child?: number[];
}

export interface iSubStage {
  name: string;
  description: string;
  parent?: string | null;
  code: number;
  _id?: ObjectId;
}

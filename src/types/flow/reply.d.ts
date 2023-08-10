import { ObjectId } from "mongodb";

export interface iReplyNode {
  _id?: ObjectId;
  nodeId: string;
  nodeName: string;
  headerType?: "image" | "document" | "video";
  headerLink?: string;
  body: string;
  footer?: string;
  type: "reply";
  replyButton1: string;
  replyButtonId1: string;
  replyButton2?: string;
  replyButtonId2?: string;
  replyButton3?: string;
  replyButtonId3?: string;
}

export interface iListNode {
  _id?: ObjectId;
  disease: ObjectId;
  nodeId: string;
  nodeName: string;
  headerType?: "image" | "document" | "video";
  headerLink: string;
  body: string;
  footer?: string;
  menuTitle: string;
  sectionTitle: string;
  type: "list";
  // lists
  listId0: string;
  listTitle0: string;
  listDesc0?: string;
  listId1?: string;
  listTitle1?: string;
  listDesc1?: string;
  listId2?: string;
  listTitle2: string;
  listDesc2?: string;
  listId3?: string;
  listTitle3?: string;
  listDesc3?: string;
  listId4?: string;
  listTitle4?: string;
  listDesc4?: string;
  listId5?: string;
  listTitle5?: string;
  listDesc5?: string;
  listId6?: string;
  listTitle6?: string;
  listDesc6?: string;
  listId7?: string;
  listTitle7?: string;
  listDesc7?: string;
  listId8?: string;
  listTitle8?: string;
  listDesc8?: string;
  listId9?: string;
  listTitle9?: string;
  listDesc9?: string;
}

export interface iFlowConnect {
 
  serviceId: ObjectId;
  templateName: string;
  templateLanguage: string;
  templateIdentifier: string;
  nodeIdentifier: string;
  nodeId: ObjectId;
}

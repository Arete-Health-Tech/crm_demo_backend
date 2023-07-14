import { ClientSession, Collection, ObjectId } from "mongodb";
import firestore, { fsCollections } from "../../services/firebase/firebase";
import {
  findConsumerFromWAID,
  saveFlowMessages,
} from "../../services/whatsapp/webhook";
import {
  followUpMessage,
  sendMessage,
  sendTemplateMessage,
} from "../../services/whatsapp/whatsapp";
import { iFlowConnect, iListNode, iReplyNode } from "../../types/flow/reply";
import ErrorHandler from "../../utils/errorHandler";
import MongoService, { Collections } from "../../utils/mongo";
import {
  createListPayload,
  createReplyPayload,
  createTextPayload,
} from "./utils";

export const createReplyNode = async (
  nodes: iReplyNode[],
  session: ClientSession
) => {
  return await MongoService.collection(Collections.FLOW).insertMany(nodes, {
    session,
  });
};

export const createListNode = async (
  nodes: iListNode[],
  session: ClientSession
) => {
  return await MongoService.collection(Collections.FLOW).insertMany(nodes, {
    session,
  });
};
const findNodeWithId = async (nodeId: string) => {
  return await MongoService.collection(Collections.FLOW).findOne<
    iReplyNode | iListNode
  >({ nodeId });
};

const findNodeById = async (nodeId: ObjectId) => {
  return await MongoService.collection(Collections.FLOW).findOne<
    iReplyNode | iListNode
  >({ _id: nodeId });
};

export const findAndSendNode = async (
  nodeIdentifier: string,
  receiver: string,
  ticket: string
) => {
  let node = await findNodeWithId(nodeIdentifier);
  console.log(node);
  if (node === null) {
    node = await findNodeWithId("DF");
  }
  if (node === null) throw new Error("Node not found");
  if (node.type === "reply") {
    const replyPayload = createReplyPayload(node);
    await sendMessage(receiver, replyPayload);
  } else if (node.type === "list") {
    const listPayload = createListPayload(node);
    await sendMessage(receiver, listPayload);
  }
  delete node._id;
  // await saveFlowMessages(ticket, node._id!);
  await saveSentFlowMessage(ticket, node);
};

export const saveSentFlowMessage = async (ticket: string, node: any) => {
  return await firestore
    .collection(fsCollections.TICKET)
    .doc(ticket)
    .collection(fsCollections.MESSAGES)
    .doc()
    .set({ ...node, createdAt: Date.now(), type: "sent" });
};

export const startTemplateFlow = async (
  templateName: string,
  templateLanguage: string,
  receiver: string,
  components: any
) => {
  return await sendTemplateMessage(
    receiver,
    templateName,
    templateLanguage,
    components
  );
};

// connect flow

export const connectFlow = async (
  connector: iFlowConnect,
  session: ClientSession
) => {
  await MongoService.collection(Collections.FLOW_CONNECT).insertOne(connector, {
    session,
  });
  return connector;
};

export const findFlowConnectorByService = async (serviceId: ObjectId) => {
  return await MongoService.collection(
    Collections.FLOW_CONNECT
  ).findOne<iFlowConnect>({ serviceId });
};

export const findFlowConnectorByTemplateIdentifier = async (
  templateIdentifier: string
) => {
  return await MongoService.collection(
    Collections.FLOW_CONNECT
  ).findOne<iFlowConnect>({
    templateIdentifier,
  });
};

export const sendTextMessage = async (
  message: string,
  receiver: string,
  sender: string
) => {
  const textPayload = createTextPayload(message, sender);
  await sendMessage(receiver, textPayload);
};

export const createNodeIndexes = async () => {
  await MongoService.collection(Collections.FLOW).createIndex({
    nodeId: "text",
    diseaseId: "text",
    templateName: "text",
  });
};

export const findNodeByDiseaseId = async (flowQuery: string) => {
  return await MongoService.collection(Collections.FLOW)   
    .find({ $text: { $search: flowQuery } })
    .toArray();
};

// connector

export const getConnector = async (pageLength: number, page: number) => {
  return await MongoService.collection(Collections.FLOW_CONNECT)
    .find<iFlowConnect>({})
    .limit(pageLength)
    .skip(pageLength * page)
    .toArray();
};

//follow Up

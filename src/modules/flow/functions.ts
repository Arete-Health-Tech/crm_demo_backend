import { ClientSession, Collection, ObjectId } from "mongodb";
import firestore, { fsCollections } from "../../services/firebase/firebase";
import {
  findConsumerFromWAID,
  saveFlowMessages,
} from "../../services/whatsapp/webhook";
import {
  followUpMessage,
  sendImageMessage,
  sendMessage,
  sendTemplateMessage,
} from "../../services/whatsapp/whatsapp";
import { iFlowConnect, iListNode, iReplyNode } from "../../types/flow/reply";
import ErrorHandler from "../../utils/errorHandler";
import MongoService, { Collections } from "../../utils/mongo";
import {
  createImagePayload,
  createListPayload,
  createListPayload2,
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
type ImagePayload = {
  url: string;
  caption: string;
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
  console.log(nodeId, "node id for web hook")
  return await MongoService.collection(Collections.FLOW).findOne<
    iReplyNode | iListNode
  >({ nodeId });

};


const findNodeById = async (nodeId: string, nodeName?: string | null) => {
  const payload = nodeName ? { nodeId, nodeName } : { nodeId };
  return await MongoService.collection(Collections.STAGEFLOW).findOne<
    iReplyNode | iListNode
 
  >(payload);
};

// export const findAndSendNode = async (
//   nodeIdentifier: string,
//   receiver: string,
//   ticket: string
// ) => {
//   let node = await findNodeWithId(nodeIdentifier);
//   console.log(node,"this is node identifier");
  
//   if (node === null) throw new Error("Node not found");
//   if (node.type === "reply") {
//     const replyPayload = createReplyPayload(node);
//     await sendMessage(receiver, replyPayload);
//   } else if (node.type === "list") {
//     const listPayload = createListPayload(node);
//     console.log(listPayload);
//     await sendMessage(receiver, listPayload);
//   }
//   delete node._id;
//   // await saveFlowMessages(ticket, node._id!);
//   await saveSentFlowMessage(ticket, node);
// };

// stage change webhool

export const findAndSendNode = async (
  nodeIdentifier: string,
  receiver: string,
  ticket: string
) => {
  // 6494196d698ecd9a9db95e3a
  let node = await findNodeWithId(nodeIdentifier);
  // new node id ;
  if (node === null) throw new Error("Node not found");
  if (node.type === "reply") {
    const replyPayload = createReplyPayload(node);
    await sendMessage(receiver, replyPayload);
  } else if (node.type === "list") {
    let node2: any = await findNodeWithId(node?.listId0);
    const listId1Value = node2.listId1;
    let node3: any = await findNodeWithId(listId1Value);
    // console.log(node3 , " this noe 3 in the wnicknsidjosm")
    const listPayload = createListPayload(node);
    // console.log(listPayload , " listpayload kncjbdsudhsikdnsjhdvyusdnas");
    const listPayload2 = createListPayload2(node3);
    console.log(listPayload2, "listPayload2 is the ans here is nisxosmxd");

    await sendMessage(receiver, listPayload2);
  }
  delete node._id;
  // await saveFlowMessages(ticket, node._id!);
  await saveSentFlowMessage(ticket, node);
};

// export const findAndSendNode = async (
//   nodeIdentifier: string,
//   receiver: string,
  
//   ticket: string,
//   stageCode?: number | undefined
// ) => {
//   let node = await findNodeWithId(nodeIdentifier);
//   console.log(node ,"this is node for node identifier")
//   console.log("stagecode",stageCode);
//   let nodeName = null;
//   if (stageCode === 2) {
//     nodeName = "How";
//   }
//   if (stageCode === 3) {
//     nodeName = "Recovery";
//   }
//   if (stageCode === 4) {
//     nodeName = "Untreated";
//   }

//   // let node = await findNodeWithId(nodeIdentifier, nodeName);
//   if (node === null) {
//     node = await findNodeWithId("DF");
//   }
//   if (node === null) throw new Error("Node not found");
//   if (node.type === "reply") {
//     const replyPayload = createReplyPayload(node);
//     await sendMessage(receiver, replyPayload);
//   } else if (node.type === "list") {
//     const listPayload = createListPayload(node);
//     await sendMessage(receiver, listPayload);
//   }
//   delete node._id;
//   // await saveFlowMessages(ticket, node._id!);
//   await saveSentFlowMessage(ticket, node);
// };


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
  // sender: string
) => {
  // const textPayload = createTextPayload(message, sender);
  const textPayload = createTextPayload(message);

  await sendMessage(receiver, textPayload);
};


export const sendImage = async (
  location: string,
  receiver: string,
  sender: string
) => {
  // const imagePayload = createImagePayload(location, sender);
  await sendImageMessage(receiver, location);
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

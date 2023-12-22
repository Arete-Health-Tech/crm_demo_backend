import { NextFunction, Request, Response } from "express";
import { ClientSession, ObjectId } from "mongodb";
import { page } from "pdfkit";
import PromiseWrapper from "../../middleware/promiseWrapper";
import {
  findConsumerFromWAID,
  saveMessage,
  saveMessageFromWebhook,
  saveTextMessage,
} from "../../services/whatsapp/webhook";
import { followUpMessage, sendPdfMessage } from "../../services/whatsapp/whatsapp";
import { iWebhookPayload } from "../../types/flow/webhook";
import ErrorHandler from "../../utils/errorHandler";
import { findConsumerById } from "../consumer/functions";
import { findOneService } from "../service/crud";
import { findTicketAndPrescriptionFromWAID } from "../ticket/functions";
import {
  connectFlow,
  createListNode,
  createReplyNode,
  findAndSendNode,
  findFlowConnectorByTemplateIdentifier,
  findNodeByDiseaseId,
  getConnector,
  sendImage,
  sendTextMessage,
} from "./functions";
import { putMedia } from "../../services/aws/s3";
const BUCKET_NAME = process.env.PUBLIC_BUCKET_NAME;
export const createReplyNodeController = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    const data = await createReplyNode(req.body, session);
    res.status(200).json(data);
  }
);
export const createListNodeController = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    const data = await createListNode(req.body, session);
    res.status(200).json(data);
  }
);
// flow connector
export const ConnectFlow = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    const service = await findOneService({ _id: req.body.serviceId });
 
    if (service === null) throw new ErrorHandler("Invalid Service Id", 400);
    const connector = await connectFlow(req.body, session);
    console.log(connector.nodeId);
   
    res.status(200).json(connector);
  }
);

export const verifyWhatsap = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
console.log("query web hook", req.query)
    let mode=req.query["hub.mode"];
    let challange=req.query["hub.challenge"];
    let token=req.query["hub.verify_token"];
 
 
     if(mode && token){
 
         if(mode==="subscribe" && token==="arete-health-tech"){
             res.status(200).send(challange);
         }else{
          console.log("credential not match");
             res.status(403);
         }
 
     }
}

export const HandleWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const body: iWebhookPayload = req.body;
    // console.log("web hook body yahi hai", JSON.stringify(req.body));
    //handling the responses
    body.entry.forEach((entry) => {
      entry.changes.forEach((changes) => {
        changes.value.messages.forEach((message, mi) => {
        
          (async function () {
           
            try {
              const { prescription, ticket } =
                await findTicketAndPrescriptionFromWAID(
                  changes.value.contacts[mi].wa_id
                );
              const departmentSet = new Set([
                "63ce58474dca242deb6a4d41",
                "63ce59964dca242deb6a4d4c",
                "63ce59314dca242deb6a4d48",
              ]);
              if (prescription && ticket && ticket?._id) {
                if (!departmentSet.has(prescription?.departments[0].toString()))
                  return;
                if (message.button) {
                  console.log(message.button.text ,"this is message for button")
                  await findAndSendNode(
                    
                    prescription.service
                      ? prescription.service.toString()
                      : "DF",
                    changes.value.contacts[mi].wa_id,
                    ticket._id.toString(),
                   
                  );
                } else if (message.interactive) {
                  const nodeIdentifier =
                    message.interactive.type === "button_reply"
                      ? message.interactive.button_reply.id
                      : message.interactive.list_reply.id;
                  await findAndSendNode(
                    nodeIdentifier,
                    changes.value.contacts[mi].wa_id,
                    ticket._id.toString(),
                   
                  );
                }
                await saveMessageFromWebhook(
                  body,
                  prescription.consumer.toString(),
                  ticket._id.toString()
                ); // saving message
              }
            } catch (error: any) {
              console.log(error.message);
            }
          })();
        });
      });
    });
    return res.sendStatus(200);
    //  return "webhook message sent";
   
  } catch (error: any) {
    return res.sendStatus(200);
    //  return { err: "error occured", error };
  
  }
};
export const SendMessage = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    const { message, consumerId, ticketID} = req.body;
  
   
  
    console.log(req.body,"req body")
    
    const consumer = await findConsumerById(consumerId);
    // console.log(consumer, "hello")
    if (consumer === null) throw new ErrorHandler("Consumer Not Found", 400);
    const sender = consumer.firstName
    console.log(sender ,"sender ",(consumer._id).toString(),"\n",consumer)
    // await sendTextMessage(message, consumer.phone, sender);
    await sendTextMessage(message, consumer.phone);

    const { ticket } = await findConsumerFromWAID(consumer.phone);
    await saveMessage(ticketID, {
      consumer: (consumer._id).toString(),
      messageType: "text",
      sender: consumer.phone,
      text: message,
      ticket: ticketID,
      type: "sent",
      createdAt: Date.now(),
    });
    return res.status(200).json({ message: "message sent." });
  }
);
export const FindNode = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession 
  ) => {
    const { flowQuery } = req.query as unknown as { flowQuery: string };
    const node = await findNodeByDiseaseId(flowQuery);
console.log(node);
    return res.status(200).json(node);
  }
);
export const GetConnector = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    const { pageLength, page } = req.query as unknown as {
      pageLength: number;
      page: number;
    };
    if (pageLength > 50)
      throw new ErrorHandler("Page Length Limit Exceed", 400);
    const connectors = await getConnector(pageLength, page);
    return res.status(200).json(connectors);
  }
);
export const whatsappImageStatus = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    const {consumerId,ticketID} = req.body
    const newConsumerID = new ObjectId(consumerId);
   console.log(ticketID,"this is ticketID for image");
   console.log(req.file,"this is request of file")
    const { Location } = await putMedia(
    req.file,
      `patients/whatsappImageStatus`,
      BUCKET_NAME
    );
    const location=Location;
     console.log(location, "thi sis image from fromt end");
    const consumer = await findConsumerById(newConsumerID);
    // console.log(consumer, "hello")
    if (consumer === null) throw new ErrorHandler("Consumer Not Found", 400);
    const sender = consumer.firstName;
    console.log(sender, "sender ", consumer._id.toString(), "\n", consumer);
     const messageType = req.file?.mimetype.startsWith("image") ? "image" : "pdf";
  
      if (messageType === "image") {
      console.log("this is image from fromnt end fsdfkjddddg")
        await sendImage(location, consumer.phone, sender);
         await saveMessage(ticketID, {
           consumer: consumer._id.toString(),
           messageType: messageType,
           sender: consumer.phone,
           imageURL: location,
           ticket: ticketID,
           type: "sent",
           createdAt: Date.now(),
         });
         return res.status(200).json({ message: "message sent." });
      } else if (messageType === "pdf") {
        // Handle PDF upload
        console.log("this is pdf");
        console.log(location, "yeh wo wali location hai dlkh lo ");
        console.log(
          consumer.phone,
          "fjksdgksffffffffffffffffffffffffffffffffffffffffffg"
        );
        await sendPdfMessage(consumer.phone, location);
        await saveMessage(ticketID, {
          consumer: consumer._id.toString(),
          messageType: messageType,
          sender: consumer.phone,
          imageURL: location,
          ticket: ticketID,
          type: "sent",
          createdAt: Date.now(),
        });
        return res.status(200).json({ message: "message sent." });
        // await sendPdf(location, consumer.phone, sender); // Implement the sendPdf function
      }
  // await saveMessage(ticketID, {
  //   consumer: consumer._id.toString(),
  //   messageType: fileType,
  //   sender: consumer.phone,
  //   imageURL: location,
  //   ticket: ticketID,
  //   type: "sent",
  //   createdAt: Date.now(),
  // });
  // return res.status(200).json({ message: "message sent." });
   
  }
);
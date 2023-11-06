import { ClientSession, ObjectId } from "mongodb";
import { CONSUMER } from "../../types/consumer/consumer";
import {
  iImageMessage,
  iTextMessage,
  iWebhookPayload,
} from "../../types/flow/webhook";
import { iStage } from "../../types/stages/stages";
import { iPrescription, iTicket } from "../../types/ticket/ticket";
import ErrorHandler from "../../utils/errorHandler";
import MongoService, { Collections } from "../../utils/mongo";
import firestore, { fsCollections } from "../firebase/firebase";
import { redisClient } from "../../server";
import { TICKET_CACHE_OBJECT } from "../../modules/ticket/ticketUtils/Constants";
import { pushToUpdatedTicketTop } from "../../modules/ticket/ticketUtils/utilFunctions";
import axios from "axios";
import { putMedia } from "../aws/s3";
const { WA_ACCOUNT_ID, WA_TOKEN } = process.env;
const BUCKET_NAME = process.env.PUBLIC_BUCKET_NAME;

export const saveMessageFromWebhook = async (
  payload: iWebhookPayload,
  consumer: string,
  ticket: string
) => {
  payload.entry.map((entry) => {
    entry.changes.map((changes) => {
      changes.value.messages.map((message, mi) => {
        // finding consumer and ticket
      
        (async function () {
          console.log(message ,"this is message")
          if (message.text) {
            console.log(message.text, "yeh received message hai");
            const messagePayload: iTextMessage = {
              consumer: consumer,
              sender: changes.value.contacts[mi].wa_id,
              text: message.text.body,
              ticket: ticket,
              type: "received",
              messageType: "text",
              createdAt: Date.now(),
            };
            await saveMessage(ticket, messagePayload);
          } else if (message.image) {
           console.log(message ,"this is mssage for pdf")
          


let config = {
  method: "get",
  maxBodyLength: Infinity,
  url: `https://graph.facebook.com/v18.0/${message.image.id}/`,
  headers: {
    Authorization:
      "Bearer EAALU5Uh1hCoBAHOvIZAOLuJVrUltYe3uMCIQwKvayQCZC5zR45RO9iK5ZAeRNUKhZB3dShZBM4DugqeUtw9ZCIYOr39g3fqGsjYYycjNPb4CpMFZCQY4rqUSXaPHHam8utfUUzC4NBBSYLkoZCuSEW1oPl6TaZCK7hgmJ1h1E5DxXw8BEXKW1Vs2P",
  },
};

(async () => {
  try {
    const response = await axios.request(config);
    console.log(
      response.data?.url,
      "This is response data for the image"
    );

    const image = response.data?.url;
    const imageResponse = await axios.get(image, {
      responseType: "arraybuffer",
      headers: {
        Authorization:
          "Bearer EAALU5Uh1hCoBAHOvIZAOLuJVrUltYe3uMCIQwKvayQCZC5zR45RO9iK5ZAeRNUKhZB3dShZBM4DugqeUtw9ZCIYOr39g3fqGsjYYycjNPb4CpMFZCQY4rqUSXaPHHam8utfUUzC4NBBSYLkoZCuSEW1oPl6TaZCK7hgmJ1h1E5DxXw8BEXKW1Vs2P", // Replace with your Facebook Graph API access token
      },
    });

    

    console.log(imageResponse.data,"without stringfy")




   
    const concatenatedBuffer = Buffer.concat([imageResponse.data]);
      const file = {
        originalname: "file", // Provide a suitable name for your image
        buffer: concatenatedBuffer, // Replace 'buffers' with the image data
        mimetype: "image/jpeg", // Replace with the appropriate image MIME type (e.g., image/jpeg, image/png, etc.)
      };
       if (file.mimetype.startsWith("image/")) {
  // Handle images
  const { Location } = await putMedia(
    file,
    `images/${message?.image?.id}`,
    BUCKET_NAME
  );
       const uploadImage = Location;
       console.log(uploadImage,"this is upload image from whatsapp ");
       const messagePayload: iImageMessage = {
         url: uploadImage,
         consumer: consumer,
         sender: changes.value.contacts[mi].wa_id,
         image: uploadImage,
         ticket: ticket,
         type: "received",
         messageType: "image",

         createdAt: Date.now(),
       };
       await saveMessage(ticket, messagePayload);
      }else if(file.mimetype === "application/pdf")
       {
         // Handle PDFs
         const { Location } = await putMedia(
           file,
           `pdfs/${message?.image?.id}`,
           BUCKET_NAME
         );
        const uploadImage = Location;
        console.log(uploadImage, "this is upload image from whatsapp ");
        const messagePayload: iImageMessage = {
          url: uploadImage,
          consumer: consumer,
          sender: changes.value.contacts[mi].wa_id,
          image: uploadImage,
          ticket: ticket,
          type: "received",
          messageType: "pdf",

          createdAt: Date.now(),
        };
        await saveMessage(ticket, messagePayload);
       }
  } catch (error) {
    console.error(error);
  }
})();
 


            // const messagePayload: iImageMessage = {
            //   url:message.image,
            //   consumer: consumer,
            //   sender: changes.value.contacts[mi].wa_id,
            //   image: message.image,
            //   ticket: ticket,
            //   type: "received",
            //   messageType: "image",

            //   createdAt: Date.now(),
            // };
            // await saveMessage(ticket, messagePayload);
          } else if (message.button) {
            const messagePayload: iTextMessage = {
              consumer: consumer,
              sender: changes.value.contacts[mi].wa_id,
              text: message.button.text,
              ticket: ticket,
              type: "received",
              messageType: "text",
              createdAt: Date.now(),
            };
            await saveMessage(ticket, messagePayload);
          } else if (message.interactive) {
            if (message.interactive.type === "button_reply") {
              const messagePayload: iTextMessage = {
                consumer: consumer,
                sender: changes.value.contacts[mi].wa_id,
                text: message.interactive.button_reply.title,
                ticket: ticket,
                type: "received",
                messageType: "text",
                createdAt: Date.now(),
              };
              await saveMessage(ticket, messagePayload);
            } else {
              const messagePayload: iTextMessage = {
                consumer: consumer,
                sender: changes.value.contacts[mi].wa_id,
                text:
                  message.interactive.list_reply.title +
                  "\n\n" +
                  message.interactive.list_reply.description,
                ticket: ticket,
                type: "received",
                messageType: "text",
                createdAt: Date.now(),
              };
              await saveMessage(ticket, messagePayload);
            }
          }
        })();
      });
    });
  });
};

export const saveMessage = async (ticket: string, message: any) => {
  console.log("message payload", message);
  if (message.type === "received") {
    const data = await (await redisClient).GET(TICKET_CACHE_OBJECT);
    if (data) {
      let ticketObjCache = JSON.parse(data);
      ticketObjCache = await pushToUpdatedTicketTop(
        "true",
        message.ticket,
        ticketObjCache
      );
    }
  }
  console.log(fsCollections, "this is collections from firebase");
  return await firestore
    .collection(fsCollections.TICKET)
    .doc(ticket)
    .collection(fsCollections.MESSAGES)
    .doc()

    .set(message);
};

export const saveTextMessage = async (
  message: iTextMessage,
  session: ClientSession
) => {
  await MongoService.collection(Collections.MESSAGES).insertOne(message, {
    session,
  });
  console.log(message, "saveTextMessage");
};

export const saveFlowMessages = async (ticket: ObjectId, node: ObjectId) => {
  await MongoService.collection(Collections.MESSAGES).insertOne({
    ticket,
    type: "flow",
    node,
  });
};

export const findConsumerFromWAID = async (consumerWAId: string) => {
  // const stages = await MongoService.collection(Collections.STAGE).find<iStage>({}).toArray();
  console.log(consumerWAId, "consumer Id hai yeh ");
  const prescription = await MongoService.collection(Collections.PRESCRIPTION)
    .find<iPrescription>({})
    .toArray();

  // const consumer = await MongoService.collection(
  //   Collections.CONSUMER
  // ).findOne<CONSUMER>({
  //   phone: consumerWAId,
  // });

  const consumer = await MongoService.collection(Collections.CONSUMER)
    .find<CONSUMER>({
      phone: consumerWAId,
    })
    .sort({ _id: -1 })

    .toArray();

  if (consumer === null) throw new ErrorHandler("No Consumer Found", 404);

  const tickets = await MongoService.collection(Collections.TICKET)
    .find<iTicket>({
      consumer: consumer[0]._id,
    })

    .toArray();

  // const ticket = tickets.find(
  //   (item) => stages.find((stage) => stage._id?.toString() === item.stage.toString())?.code
  // );
  // if (!ticket)
  // throw new ErrorHandler("No Ticket Found", 404);
  const ticket = tickets.find(
    (item) =>
      prescription.find(
        (prescription) =>
          prescription._id?.toString() === item.prescription.toString()
      )?.consumer
  );

  if (!ticket) throw new ErrorHandler("No Ticket Found", 404);
  return { ticket: ticket._id!, consumer: consumer[0]._id };
};

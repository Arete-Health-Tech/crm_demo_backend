import { ObjectId } from "mongodb";

export interface iWebhookPayload {
  object: string;
  entry: {
    id: string;
    changes: {
      value: {
        messaging_product: "whatsapp";
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts: {
          wa_id: string;
          profile: {
            name: string;
          };
        }[];
        errors: {
          code: number;
          title: string;
        }[];
        messages: {
          button?: iButtonMessagePayload;
          interactive?: iReplyMessagePayload | iListMessagePayload;
          text?: iTextMessagePayload;
          image?: iImageMessagePayload;
        }[];
        statuses: [];
      };
      field: "messages";
    }[];
  }[];
}

interface iButtonMessagePayload {
  payload: any;
  text: string;
}

interface iReplyMessagePayload {
  type: "button_reply";
  button_reply: {
    id: string;
    title: string;
  };
}

interface iListMessagePayload {
  type: "list_reply";
  list_reply: {
    id: string;
    title: string;
    description: string;
  };
}

interface iTextMessagePayload {
  body: string;
}

interface iTextMessage {
  text: string;
  sender: string;
  type: "received" | "sent";
  ticket: string;
  consumer: string;
  messageType: "text";
  createdAt: number;
}

interface iImageMessage {
  id:string;
image:any;
  sender: string;
  type: "received" | "   sent";
  ticket: string;
  consumer: string;
messageType:"image";
  createdAt: number;
}

interface iImageMessagePayload{
   image:{
                    caption: "CAPTION",
                  mime_type: "image/jpeg",
                    sha256: "IMAGE_HASH",
                  id: "ID"
   }       
}
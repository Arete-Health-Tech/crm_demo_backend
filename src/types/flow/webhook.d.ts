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
          image?: iImageMessage;
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
  imageUrl: string;
  caption?: string;
  sender: string;
  type: "received";
  ticket: string;
  consumer: string;
messageType:"image";
  createdAt: number;
}
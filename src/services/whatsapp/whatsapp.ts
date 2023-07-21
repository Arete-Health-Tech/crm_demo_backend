import axios from "axios";
import ErrorHandler from "../../utils/errorHandler";
const { WA_ACCOUNT_ID, WA_TOKEN } = process.env;

const WHATSAPP_URL = `https://graph.facebook.com/v15.0/${WA_ACCOUNT_ID}/messages`;
export const sendMessage = async (receiver: string, payload: any) => {
  try {
    const { data } = await axios.post(
      WHATSAPP_URL,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: receiver,
        ...payload,
      },
      {
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    return data;
  } catch (error: any) {
    console.log(error.response.data.error, "wa_error");
    throw new ErrorHandler(error.response.data.error.message, 500);
  }
};

export const sendTemplateMessage = async (
  receiver: string,
  templateName: string,
  templateLanguage: string,
  components?: any
) => {
  try {
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: templateLanguage,
        },
      },
    };
    if (components) {
      templatePayload.template.components = components;
    }
    const { data } = await axios.post(WHATSAPP_URL, templatePayload, {
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    return data;
  } catch (error: any) {
    throw new ErrorHandler(error.response.data.error.message, 500);
  }
};

export const followUpMessage = async (
  patientName: string,
  receiver: string,
  templateName: string,
  templateLanguage: string,
  doctorName: string,
  date: string
) => {
  try {
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: templateLanguage,
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: patientName,
              },
              {
                type: "text",
                text: doctorName,
              },
              {
                type: "text",
                text: date,
              },
            ],
          },
        ],
      },
    };
    const { data } = await axios.post(WHATSAPP_URL, templatePayload, {
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    return data;
  } catch (error: any) {
    // throw new ErrorHandler("Error From Whatsapp", 500);
    // console.log(error);
    console.log("Error Format");
  }
};



export const estimateTemplateMessage = async (
  receiver: string,
  templateName: string,
  templateLanguage: string,
  location:string
) => {
  try {
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: templateLanguage,
        },
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "document",
                document: {
                  link: location,
                  filename: "Arete-Estimate",   
                
                },
              },
            ],
          },
          {
            type: "body",
          },
        ],
      },
    };

    const { data } = await axios.post(WHATSAPP_URL, templatePayload, {
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    return data;
  } catch (error: any) {
    throw new ErrorHandler(error.response.data.error.message, 500);
  }
};


export const herniaHow = async (
  receiver: string,
  templateName: string,
  templateLanguage: string,

) => {
  try {
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: templateLanguage,
        },
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: {
                  link: "https://aretewhatsappbucket.s3.amazonaws.com/HERNIORRHAPHY/WHY_HERNIORRHAPHY.jpg",
                },
              },
            ],
          },
          {
            type: "body",
          },
        ],
      },
    };

    const { data } = await axios.post(WHATSAPP_URL, templatePayload, {
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    return data;
  } catch (error: any) {
    throw new ErrorHandler(error.response.data.error.message, 500);
  }
};
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


export const herniaHowVideo = async (
 receiver:string,

) => {
  try {
   
console.log(receiver);
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "video",
      video: {
        link: "https://aretewhatsappbucket.s3.ap-south-1.amazonaws.com/HERNIORRHAPHY/HERNIORHAPHY.mp4",
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


export const herniaHowText = async (receiver: string) => {
  try {
    console.log(receiver,"receiver hai");
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "text",
      text: {
        body: "👉The procedure begins with a local or general anaesthesia. 👩‍⚕️The surgeon makes a cut in the groin to view and repair the hernia. 🪡After repairing the hernia, the surgeon uses stitches alone or stitches and a piece of mesh to close the abdominal wall. The mesh is designed to strengthen the weak area of the abdominal wall where the hernia occurred.💪",
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



export const herniaRecoveryText = async (
  receiver: string,
 
) => {
  try {
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "text",
      text: {
        body: "➡️After hernia repair surgery, it is common to experience mild to moderate pain and to feel a little run down. ✅It’s also normal to feel pulling or twinges in the affected area as you heal.👩‍⚕️Follow your doctor’s instructions on how to care for your wound and bathing. Most people can take a shower within 48 hours after surgery🚿. 🛄Most people can return to work within three days to two weeks after surgery. 👨‍🏭People who perform manual labor may need more time off. ❌Avoid lifting anything heavy or performing strenuous activities for at least four weeks.",
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

export const herniaRecoveryImage = async (
  receiver: string,
 
) => {
  try {
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "image",
      image:{
       link: "https://aretewhatsappbucket.s3.amazonaws.com/RECOVERY/RECOVERY.jpg",
    }};

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



export const herniaUntreatedText = async (
  receiver: string,
  
) => {
  try {
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "text",
      text: {
        body: "💁‍♀️In some cases, if the hernia is small, doesn’t grow and doesn’t cause any pain or problems, then surgery may not be needed immediately.⚠️However, it’s important to realize that most of the time, hernias do get larger. While it may not be causing trouble now, it is very likely that it could lead to more serious complications later if it is not repaired.😥 👉One of those complications is strangulation. This occurs when the bulging tissue is squeezed by the muscle wall. As a result, the blood supply is cut off and the tissue begins to die.😨",
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

export const herniaUntreatedImage = async (receiver: string) => {
  try {
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "image",
      image:{

       link: "https://aretewhatsappbucket.s3.amazonaws.com/HERNIORRHAPHY/UNTREATED_HERNIORRHAPHY.jpg",
      }
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





export const hysterectomyHowVideo = async (receiver: string) => {
  try {
    console.log(receiver);
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "video",
      video: {
        link: "https://aretewhatsappbucket.s3.amazonaws.com/Hysterectomy/TOTAL LAP. HYSTERECTOMY.mp4",
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

export const hysterectomyHowText = async (receiver: string) => {
  try {
    console.log(receiver, "receiver hai");
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "text",
      text: {
        body: "A vaginal hysterectomy can either be carried out using: 🟡General anaesthetic 🟡Local anaesthetic 🟡Spinal anaesthetic 👉During a vaginal hysterectomy, the womb and cervix are removed through an incision that's made in the top of the vagina. 👉After the womb and cervix have been removed, the incision will be sewn up. The operation usually takes about an hour to complete.",
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




export const hysterectomyRecoveryText = async (receiver: string) => {
  try {
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "text",
      text: {
        body: "🏠It can take about 6 to 8 weeks to fully recover after having an abdominal hysterectomy. Recovery times are often shorter after a vaginal or laparoscopic hysterectomy. During this time, you should rest as much as possible and not lift anything heavy, such as bags of shopping. Your abdominal muscles and the surrounding tissues need time to heal.",
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

export const hysterectomyRecoveryImage = async (receiver: string) => {
  try {
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "image",
      image: {
        link: "https://aretewhatsappbucket.s3.amazonaws.com/Recovery.jpeg",
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



export const hysterectomyUntreatedText = async (receiver: string) => {
  try {
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "text",
      text: {
        body: "😱If left untreated, fibroids can continue to grow in the uterus, both in size and number. *Bleeding will become heavier, and it may be accompanied by severe cramping and anaemia. *As the fibroids grow, the abdomen can swell.3w",
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

export const hysterectomyUntreatedImage = async (receiver: string) => {
  try {
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "image",
      image: {
        link: "https://aretewhatsappbucket.s3.amazonaws.com/Hysterectomy/TOTAL LAP. HYSTERECTOMY_UNTREATED.jpg",
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


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
        link: "https://aretewhatsappbucket.s3.amazonaws.com/Hernia%20Medanta%20Demo/HERNIORHAPHY%20(1).mp4",
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
        body: "👉The procedure begins with a local or general anaesthesia.\n 👩‍⚕️The surgeon makes a cut in the groin to view and repair the hernia.\n 🪡After repairing the hernia, the surgeon uses stitches alone or stitches and a piece of mesh to close the abdominal wall. The mesh is designed to strengthen the weak area of the abdominal wall where the hernia occurred.💪",
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
        body: "➡️After hernia repair surgery, it is common to experience mild to moderate pain and to feel a little run down.\n ✅It’s also normal to feel pulling or twinges in the affected area as you heal.\n 👩‍⚕️Follow your doctor’s instructions on how to care for your wound and bathing. Most people can take a shower within 48 hours after surgery🚿.\n 🛄Most people can return to work within three days to two weeks after surgery. \n 👨‍🏭People who perform manual labor may need more time off. \n ❌Avoid lifting anything heavy or performing strenuous activities for at least four weeks.",
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
      image: {
        link: "https://aretewhatsappbucket.s3.amazonaws.com/CABG%20Medanta%20Demo/RECOVERY.jpg",
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
        body: "💁‍♀️In some cases, if the hernia is small, doesn’t grow and doesn’t cause any pain or problems, then surgery may not be needed immediately.\n⚠️However, it’s important to realize that most of the time, hernias do get larger. While it may not be causing trouble now, it is very likely that it could lead to more serious complications later if it is not repaired.😥 \n👉One of those complications is strangulation. This occurs when the bulging tissue is squeezed by the muscle wall. As a result, the blood supply is cut off and the tissue begins to die.😨",
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
      image: {
        link: "https://aretewhatsappbucket.s3.amazonaws.com/Hernia%20Medanta%20Demo/UNTREATED_HERNIORRHAPHY.jpg",
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





export const hysterectomyHowVideo = async (receiver: string) => {
  try {
    console.log(receiver);
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "video",
      video: {
        link: "https://aretewhatsappbucket.s3.amazonaws.com/Hysterectomy%20Medanta%20Demo%20/HYSTERECTOMY.mp4",
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
        body: "A vaginal hysterectomy can either be carried out using: \n🟡General anaesthetic \n🟡Local anaesthetic \n🟡Spinal anaesthetic \n👉During a vaginal hysterectomy, the womb and cervix are removed through an incision that's made in the top of the vagina. \n👉After the womb and cervix have been removed, the incision will be sewn up. The operation usually takes about an hour to complete.",
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
        body: "🏠It can take about 6 to 8 weeks to fully recover after having an abdominal hysterectomy. \n Recovery times are often shorter after a vaginal or laparoscopic hysterectomy. \n During this time, you should rest as much as possible and not lift anything heavy, such as bags of shopping. \n Your abdominal muscles and the surrounding tissues need time to heal.",
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
        link: "https://aretewhatsappbucket.s3.amazonaws.com/CABG%20Medanta%20Demo/RECOVERY.jpg",
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
        body: "😱If left untreated, fibroids can continue to grow in the uterus, both in size and number. \n *Bleeding will become heavier, and it may be accompanied by severe cramping and anaemia. \n *As the fibroids grow, the abdomen can swell.3w",
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
        link: "https://aretewhatsappbucket.s3.amazonaws.com/Hysterectomy%20Medanta%20Demo%20/HYSTERECTOMY_UNTREATED.jpg",
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


export const cabgHowImage = async (receiver: string) => {
  try {
    console.log(receiver);
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "image",
      image: {
        link: "https://aretewhatsappbucket.s3.amazonaws.com/CABG%20Medanta%20Demo/CABG_PROCEDURE.jpg",
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

export const cabgHowText = async (receiver: string) => {
  try {
    console.log(receiver, "receiver hai");
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "text",
      text: {
        body: "👉🏻CABG usually lasts for 3-6 hours. But it may take longer depending on how many blood vessels are being attached.\n Here’s what you can expect during the surgery- \n 1️⃣Blood vessels can be taken from your leg, inside your chest, or your arm. One of the graft vessels is usually taken from your chest \n 2️⃣Once all the graft vessels have been removed, your surgeon will make a cut down the middle of your chest so they can divide your breastbone (sternum) and access your heart \n  3️⃣During the procedure, your blood may be rerouted to a heart-lung bypass machine.\n 4️⃣After the grafts have been attached, your heart will be started again using controlled electrical shocks \n 5️⃣Your breastbone will then be fixed together using permanent metal wires and the skin on your chest sewn up using dissolvable stitches",
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

export const cabgRecoveryText = async (receiver: string) => {
  try {
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "text",
      text: {
        body: "➡️After surgery, you will typically spend one or two days in an intensive care unit. 👩‍⚕️Your doctor will give you specific instructions for recovering at home ✅You also may receive instructions on how to deal with common after-effects from surgery. After-effects often go away within four to six weeks after surgery, but may include: \n - Swelling of the area where an artery or vein was taken for grafting  \n - Muscle pain or tightness in the shoulders and upper back  \n - Fatigue, mood swings or depression \n - Difficulty sleeping or loss of appetite - Constipation \n - Chest pain around the site of the chest bone incision \n ⏱️Full recovery from traditional CABG may take six to 12 weeks or more",
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

export const cabgRecoveryImage = async (receiver: string) => {
  try {
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "image",
      image: {
        link: "https://aretewhatsappbucket.s3.amazonaws.com/CABG%20Medanta%20Demo/RECOVERY.jpg",
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



export const cabgUntreatedText = async (receiver: string) => {
  try {
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "text",
      text: {
        body: "⚠️There are several serious complications of CAD. These can occur after years of untreated CAD when the arteries become so badly diseased that complete obstruction of blood flow through the coronary arteries occurs. \n 💁‍♀️This causes insufficient oxygen and nutrient delivery to the heart muscles, potentially causing the death of the heart muscle cells and subsequent dysfunction of a portion of the heart muscle itself which can lead to  sudden heart attacks and untimely heart failure.😥",
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

export const cabgUntreatedImage = async (receiver: string) => {
  try {
    const templatePayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: receiver,
      type: "image",
      image: {
        link: "https://aretewhatsappbucket.s3.amazonaws.com/CABG%20Medanta%20Demo/Untitled%20design.png",
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

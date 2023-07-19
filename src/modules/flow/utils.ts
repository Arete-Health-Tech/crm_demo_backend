import { header } from "express-validator";
import { iListNode, iReplyNode } from "../../types/flow/reply";

export const createTextPayload = (message: string, sender: string) => {
  return {
    type: "text",
    text: {
      preview_url: true,
      body: `*${sender}*\n ${message}`,
    },
  };
};

export const createReplyPayload = (node: iReplyNode) => {
  const payload: any = {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: node.body,
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: node.replyButtonId1,
              title: node.replyButton1,
            },
          },
        ],
      },
    },
  };
  if (node.headerLink && node.headerType) {
    const type = node.headerType.toLowerCase() as any;
    payload.interactive.header = createHeader(type, node.headerLink);
  }
  if (node.footer) {
    payload.interactive.footer = { text: node.footer };
  }
  if (node.replyButton2) {
    payload.interactive.action.buttons.push({
      type: "reply",
      reply: {
        id: node.replyButtonId2!,
        title: node.replyButton2,
      },
    });
  }
  if (node.replyButton3) {
    payload.interactive.action.buttons.push({
      type: "reply",
      reply: {
        id: node.replyButtonId3!,
        title: node.replyButton3,
      },
    });
  }
  return payload;
};

export const createListPayload = (node: iListNode) => {
  const payload: any = {
    type: "interactive",
    interactive: {
      type: "list",
      body: {
        text: node.body,
      },
      action: {
        button: node.menuTitle,
        sections: [
          {
            title: node.sectionTitle,
            rows: [
              {
                id: node.listId0,
                title: node.listTitle0,
                description: node.listDesc0? node.listDesc0 : node.listTitle0,
              },
            ],
          },
        ],
      },
    },
  };
  if (node.footer) {
    payload.interactive.footer = { text: node.footer };
  }
  if (node.listId1 && node.listTitle1) {
    payload.interactive.action.sections[0].rows.push({
      id: node.listId1,
      title: node.listTitle1,
      description: node.listDesc1 ? node.listDesc1 : node.listTitle1,
    });
  }
  if (node.listId2 && node.listTitle2) {
    payload.interactive.action.sections[0].rows.push({
      id: node.listId2,
      title: node.listTitle2,
      description: node.listDesc2 ? node.listDesc2 : node.listTitle2,
    });
  }
  if (node.listId3 && node.listTitle3) {
    payload.interactive.action.sections[0].rows.push({
      id: node.listId3,
      title: node.listTitle3,
      description: node.listDesc3 ? node.listDesc3 : node.listTitle3,
    });
  }
  if (node.listId4 && node.listTitle4) {
    payload.interactive.action.sections[0].rows.push({
      id: node.listId4,
      title: node.listTitle4,
      description: node.listDesc4 ? node.listDesc4 : node.listTitle4,
    });
  }
  if (node.listId5 && node.listTitle5) {
    payload.interactive.action.sections[0].rows.push({
      id: node.listId5,
      title: node.listTitle5,
      description: node.listDesc5 ? node.listDesc5 : node.listTitle5,
    });
  }
  if (node.listId6 && node.listTitle6) {
    payload.interactive.action.sections[0].rows.push({
      id: node.listId6,
      title: node.listTitle6,
      description: node.listDesc6 ? node.listDesc6 : node.listTitle6,
    });
  }
  if (node.listId7 && node.listTitle7) {
    payload.interactive.action.sections[0].rows.push({
      id: node.listId7,
      title: node.listTitle7,
      description: node.listDesc7 ? node.listDesc7 : node.listTitle7,
    });
  }
  if (node.listId8 && node.listTitle8) {
    payload.interactive.action.sections[0].rows.push({
      id: node.listId8,
      title: node.listTitle8,
      description: node.listDesc8 ? node.listDesc8 : node.listTitle8,
    });
  }
  if (node.listId9 && node.listTitle9) {
    payload.interactive.action.sections[0].rows.push({
      id: node.listId9,
      title: node.listTitle9,
      description: node.listDesc9 ? node.listDesc9 : node.listTitle9,
    });
  }
  return payload;
};

export const createHeader = (type: "video" | "document" | "image", link: string) => {
  switch (type) {
    case "video":
      return {
        type: "video",
        video: {
          link,
        },
      };
    case "document":
      return {
        type: "document",
        document: {
          link,
        },
      };
    case "image":
      return {
        type: "image",
        image: {
          link,
        },
      };

    default:
      break;
  }
};

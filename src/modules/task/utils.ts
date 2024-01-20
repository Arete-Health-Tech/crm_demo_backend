export const createReminderTemplate =   (title: string, description: string) => {
  return [
    {
      type: "body",
      parameters: [
        {
          type: "text",
          text: title,
        },
        {
          type: "text",
          text: description,
        },
      ],
    },
  ];
};


export const createReschedulerTemplate = (
  title: string,
  description: string
) => {
  return [
    {
      type: "body",
      parameters: [
        {
          type: "text",
          text: title,
        },
        {
          type: "text",
          text: description,
        },
      ],
    },
  ];
};
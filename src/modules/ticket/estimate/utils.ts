export const whatsappEstimatePayload = (location: string) => {
  return [
    {
      type: "text",
      parameters: [
        {
          type: "document",
          document: {
            link: location,
          },
        },
      ],
    },
  ];
};

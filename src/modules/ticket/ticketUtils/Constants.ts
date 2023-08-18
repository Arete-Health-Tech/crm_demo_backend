export const  TICKET_CACHE_OBJECT = "TICKET_CACHE";
export interface iTicketsResultJSON {
    tickets : any[],
    count: number,
}

const today = new Date(); // Get today's date
    today.setHours(0, 0, 0, 0);

export const modificationDateQuery = {
    $or: [
      {
        modifiedDate: null,
      },

      {
        $and: [
          {
            $expr: {
              $gt: [
                today,
                {
                  $add: ["$modifiedDate", 3 * 24 * 60 * 60 * 1000],
                },
              ],
            },
          },
          {
            $expr: {
              $lt: [
                today,
                {
                  $add: ["$modifiedDate", 45 * 24 * 60 * 60 * 1000],
                },
              ],
            },
          },
        ],
      },
    ],
  };
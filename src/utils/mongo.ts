import { Db, MongoClient, ObjectId } from "mongodb";

export const Collections = {
  PRESCRIPTION: "prescription",
  CONSUMER: "consumer",
  DEPARTMENT: "department",
  REPRESENTATIVE: "representative",
  SERVICE: "service",
  TICKET: "ticket",
  STAGE: "stage",
  WARD: "ward",
  ESTIMATE: "estimate",
  FLOW: "flow",
  STAGEFLOW:"stageflow",
  Note: "note",
  FLOW_CONNECT: "flow_connect",
  MESSAGES: "messages",
  SCRIPT: "script",
  REMINDER: "reminder",
  TODO: "todo",
  FOLLOWUP: "followup",
};

abstract class MongoService {
  private static _db: Db = null!;
  private static _client: MongoClient = null!;
  private static _MONGO_URI = process.env.MONGO as string;
  private static _MONGO_DB_NAME = process.env.MONGO_DB as string;
  public static async init() {
    MongoService._client = await MongoClient.connect(MongoService._MONGO_URI);
    MongoService._db = MongoService._client.db(MongoService._MONGO_DB_NAME);
  }

  public static collection(collectionName: string) {
    return MongoService._db.collection(collectionName);
  }

  public static get session() {
    return MongoService._client.startSession();
  }
}

export const getCreateDate = (id: ObjectId) => {
  return id.getTimestamp();
};
// export const getCreateDatePlusOne3 = (id: ObjectId) => {
//   const createDate = id.getTimestamp();
//   createDate.setDate(createDate.getDate());
//   return createDate;
// };

export default MongoService;

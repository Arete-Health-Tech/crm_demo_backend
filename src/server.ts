import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import express, { Express, Response, Request, NextFunction } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import moduleRoutes from "./modules/routes";
import ErrorHandler from "./utils/errorHandler";
import MongoService, { Collections, getCreateDate } from "./utils/mongo";
import seed from "./seed/seed";
import {  followUpMessage } from "./services/whatsapp/whatsapp";
import { getMedia } from "./services/aws/s3";
import { getServiceById } from "./modules/service/functions";
import { findOneService } from "./modules/service/crud";
import { ConnectFlow } from "./modules/flow/controller";


const cron = require("node-cron");

declare global {
  namespace Express {
    interface Request {
      user?: Record<string, any>;
    }
  }
}

const app: Express = express();
const PORT = process.env.PORT;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "1mb" }));
app.use(cors());

app.get("/prod/", async (req: Request, res: Response) => {
  res.send("howdy!");
});

app.use("/prod/api/v1/", moduleRoutes);


app.get(
  "/prod/api/v1/messanger",
  async (req: Request, res: Response, next: NextFunction) => {
    const service = await findOneService({ _id: req.body.serviceId });
    console.log(service);
  }
);


app.get("/tickets", async (req: Request, res: Response, next: NextFunction) => {
  const phone = req.query.phone
    ? String(req.query.phone).split(",")
    : [];
  const firstName = req.query.firstName
    ? String(req.query.firstName).split(",")
    : [];
  const uid = req.query.uid ? String(req.query.uid).split(",") : [];

  console.log(phone);

  const tickets = await MongoService.collection(Collections.TICKET)
    .aggregate([
      // matchStage,/
      {
        $lookup: {
          from: Collections.CONSUMER,
          localField: "consumer",
          foreignField: "_id",
          let: { consumer: "$consumer" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$consumer"] } } },
            { $limit: 1 },
          ],
          as: "consumer",
        },
      },
      {
        $match: {
          $or: [
            {
              "consumer.phone": {
                $all: phone,
              },
            },
            {
              "consumer.firstName": {
                $all: firstName,
              },
            },
            {
              "consumer.uid": {
                $all: uid,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: Collections.PRESCRIPTION,
          localField: "prescription",
          let: { prescription: "$prescription" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$prescription"] } } },
            { $limit: 1 },
          ],
          foreignField: "_id",
          as: "prescription",
        },
      },

      {
        $lookup: {
          from: Collections.ESTIMATE,
          let: { id: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$$id", "$ticket"] } } },
            { $sort: { _id: -1 } },
            { $limit: 1 },
          ],
          as: "estimate",
        },
      },
      {
        $lookup: {
          from: Collections.REPRESENTATIVE,
          localField: "creator",
          let: { creator: "$creator" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$creator"] } } },
            { $limit: 1 },
            { $project: { firstName: 1, lastName: 1, email: 1, phone: 1 } },
          ],
          foreignField: "_id",
          as: "creator",
        },
      },
    ])
    .toArray();

  for await (const ticket of tickets) {
    ticket.prescription[0].image = getMedia(ticket.prescription[0].image);
    if (ticket.prescription[0].service) {
      const presService = await getServiceById(ticket.prescription[0].service);
      if (presService) {
        ticket.prescription[0].service = presService;
      }
    }
    ticket.createdAt = getCreateDate(ticket._id);
    ticket.prescription[0].createdAt = getCreateDate(
      ticket.prescription[0]._id
    );

    if (ticket.estimate[0]) {
      const service = await findOneService({
        _id: ticket.estimate[0].service[0].id,
      });
      ticket.estimate[0].service[0] = {
        ...ticket.estimate[0].service[0],
        ...service,
      };
      ticket.estimate[0].createdAt = getCreateDate(ticket.estimate[0]._id);
    }
  }
  console.log(tickets);
  return res.status(200).json(tickets);
});







app.use(
  (err: ErrorHandler, req: Request, res: Response, next: NextFunction) => {
    const status = err.code || 500;
    const message = err.message || "Internal Server Error";
    console.log(status, message);
    return res.status(status).json({ message: message });
  }
);



  // estimateTemplateMessage("919452760854", "patient_estimate", "en");

//follow up Messages
cron.schedule("50 11 * * *", () => {
  let todayDate = new Date()
    .toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    })
    .split(",")[0];
  try {
    MongoService.collection("followUp")
      .find({})
      .forEach((val) => {
        function capitalizeFirstLetter(str: string): string {
          return str.charAt(0).toUpperCase() + str.slice(1);
        }
        function capitalizeName(name: string): string {
          const parts = name.split(".");
          const capitalizedParts = parts.map((part) =>
            capitalizeFirstLetter(part)
          );
          return capitalizedParts.join(".");
        }

        let twoDaysBeforeFormat = new Date(val.followUpDate2)
          .toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
          .split(",")[0];

        let oneDayBeforeFormat = new Date(val.followUpDate1)
          .toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
          .split(",")[0];

        const doctorDate = new Date(val.followUpDate)
          .toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
          .split(",")[0];

        if (
          todayDate === oneDayBeforeFormat ||
          twoDaysBeforeFormat === todayDate ||
          todayDate === doctorDate
        ) {
          followUpMessage(
            val.firstName.charAt(0).toUpperCase() + val.firstName.slice(1),
            val.phone,
            "followup",
            "en",
            capitalizeName(val.name),
            doctorDate
          );

          console.log("two days before");
        }
      });
  } catch (error) {
    console.log(error);
  }
});

MongoService.init().then(() => {
  app.listen(PORT, async () => {
    await seed();
    console.log(`Server running at ${PORT}`);
  });
});

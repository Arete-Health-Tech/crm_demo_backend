import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import express, { Express, Response, Request, NextFunction } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import moduleRoutes from "./modules/routes";
import ErrorHandler from "./utils/errorHandler";
import MongoService, { Collections } from "./utils/mongo";
import seed from "./seed/seed";
import { followUpMessage } from "./services/whatsapp/whatsapp";
import redisConnectionStart from "./utils/redis";
import { connectSocketIO } from "./utils/socket/socket_io";
import http from 'http';
import morgan from 'morgan';
import socketIO from "socket.io";
import { settingCronPending } from "./utils/jobs/setCrons";
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

app.use(morgan('tiny'));

app.get("/prod/", async (req: Request, res: Response) => {
  res.send("howdy!");
});

app.use("/prod/api/v1/", moduleRoutes);

app.use(
  (err: ErrorHandler, req: Request, res: Response, next: NextFunction) => {
    const status = err.code || 500;
    const message = err.message || "Internal Server Error";
    console.log(status, message);
    return res.status(status).json({ message: message });
  }
);

//follow up Messages
cron.schedule(" 30 04 * * *", () => {
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


const server = http.createServer(app);

export const io = new socketIO.Server(server, {
  cors: {
    origin: "*",  
    methods: ["GET", "POST"],
  },

}).listen(5050);


export const IO = connectSocketIO(); //connected socket

export const redisClient = redisConnectionStart();

settingCronPending();

MongoService.init().then(() => {
  server.listen(PORT, async () => {
    await seed();
    console.log(`Server running at ${PORT}`);
  });
});

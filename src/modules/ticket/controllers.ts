import { NextFunction, Request, Response } from "express";
import { ClientSession, Collection, ObjectId } from "mongodb";

import PromiseWrapper from "../../middleware/promiseWrapper";
import { getMedia, putMedia } from "../../services/aws/s3";

import {
  cabgHowImage,
  cabgHowText,
  cabgRecoveryImage,
  cabgRecoveryText,
  cabgUntreatedImage,
  cabgUntreatedText,
  followUpMessage,
  herniaHowText,
  herniaHowVideo,
  herniaRecoveryImage,
  herniaRecoveryText,
  herniaUntreatedImage,
  herniaUntreatedText,
  hysterectomyHowText,
  hysterectomyHowVideo,
  hysterectomyRecoveryImage,
  hysterectomyRecoveryText,
  hysterectomyUntreatedImage,
  hysterectomyUntreatedText,
  sendMessage,
  sendTemplateMessage,
} from "../../services/whatsapp/whatsapp";

import {
  iEstimate,
  ifollowUp,
  iPrescription,
  iTicket,
} from "../../types/ticket/ticket";
import ErrorHandler from "../../utils/errorHandler";
import MongoService, { Collections, getCreateDate } from "../../utils/mongo";

import { findConsumerById } from "../consumer/functions";
import {
  findDoctorById,
  getDepartmentById,
  getWardById,
} from "../department/functions";
import {
  findFlowConnectorByService,
  sendTextMessage,
  startTemplateFlow,
} from "../flow/functions";
import { getSortedLeadCountRepresentatives } from "../representative/functions";
import { findOneService } from "../service/crud";
import { getServiceById } from "../service/functions";
import { findStageByCode } from "../stages/functions";
import { createReminder } from "../task/functions";
import {
  createOneFollowUp,
  createOnePrescription,
  findOnePrescription,
  findPrescription,
  findPrescriptionById,
  findTicket,
  findTicketById,
  insertPatientStatusDetail,
} from "./crud";
import generateEstimate from "./estimate/createEstimate";
import { whatsappEstimatePayload } from "./estimate/utils";
import {
  createEstimate,
  createNote,
  createTicketHandler,
  getAllTicketHandler,
  getConsumerPrescriptions,
  getConsumerTickets,
  findOneTicket,
  getPrescriptionById,
  getTicketEstimates,
  getTicketNotes,
  searchService,
  updateSubStage,
  updateTicket,
  watchTicketChangesEvent,
  createResult,
} from "./functions";

import { CONSUMER } from "../../types/consumer/consumer";
import { HandleWebhook } from "../flow/controller";
import { redisClient } from "../../server";
import {
  TICKET_CACHE_OBJECT,
  iTicketsResultJSON,
  modificationDateQuery,
} from "./ticketUtils/Constants";
import {
  RedisUpdateSingleTicketLookUp,
  applyPagination,
  createTicketLookUps,
  pushToUpdatedTicketTop,
} from "./ticketUtils/utilFunctions";
import { findOneConsumer } from "../consumer/crud";
const cron = require("node-cron");

type ticketBody = iTicket & iPrescription;
type tickeFollow = ifollowUp & iPrescription & iTicket & CONSUMER;

export const UNDEFINED = "undefined";

export const createTicket = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    if (!req.file) {
      throw new ErrorHandler("Prescription image not found", 400);
    }
    const ticket: ticketBody = req.body;

    const consumer = await findConsumerById(ticket.consumer);
    console.log(consumer);
    if (consumer === null) {
      throw new ErrorHandler("consumer doesn't exist", 404);
    }
    const departments: string[] = JSON.parse(req.body.departments);
    for await (const department of departments) {
      const dept = await getDepartmentById(new ObjectId(department));
      if (dept === null) {
        throw new ErrorHandler("Invalid department passed", 400);
      }
    }
    const doctor = await findDoctorById(ticket.doctor);
    if (doctor === null) {
      throw new ErrorHandler("Invalid doctor id passed", 400);
    }
    const { Key } = await putMedia(
      req.file,
      `patients/${ticket.consumer}/prescription`
    );
    //create prescription
    const { _id } = await createOnePrescription(
      {
        admission: ticket.admission,
        service: ticket.service,
        condition: ticket.condition,
        consumer: ticket.consumer,
        departments: JSON.parse(req.body.departments).map(
          (item: string) => new ObjectId(item)
        ),
        diagnostics: ticket.diagnostics
          ? (JSON.parse(req.body.diagnostics) as string[])
          : null,
        medicines: ticket.medicines ? JSON.parse(req.body.medicines) : null,
        doctor: ticket.doctor,
        followUp: ticket.followUp,
        isPharmacy:ticket.isPharmacy,

        image: Key,
        symptoms: ticket.symptoms,
        caregiver_name: ticket.caregiver_name,
        caregiver_phone: ticket.caregiver_phone,
        created_Date: new Date()
          .toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
          .split(",")[0],
        // followup db data push
      },
      session
    );

    // finally create ticket
    if (!_id) {
      new ErrorHandler("failed to create prescription", 400);
    } else {
      const stage = await findStageByCode(1);
      const engagementConfirm = req.body.admission;
      const representatives = await getSortedLeadCountRepresentatives();
      if (representatives.length === 0)
        throw new ErrorHandler("Representatives Not Found", 422);
      const { status, body } = await createTicketHandler(
        {
          consumer: ticket.consumer,
          prescription: _id,
          creator: new ObjectId(req.user!._id),
          assigned: representatives[0]._id,
          stage: stage._id!,
          date: new Date(),
          subStageCode: {
            active: !!engagementConfirm,
            code: 1,
          },
          modifiedDate: null,
        },
        session
      );
      if (req.body.admission !== null) {
        const components = [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text:
                  consumer.firstName.toUpperCase() +
                  " " +
                  (consumer.lastName ? consumer.lastName.toUpperCase() : ""),
              },
            ],
          },
        ];
        await startTemplateFlow("flow", "en", consumer.phone, components);
      }

      if (ticket.followUp !== null) {
        await createOneFollowUp({
          firstName: consumer.firstName,
          name: doctor.name,
          phone: consumer.phone,
          followUpDate: new Date(ticket.followUp.getTime()).toISOString(),
          lastName: consumer.lastName,
          email: "",
          followUpDate1: new Date(
            ticket.followUp.getTime() - 1 * 24 * 60 * 60 * 1000
          ).toISOString(),

          followUpDate2: new Date(
            ticket.followUp.getTime() - 2 * 24 * 60 * 60 * 1000
          ).toISOString(),
        });
      }

      return res.status(status).json(body);
    }
  }
);

export const getAllTicket = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const tickets = await getAllTicketHandler();
    return res.status(200).json(tickets);
  }
);

export const search = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { search, departmentType } = <
      { search: string; departmentType: string }
    >req.query;
    const { status, body } = await searchService(search, departmentType);
    return res.status(status).json(body);
  }
);

export const ticketsWithPrescription = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const tickets = await getConsumerTickets(
      new ObjectId(req.params.consumerId)
    );
    const prescriptions = await getConsumerPrescriptions(
      new ObjectId(req.params.consumerId)
    );
    const ticketMap = new Map(
      tickets.map((item, index) => [item.prescription.toString(), index])
    );
    // mapping tickets with prescription
    const populatedTickets = [];
    for await (const prescription of prescriptions) {
      if (prescription.admission !== null) {
        /* @ts-ignore */
        prescription.service = await findOneService({
          _id: prescription.service!,
        });
      }
      prescription.image = getMedia(prescription.image);
      const ticket = tickets[ticketMap.get(prescription._id!.toString())!];
      populatedTickets.push({ ...ticket, prescription });
    }
    return res.status(200).json(populatedTickets);
  }
);

export const getRepresentativeTickets = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const requestQuery: any = req.query;
    const download = requestQuery.downloadAll;
    const pageNum: any = parseInt(requestQuery?.page) || 1;
    const skipCount = download !== "true" ? (parseInt(pageNum) - 1) * 10 : 0;
    const limitCount = download !== "true" ? 10 : Math.pow(10, 10); //  highest number
    const stageList = requestQuery.stageList
      ? requestQuery?.stageList
          ?.split(",")
          .map((id: string) => new ObjectId(id))
      : [];
    const representative = requestQuery?.representative;
    let filters = {};

    if (stageList?.length > 0) {
      filters = { ...filters, stage: { $in: stageList } };
    }

    if (representative !== undefined && representative !== "null") {
      filters = { ...filters, creator: new ObjectId(representative) };
    }
    const filterFlag = Object.keys(filters).length > 0;
    const ticketId = requestQuery.ticketId;
    const fetchUpdated = requestQuery.fetchUpdated;

    console.log("query: ", requestQuery);

    if (requestQuery.name === UNDEFINED && !filterFlag && download !== "true") {
      // let tempTicketcache = null;
      if (ticketId !== UNDEFINED && fetchUpdated !== "true") {
        // if (fetchUpdated === "true") {
        //   console.log("cache updating...")
        //   //HERE TICKET WILL UPDATED IN CACHE IF MONGODB DATA HAS CHANGED
        //   tempTicketcache = await RedisUpdateSingleTicketLookUp(ticketId);
        // } else {
        const result = await createTicketLookUps(ticketId);
        return res.json(result);
        // }
      }

      try {
        console.log("Checking Ticket-Lookup-Data Cache In Redis...");
        const data = await (await redisClient).GET(TICKET_CACHE_OBJECT);
       
        if (data === null) {
          console.log("No cache in redis!");
          const ticketsResult = await createTicketLookUps();
          const listOfTicketObjects = ticketsResult?.tickets;

          if (listOfTicketObjects.length < 1)
            return res
              .status(500)
              .json({ message: "NO Tickets Found In DB", ...ticketsResult });

          let TicketCacheObj: any = {};
          listOfTicketObjects.forEach((currentTicket: any) => {
            let ticket_ID: string = currentTicket._id.toString();
            TicketCacheObj[ticket_ID] = currentTicket;
          }); // setting {id: ticketdata} pair

          const finalTicketCaches = JSON.stringify(TicketCacheObj);

          await (await redisClient).SET(TICKET_CACHE_OBJECT, finalTicketCaches);

          console.log("final tickets cache being saved to redis!");

          const sortedData = applyPagination(listOfTicketObjects, 1, 10);

          const ticketsJson: iTicketsResultJSON = {
            tickets: sortedData,
            count: listOfTicketObjects.length,
          };

          console.log("sending to client...");
          return res.status(200).json(ticketsJson) && console.log("DONE!");
        } else {
          console.log("Cache being fetched from redis...");
          
          let ticketObjCache = JSON.parse(data);
          if (fetchUpdated === "true") {
            ticketObjCache = await pushToUpdatedTicketTop(
              fetchUpdated,
              ticketId,
              ticketObjCache
            );
          }          // tempTicketcache === null ? JSON.parse(data) : tempTicketcache;
          const listOfTicketsObj = Object.values(ticketObjCache);
          const sortedTicketData = applyPagination(
            listOfTicketsObj,
            pageNum,
            10
          );
          console.log("page", pageNum, "\n");
          const ticketsResultJson: iTicketsResultJSON = {
            tickets: sortedTicketData,
            count: listOfTicketsObj.length,
          };

          console.log("Cache data sent to client!");

          return res.status(200).json(ticketsResultJson);
        }
      } catch (err: any) {
        console.log("error : cache data", err);
        return res.status(500).json("Error occurred while fetching from DB");
      }
    }

    const searchQry: any[] =
      requestQuery?.name !== UNDEFINED ? [requestQuery.name] : [];

    const nameSearchQuery = {
      $or: [
        {
          "consumer.firstName": {
            $all: searchQry,
          },
        },
        {
          "consumer.lastName": {
            $all: searchQry,
          },
        },
        {
          "consumer.phone": {
            $all: searchQry,
          },
        },
      ],
    };

    const matchCondition =
      download !== "true"
        ? ticketId !== UNDEFINED
          ? {
              _id: new ObjectId(ticketId),
            }
          : searchQry.length > 0
          ? nameSearchQuery
          : filterFlag
          ? {}
          : modificationDateQuery
        : {};

    let tickets: any = await MongoService.collection(Collections.TICKET)
      .aggregate([
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
          $match: matchCondition,
        },
        {
          $match: filters,
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

        {
          $sort: {
            _id: -1,
          },
        },

        {
          $facet: {
            count: [{ $count: "totalCount" }],
            data: [{ $skip: skipCount }, { $limit: limitCount }],
          },
        },
      ])
      .toArray();

    for await (const ticket of tickets[0].data) {
      ticket.prescription[0].image = getMedia(ticket.prescription[0].image);
      if (ticket.prescription[0].service) {
        const presService = await getServiceById(
          ticket.prescription[0].service
        );
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
          _id: ticket.estimate[0].service[0]?._id,
        });
        ticket.estimate[0].service[0] = {
          ...ticket.estimate[0].service[0],
          ...service,
        };
        ticket.estimate[0].createdAt = getCreateDate(ticket.estimate[0]._id);
      }
    }

    return res.status(200).json({
      tickets: tickets[0]?.data,
      count: tickets[0]?.count[0]?.totalCount || 0,
    });
  }
);

// estimate
type iEstimateBody = Omit<iEstimate, "creator">;

export const createEstimateController = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    const estimateBody: iEstimateBody = req.body;

    if (req.body.icuType) {
      const icuTypeCheck = await getWardById(estimateBody.icuType);
      if (icuTypeCheck === null)
        throw new ErrorHandler("Invalid ICU Type", 400);
    }
    estimateBody.service.forEach(async (item) => {
      const service = await getServiceById(item.id);
      if (service === null) {
        return res.status(400).json({ message: "Invalid Service Id" });
      }
    });
    // const prescription = await getPrescriptionById(estimateBody.prescription);
    // if (prescription === null) {
    //   throw new ErrorHandler("Invalid Prescription", 400);
    // }
    // const consumer = await findConsumerById(prescription.consumer);
    const estimate = await createEstimate(
      { ...estimateBody, creator: new ObjectId(req.user!._id) },
      session
    );
    await generateEstimate(estimate._id, session); // creates and send estimate pdf

    const ticketData: iTicket | null = await findOneTicket(estimateBody.ticket);

    console.log("ticket data", estimateBody.ticket);

    if (ticketData !== null) {
      if (ticketData?.subStageCode.code < 2) {
        console.log("Im in estimation");
        const result = await updateSubStage(
          estimateBody.ticket,
          {
            active: true,
            code: 2,
          },
          session
        ); //update estimation substage
        
      }
    } else {
      throw new ErrorHandler("couldn't find ticket Id", 400);
    }
 const ticketData1: iTicket | null = await findOneTicket(estimateBody.ticket);
 console.log(ticketData1, "Estimation log is ");
    return res.status(200).json(estimate);
  }
);

export const GetTicketEstimates = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const estimates = await getTicketEstimates(
      new ObjectId(req.params.ticketId)
    );
    res.status(200).json(estimates);
  }
);

// note
export const CreateNote = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    const noteBody = {
      text: req.body.text,
      ticket: req.body.ticket,
      createdAt: Date.now(),
      creator: req.user!._id,
    };
    const note = await createNote(noteBody, session); //update estimation substage

    const ticketData: iTicket | null = await findOneTicket(noteBody.ticket);

    if (ticketData !== null) {
      if (
        ticketData?.subStageCode.code < 4 &&
        ticketData?.subStageCode.code > 2
      ) {
        await updateSubStage(
          noteBody.ticket,
          {
            active: true,
            code: 4,
          },
          session
        ); //update ticket substage
      }
    } else {
      throw new ErrorHandler("couldn't find ticket Id", 400);
    }
    res.status(200).json(note);
  }
);

export const updateTicketData = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    try {
      const stageCode: number = req.body.stageCode;
      console.log("stage code in update", stageCode);
      const stage = await findStageByCode(stageCode);
      console.log("SStage in update", stage.code);
      // const result = await updateTicket(
      //   req.body.ticket,
      //   {
      //     stage: stage._id!,
      //     subStageCode: req.body.subStageCode,
      //     modifiedDate: new Date(),
      //   },
      //   session
      // ); //update next ticket stage
      const result = await updateTicket(
        req.body.ticket,
        {
          stage: stage._id!,
          subStageCode: req.body.subStageCode,
          modifiedDate: new Date(),
        },
        session
      );
      const ticketData = await findTicketById(new ObjectId(req.body.ticket));
      // console.log("ticketData:",ticketData)
      if (!ticketData?.consumer) {
        throw new ErrorHandler("couldn't find ticket", 500);
      }
      const consumerData = await findOneConsumer(
        new ObjectId(ticketData.consumer)
      );

      if (!consumerData) {
        throw new ErrorHandler("couldn't find consumer", 500);
      }

      const whatsNumber = consumerData.phone;
      console.log(whatsNumber, "this is whats up number");

      // let webHookResult = null;
      // let Req: any = {};

      // if (stageCode<2 ) {
      //   console.log("entered")
      //   Req.body = {
      //     entry: [
      //       {
      //         changes: [
      //           {
      //             value: {
      //               contacts: [
      //                 {
      //                   wa_id: whatsNumber,
      //                 },
      //               ],
      //               messages: [
      //                 {
      //                   button: {
      //                     text: "reply",
      //                   },
      //                 },
      //               ],
      //             },
      //           },
      //         ],
      //       },
      //     ],
      //     stageCode,
      //   };

      //   webHookResult = await HandleWebhook(Req, res , next);

      //   console.log(webHookResult , " this is webhookresult");
      // }
      setTimeout(async () => {
        const serviceIDS: any = await findOnePrescription(
          ticketData.prescription
        );
        console.log(serviceIDS, " bdyufgdhw body of pre");
        console.log(serviceIDS?.service?.toString(), "this is id ");
        if (serviceIDS?.service?.toString() === "64d3512171bf84a64c1e6539") {
          if (stageCode === 2) {
            console.log("write message here");
            await herniaHowVideo(whatsNumber);
            await herniaHowText(whatsNumber);
          }
          if (stageCode === 3) {
            console.log("2  how are the 3rd stage ");
            await herniaRecoveryImage(whatsNumber);
            await herniaRecoveryText(whatsNumber);
          }
          if (stageCode === 4) {
            console.log("2  how are the 3rd stage ");
            await herniaUntreatedImage(whatsNumber);
            await herniaUntreatedText(whatsNumber);
          }
        } else if (
          serviceIDS?.service?.toString() === "64d3516871bf84a64c1e653a"
        ) {
          if (stageCode === 2) {
            console.log("write message here");
            await hysterectomyHowVideo(whatsNumber);
            await hysterectomyHowText(whatsNumber);
          }
          if (stageCode === 3) {
            console.log("2  how are the 3rd stage ");
            await hysterectomyRecoveryText(whatsNumber);
            await hysterectomyRecoveryImage(whatsNumber);
          }
          if (stageCode === 4) {
            console.log("2  how are the 3rd stage ");
            await hysterectomyUntreatedImage(whatsNumber);
            await hysterectomyUntreatedText(whatsNumber);
          }
        } else if (
          serviceIDS?.service?.toString() === "64d3518171bf84a64c1e653b"
        ) {
          if (stageCode === 2) {
            console.log("write message here");
            await cabgHowImage(whatsNumber);
            await cabgHowText(whatsNumber);
          }
          if (stageCode === 3) {
            console.log("2  how are the 3rd stage ");
            await cabgRecoveryText(whatsNumber);
            await cabgRecoveryImage(whatsNumber);
          }
          if (stageCode === 4) {
            console.log("2  how are the 3rd stage ");
            await cabgUntreatedImage(whatsNumber);
            await cabgUntreatedText(whatsNumber);
          }
        }
      }, 3000);

      res.status(200).json({ result: `Stage updated to ${stage.name}!` });
    } catch (e) {
      res.status(500).json({ status: 500, error: e });
    }
  }
);

export const updateTicketSubStageCode = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    try {
      let ticketId = req.body?.ticket;
      ticketId = new ObjectId(ticketId);
      const subStageCode = req.body?.subStageCode;
      const result = await updateSubStage(ticketId, subStageCode, session);
      res.status(200).json({ message: `SubStage updated!`, result });
    } catch (e) {
      res.status(500).json({ status: 500, error: e });
    }
  }
);

export const GetTicketNotes = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const notes = await getTicketNotes(new ObjectId(req.params.ticketId));
    res.status(200).json(notes);
  }
);

// estimate upload and send
export const EstimateUploadAndSend = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const file = req.file;
    const ticketId = req.params.ticketId;
    const ticket = await findTicketById(new ObjectId(ticketId));
    if (!ticket) throw new ErrorHandler("Ticket Not Found", 404);
    const consumer = await findConsumerById(ticket.consumer);
    if (!consumer) throw new ErrorHandler("No Consumer Found.", 404);
    if (!file) throw new ErrorHandler("No Estimate File Found.", 404);
    const { Location } = await putMedia(
      file,
      `patients/${ticket.consumer}/${ticket._id}/estimates`,
      process.env.PUBLIC_BUCKET_NAME
    );
    await sendMessage(consumer!.phone, {
      type: "document",
      document: {
        link: Location,
        filename: "Estimate",
      },
    });

    // await sendTemplateMessage(consumer!.phone, "estimate", "en-us", whatsappEstimatePayload(Location));
    return res.sendStatus(200);
  }
);

function capitalizeFirstLetter(part: string): any {
  throw new Error("Function not implemented.");
}

function capitalizeName(name: any): any {
  throw new Error("Function not implemented.");
}

export const createPatientStatus = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    const requsetBody = req.body;
    let imageKey: string | null = null;
    if (req.file) {
      const { Key } = await putMedia(
        req.file,
        `patients/${requsetBody.consumer}/patientStatus`
      );
      imageKey = Key;
    }
    const payload = {
      parentTicketId: requsetBody.ticket,
      consumer: requsetBody?.consumer,
      note: requsetBody?.note || "",
      dropReason: requsetBody?.dropReason || "",
      paymentRefId: requsetBody?.paymentRefId || "",
      image: imageKey,
    };
    const result = await insertPatientStatusDetail(payload, session);
    res.status(200).json({ result, status: "Success" });
  }
);

export const skipResult = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    const resultData = {
      text: req.body.text,
      ticket: req.body.ticket,
      createdAt: Date.now(),
      creator: req.user!._id,
    };
    const result = await createResult(resultData, session);
  }
);
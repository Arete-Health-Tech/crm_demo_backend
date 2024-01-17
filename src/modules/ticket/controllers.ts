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
 
  sendStageChangeMessageMedia,
  sendStageChangeMessageText,
  sendTemplateMessage,
  sendTemplateMessageWon,
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
  findMeassage,
  sendTextMessage,
  startTemplateFlow,
} from "../flow/functions";
import {
  findGroupIdsForMember,
  getSortedLeadCountRepresentatives,
  loginRepresentativeHandler,
} from "../representative/functions";
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
  TICKET_DB,
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
  getFlowData,
  updateSubStage2,
} from "./functions";

import { CONSUMER } from "../../types/consumer/consumer";
import { HandleWebhook } from "../flow/controller";
import { IO, redisClient } from "../../server";
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
import { REFETCH_TICKETS } from "../../utils/socket/constants";
import { getAllRepresentative } from "../representative/controllers";
import { findRepresentative, REPRESENTATIVE_DB } from "../representative/crud";
import { REPRESENTATIVE } from "../../types/representative/representative";
import isLoggedIn from "../../middleware/authorization/isLoggedIn";
import { link } from "pdfkit";
import { createReplyPayload } from "../flow/utils";
// import JWT from "jsonwebtoken";

type ticketBody = iTicket & iPrescription;
type tickeFollow = ifollowUp & iPrescription & iTicket & CONSUMER;

export const UNDEFINED = "undefined";

const lastAssignedRepIndexMap: Record<string, number> = {};
export const createTicket = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    // first
    // const { accessSecret } = process.env;
    // const auth = req.headers["authorization"] as string;
    // if (!auth) return next(new ErrorHandler("Unauthorized", 401));
    // const token = auth?.split(" ")[1];
    // const user = <Record<string, any>>JWT.verify(token, accessSecret!);
    // req.user = user;

    if (!req.file) {
      throw new ErrorHandler("Prescription image not found", 400);
    }
    const ticket: ticketBody = req.body;
    // console.log(ticket , "this is first ticket ");

    const consumer = await findConsumerById(ticket.consumer);
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
        isPharmacy: ticket.isPharmacy,

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
      // group id
      const memberIdToCheck = departments[0];
      const groupId = await findGroupIdsForMember(memberIdToCheck);
      const groupId2 = groupId[0] as unknown as string;
      // console.log(groupId , "this is groupid");
      // console.log(groupId2 , "this is groupid2");
      if (!lastAssignedRepIndexMap[groupId2]) {
        lastAssignedRepIndexMap[groupId2] = 0;
      }
      // Round-robin logic within the group
      // Get the next representative within the group
      let representatives2 = await MongoService.collection(REPRESENTATIVE_DB)
        .find({ group: groupId2, logged: 1 })
        .toArray();
      console.log(representatives2, "this is representatives2");
      let nextRepIndex2 = lastAssignedRepIndexMap[groupId2];
      console.log(nextRepIndex2, "this is nextRepIndex2");
      let nextRepresentative2 = representatives2[nextRepIndex2];
      console.log(nextRepresentative2, " this is nextRepresentative2");

      if (representatives2.length === 0) {
        // If no logged representatives, proceed with existing round-robin logic
        representatives2 = await MongoService.collection(REPRESENTATIVE_DB)
          .find({ group: groupId2 })
          .toArray();
        console.log(representatives2, "this is inside representatives2.length");
        nextRepIndex2 = lastAssignedRepIndexMap[groupId2];
        console.log(nextRepIndex2, "this is inside representatives2.length");
        nextRepresentative2 = representatives2[nextRepIndex2];
        console.log(
          nextRepresentative2,
          "this is inside representatives2.length"
        );
      }

      const { status, body } = await createTicketHandler(
        {
          consumer: ticket.consumer,
          prescription: _id,
          creator: new ObjectId(req.user!._id),
          assigned: nextRepresentative2._id,
          stage: stage._id!,
          date: new Date(),
          subStageCode: {
            active: !!engagementConfirm,
            code: 1,
          },
          logged: false,
          group: new ObjectId(groupId2),
          modifiedDate: null,
          department: null,
        },
        session
      );
      lastAssignedRepIndexMap[groupId2] =
        (lastAssignedRepIndexMap[groupId2] + 1) % representatives2.length;
      console.log(lastAssignedRepIndexMap, "this is lastAssignedRepIndexMap");

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
    console.log(requestQuery, " this is request query ");
    console.log(requestQuery.phonev, "this is number");
    const phone = parseInt(requestQuery.phonev);
    console.log(phone, " this is numbe");
    const download = requestQuery.downloadAll;
    const pageNum: any = parseInt(requestQuery?.page) || 1;
    const skipCount = download !== "true" ? (parseInt(pageNum) - 1) * 10 : 0;
    const limitCount = download !== "true" ? 10 : Math.pow(10, 10);
    const stageList = requestQuery.stageList
      ? requestQuery?.stageList
          ?.split(",")
          .map((id: string) => new ObjectId(id))
      : [];
    const rep = await MongoService.collection(REPRESENTATIVE_DB).findOne({
      phone: phone,
    });
    console.log(rep, " india");
    const admin = rep?.role;
    console.log(admin, " this is admin");
    const TBH = rep?._id;
    console.log(TBH, " THB");
    const representative = requestQuery?.representative;
    // if (rep && rep.departement) {
    //   const ticketIdToUpdate = "your_ticket_id"; // Replace with the actual ticket ID you want to update
    //   await MongoService.collection(TICKET_DB).updateOne(
    //     { _id: ticketIdToUpdate },
    //     {
    //       $set: {
    //         representative: {
    //           _id: rep._id,
    //           departement: rep.departement
    //         }
    //       }
    //     }
    //   );

    //   console.log("Ticket updated with representative information.");
    // } else {
    //   console.log("Rep does not have a department or does not exist.");
    // }
    if (admin === "ADMIN" || admin === "MANAGER" || admin === "LEADER") {
      console.log("come inside leader");
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

      if (
        requestQuery.name === UNDEFINED &&
        !filterFlag &&
        download !== "true"
      ) {
        // let tempTicketcache = null;
        if (ticketId !== UNDEFINED && fetchUpdated !== "true") {
          // if (fetchUpdated === "true") {
          //   console.log("cache updating...")
          //   //HERE TICKET WILL UPDATED IN CACHE IF MONGODB DATA HAS CHANGED
          //   tempTicketcache = await RedisUpdateSingleTicketLookUp(ticketId);
          // } else {

          const result = await createTicketLookUps(ticketId);
          return res.json(result);
          //}
        }
        try {
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

            await (
              await redisClient
            ).SET(TICKET_CACHE_OBJECT, finalTicketCaches);

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
            } // tempTicketcache === null ? JSON.parse(data) : tempTicketcache;
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
        tickets: tickets[0].data,
        count: tickets[0]?.count[0]?.totalCount || 0,
      });
    } else if (admin === "TEAMLEADER") {
      console.log("come inside teamleader");
      const group = rep?.group;
      console.log(group, " this is group");
      const alltickets = await MongoService.collection(Collections.TICKET)
        .find({ group: group })
        .toArray();
      const lastTicket = alltickets[alltickets.length - 1];
      console.log(lastTicket, " this is last ticket ");

      const filterAssigned = lastTicket.assigned.toString();
      console.log(filterAssigned, " this is filterassigned");

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

      if (
        requestQuery.name === UNDEFINED &&
        !filterFlag &&
        download !== "true"
      ) {
        // let tempTicketcache = null;
        if (ticketId !== UNDEFINED && fetchUpdated !== "true") {
          // if (fetchUpdated === "true") {
          //   console.log("cache updating...")
          //   //HERE TICKET WILL UPDATED IN CACHE IF MONGODB DATA HAS CHANGED
          //   tempTicketcache = await RedisUpdateSingleTicketLookUp(ticketId);
          // } else {
          const result = await createTicketLookUps(ticketId);
          return res.json(result);
          //}
        }
        try {
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

            await (
              await redisClient
            ).SET(TICKET_CACHE_OBJECT, finalTicketCaches);

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
            //  const appapa = await createsortedData(filterAssigned);
            // const lalala = appapa.tickets.length;
            // console.log(lalala , " kya hai  yeah ");

            if (fetchUpdated === "true") {
              ticketObjCache = await pushToUpdatedTicketTop(
                fetchUpdated,
                ticketId,
                ticketObjCache
              );
            } // tempTicketcache === null ? JSON.parse(data) : tempTicketcache;
            const listOfTicketsObj1 = Object.values(ticketObjCache);
            const listOfTicketsObj = listOfTicketsObj1.filter(
              (ticket: any) => ticket.assigned === filterAssigned
            );
            //  console.log(listOfTicketsObj , "listOfTicketsObj.length");
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
            return res.status(200).json(ticketsResultJson);
          }
        } catch (err: any) {
          console.log("error : cache data", err);
          return res.status(500).json("Error occurred while fetching from DB");
        }
      }

      const searchQry: any[] =
        requestQuery?.name !== UNDEFINED ? [requestQuery.name] : [];
      console.log(filterAssigned, " this is Something 3  ");
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

      const matchAssigned = {
        $match: {
          assigned: filterAssigned, // Convert filterAssigned to ObjectId
        },
      };
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
          matchAssigned,
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
        tickets: tickets[0].data,
        count: tickets[0]?.count[0]?.totalCount || 0,
      });
    } else {
      console.log("come inside representative");
      const alltickets = await MongoService.collection(Collections.TICKET)
        .find({ assigned: TBH })
        .toArray();
      const lastTicket = alltickets[alltickets.length - 1];

      const filterAssigned = lastTicket.assigned.toString();

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

      if (
        requestQuery.name === UNDEFINED &&
        !filterFlag &&
        download !== "true"
      ) {
        // let tempTicketcache = null;
        if (ticketId !== UNDEFINED && fetchUpdated !== "true") {
          // if (fetchUpdated === "true") {
          //   console.log("cache updating...")
          //   //HERE TICKET WILL UPDATED IN CACHE IF MONGODB DATA HAS CHANGED
          //   tempTicketcache = await RedisUpdateSingleTicketLookUp(ticketId);
          // } else {
          const result = await createTicketLookUps(ticketId);
          return res.json(result);
          //}
        }
        try {
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

            await (
              await redisClient
            ).SET(TICKET_CACHE_OBJECT, finalTicketCaches);

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
            //  const appapa = await createsortedData(filterAssigned);
            // const lalala = appapa.tickets.length;
            // console.log(lalala , " kya hai  yeah ");

            if (fetchUpdated === "true") {
              ticketObjCache = await pushToUpdatedTicketTop(
                fetchUpdated,
                ticketId,
                ticketObjCache
              );
            } // tempTicketcache === null ? JSON.parse(data) : tempTicketcache;
            const listOfTicketsObj1 = Object.values(ticketObjCache);
            const listOfTicketsObj = listOfTicketsObj1.filter(
              (ticket: any) => ticket.assigned === filterAssigned
            );
            //  console.log(listOfTicketsObj , "listOfTicketsObj.length");
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
            return res.status(200).json(ticketsResultJson);
          }
        } catch (err: any) {
          console.log("error : cache data", err);
          return res.status(500).json("Error occurred while fetching from DB");
        }
      }

      const searchQry: any[] =
        requestQuery?.name !== UNDEFINED ? [requestQuery.name] : [];
      console.log(filterAssigned, " this is Something 3  ");
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

      const matchAssigned = {
        $match: {
          assigned: filterAssigned, // Convert filterAssigned to ObjectId
        },
      };
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
          matchAssigned,
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
        tickets: tickets[0].data,
        count: tickets[0]?.count[0]?.totalCount || 0,
      });
    }
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
    const ticketData1: iTicket | null = await findOneTicket(
      estimateBody.ticket
    );
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

// export const updateTicketData = PromiseWrapper(
//   async (
//     req: Request,
//     res: Response,
//     next: NextFunction,
//     session: ClientSession
//   ) => {
//     try {
//       const stageCode: number = req.body.stageCode;
//       console.log("stage code in update", stageCode);
//       const stage = await findStageByCode(stageCode);
//       console.log("SStage in update", stage.code);
//       // const result = await updateTicket(
//       //   req.body.ticket,
//       //   {
//       //     stage: stage._id!,
//       //     subStageCode: req.body.subStageCode,
//       //     modifiedDate: new Date(),
//       //   },
//       //   session
//       // ); //update next ticket stage
//       const result = await updateTicket(
//         req.body.ticket,
//         {
//           stage: stage._id!,
//           subStageCode: req.body.subStageCode,
//           modifiedDate: new Date(),
//         },
//         session
//       );
//       const ticketData = await findTicketById(new ObjectId(req.body.ticket));
//       // console.log("ticketData:",ticketData)
//       if (!ticketData?.consumer) {
//         throw new ErrorHandler("couldn't find ticket", 500);
//       }
//       const consumerData = await findOneConsumer(
//         new ObjectId(ticketData.consumer)
//       );

//       if (!consumerData) {
//         throw new ErrorHandler("couldn't find consumer", 500);
//       }

//       const whatsNumber = consumerData.phone;
//       console.log(whatsNumber, "this is whats up number");

//       // let webHookResult = null;
//       // let Req: any = {};

//       // if (stageCode === 2 ) {
//       //   console.log("entered")
//       //   Req.body = {
//       //     entry: [
//       //       {
//       //         changes: [
//       //           {
//       //             value: {
//       //               contacts: [
//       //                 {
//       //                   wa_id: whatsNumber,
//       //                 },
//       //               ],
//       //               messages: [
//       //                 {
//       //                   button: {
//       //                     text: "reply",
//       //                   },
//       //                 },
//       //               ],
//       //             },
//       //           },
//       //         ],
//       //       },
//       //     ],
//       //     stageCode,
//       //   };

//       //   webHookResult = await HandleWebhook(Req, res , next);

//       //   console.log(webHookResult , " this is webhookresult");
//       // }
//       setTimeout(async () => {
//         const serviceIDS: any = await findOnePrescription(
//           ticketData.prescription
//         );

//         console.log(serviceIDS, " bdyufgdhw body of pre");
//         console.log(serviceIDS?.service?.toString(), "this is id ");

//         const flowID = serviceIDS?.service?.toString();
//         const flowResult = await getFlowData(flowID);
//         console.log(flowResult, "flowResult");
//         const link = flowResult?.vedio;
//         const links = flowResult?.text;

//         if (flowID) {
//           if (stageCode === 2) {
//             console.log("hii");
//             console.log("write message here");
//             await herniaHowVideo(whatsNumber);
//             await herniaHowText(whatsNumber);
//           }
//           if (stageCode === 3) {
//             console.log("2  how are the 3rd stage ");
//             await herniaRecoveryImage(whatsNumber);
//             await herniaRecoveryText(whatsNumber);
//           }
//           if (stageCode === 4) {
//             console.log("2  how are the 3rd stage ");
//             await herniaUntreatedImage(whatsNumber);
//             await herniaUntreatedText(whatsNumber);
//           }
//         }
//       }, 3000);

//       res.status(200).json({ result: `Stage updated to ${stage.name}!` });
//     } catch (e) {
//       res.status(500).json({ status: 500, error: e });
//     }
//   }
// );

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
      console.log(req.body, "data in request");
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

const service = ticketData.prescription ;
              console.log(service , " this is service");

              const msgId = await findOnePrescription(service);
              const oneService : string | undefined= msgId?.service?.toString();
              console.log(oneService , "oneService i sthe oneService in the nont")
              // if (stageCode === 2 && oneService !== undefined) {
              //   const messageFind : any= await findMeassage(oneService);

              //   console.log(messageFind , " this is messageFind")
               
                  //  const replyPayload = createReplyPayload(messageFind);
                  //  console.log(replyPayload, "this is a reply payload");
                  //  await sendMessage(whatsNumber, replyPayload);
                   setTimeout(async () => {
                     const serviceIDS: any = await findOnePrescription(
                       ticketData.prescription
                     );
                     console.log(serviceIDS, " bdyufgdhw body of pre");
                     console.log(
                       serviceIDS?.service?.toString(),
                       "this is id "
                     );
                     if (
                       serviceIDS?.service?.toString() ===
                       "657a83447701108642bbe470"
                     ) {
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
                       serviceIDS?.service?.toString() ===
                       "657a83057701108642bbe46f"
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
                       serviceIDS?.service?.toString() ===
                       "657a83787701108642bbe471"
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
                 
                
//                  const headreeLink = messageFind.headerLink ;
//                  const message = messageFind?.body
//                  console.log(headreeLink,"this is header link ");
//                  const newData = JSON.stringify(message);
// console.log(message, "this is body");
// // await sendStageChangeMessageText(whatsNumber, message);
// // await sendStageChangeMessageMedia(whatsNumber, headreeLink);
// const newMera= sendStageChangeMessageInteractive(whatsNumber);
// await sendMessage(whatsNumber, newMera);
              // }
              // }
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


const BUCKET_NAME = process.env.PUBLIC_BUCKET_NAME;

export const createPatientStatus = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    try {
      const requestBody = req.body;
      let imageKey: string | null = null;
      let consumerId = requestBody.consumer.split("/")[0]; // Extracting consumer ID
      const sendid = new ObjectId(consumerId);
      const consumer = await findConsumerById(sendid);
      const sender = consumer?.phone;
      const receive = sender?.toString();
      console.log(sender);

      if (req.file) {
        const { Key } = await putMedia(
          req.file,
          `patients/${requestBody.consumer}/${requestBody.ticket}/patientStatus`,
          BUCKET_NAME
        );
        imageKey = `https://${BUCKET_NAME}.s3.ap-south-1.amazonaws.com/${Key}`;
        console.log(imageKey, "image key is after");
      }

      const payload = {
        parentTicketId: requestBody.ticket,
        consumer: requestBody.consumer,
        note: requestBody.note || "",
        dropReason: requestBody.dropReason || "",
        paymentRefId: requestBody.paymentRefId || "",
        image: imageKey,
      };

      // if (receive !== undefined && consumer !== null) {
      //   const components = [
      //     {
      //       type: "body",
      //       parameters: [
      //         {
      //           type: "text",
      //           text:
      //             consumer.firstName.toUpperCase() +
      //             " " +
      //             (consumer.lastName ? consumer.lastName.toUpperCase() : ""),
      //         },
      //       ],
      //     },
      //   ];

      //   // Function to send templates with a 2-minute delay
      //   const sendTemplatesWithDelay = async () => {
      //     await startTemplateFlow(
      //       "admission",
      //       "en",
      //       consumer.phone,
      //       components
      //     );

      //     const delay = async (ms: number) => {
      //       return new Promise<void>((resolve) => {
      //         setTimeout(() => {
      //           resolve();
      //         }, ms);
      //       });
      //     };

      //     await delay(20000); // 20-sec delay
      //     await startTemplateFlow(
      //       "admission_two",
      //       "en",
      //       consumer.phone,
      //       components
      //     );
      //     await delay(20000); // 20-sec delay
      //     await startTemplateFlow(
      //       "admission_2_hours",
      //       "en",
      //       consumer.phone,
      //       components
      //     );
      //     await delay(20000); // 2-minute delay
      //     await startTemplateFlow(
      //       "admission_one_day",
      //       "en",
      //       consumer.phone,
      //       components
      //     );
      //     await delay(20000);
      //     await startTemplateFlow(
      //       "admission_morning",
      //       "en",
      //       consumer.phone,
      //       components
      //     );
      //     await delay(20000);
      //     await startTemplateFlow(
      //       "admission_one_hour",
      //       "en",
      //       consumer.phone,
      //       components
      //     );
      //     await delay(20000);// Add more delays and template calls as needed
      //   };

      //   sendTemplatesWithDelay();
      // }

      const result = await insertPatientStatusDetail(payload, session);

      res.status(200).json({ result, status: "Success" });
    } catch (error) {
      console.error("Error in createPatientStatus:", error);
      res.status(500).json({ status: 500, error: "Internal Server Error" });
    }
  }
);


export const skipEstimate = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // ... (existing code)
      const ticketId = req.body?.ticketID;
      console.log("Request body:", ticketId);

      // Ensure `ticketId` is converted to an ObjectId
      const ticketId2 = new ObjectId(ticketId);
      console.log("Ticket ID as ObjectId:", ticketId2);

      // Retrieve ticket data
      const ticketData: iTicket | null = await findOneTicket(ticketId2);
      console.log("Ticket data:", ticketData);

      if (ticketData !== null) {
        if (ticketData.subStageCode.code < 2) {
          console.log("Updating substage...");
          const updateResult = await updateSubStage2(ticketId2, {
            active: true,
            code: 2,
          });
          console.log("Update result:", updateResult);
        }
        console.log("SubStageCode after update:", ticketData.subStageCode);
      } else {
        throw new ErrorHandler("Couldn't find ticket data", 400);
      }

      // Sending a response with a success message
      res.status(200).json({ message: "Substage updated successfully" });
    } catch (e: any) {
      console.error("Error in skipEstimate:", e);
      res
        .status(500)
        .json({ status: 500, error: e.message || "Internal Server Error" });
    }
  }
);

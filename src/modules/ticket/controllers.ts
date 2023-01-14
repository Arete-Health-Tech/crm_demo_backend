import { NextFunction, Request, Response } from "express";
import { ClientSession, Collection, ObjectId } from "mongodb";
import PromiseWrapper from "../../middleware/promiseWrapper";
import { getMedia, putMedia } from "../../services/aws/s3";
import { iEstimate, iPrescription, iTicket } from "../../types/ticket/ticket";
import ErrorHandler from "../../utils/errorHandler";
import MongoService, { Collections } from "../../utils/mongo";
import { findConsumer } from "../consumer/crud";
import { findConsumerById } from "../consumer/functions";
import { findDoctorById, getDepartmentById, getWardById } from "../department/functions";
import { findFlowConnectorByService, startTemplateFlow } from "../flow/functions";
import { getSortedLeadCountRepresentatives } from "../representative/functions";
import { getServiceById } from "../service/functions";
import { findStageByCode } from "../stages/functions";
import { createOnePrescription, findPrescription, findPrescriptionById, findTicket } from "./crud";
import generateEstimate from "./estimate/createEstimate";
import {
  createEstimate,
  createNote,
  createTicketHandler,
  getAllTicketHandler,
  getConsumerPrescriptions,
  getConsumerTickets,
  getPrescriptionById,
  getTicketEstimates,
  getTicketNotes,
  searchService,
} from "./functions";

type ticketBody = iTicket & iPrescription;

export const createTicket = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction, session: ClientSession) => {
    if (!req.file) {
      throw new ErrorHandler("Prescription image not found", 400);
    }
    const ticket: ticketBody = req.body;

    const consumer = await findConsumerById(ticket.consumer);
    if (consumer === null) {
      throw new ErrorHandler("consumer doesn't exist", 404);
    }
    const departments: string[] = JSON.parse(req.body.departments);
    departments.forEach((item) => {
      getDepartmentById(new ObjectId(item)).then((dept) => {
        if (dept === null) {
          throw new ErrorHandler("Invalid department passed", 400);
        }
      });
    });

    const doctor = await findDoctorById(ticket.doctor);
    if (doctor === null) {
      throw new ErrorHandler("Invalid doctor id passed", 400);
    }
    const { Key } = await putMedia(req.file, `patients/${ticket.consumer}/prescription`);
    //create prescription
    const { _id } = await createOnePrescription(
      {
        admission: ticket.admission,
        condition: ticket.condition,
        consumer: ticket.consumer,
        departments: JSON.parse(req.body.departments).map((item: string) => new ObjectId(item)),
        diagnostics: ticket.diagnostics ? (JSON.parse(req.body.diagnostics) as string[]) : null,
        medicines: ticket.medicines ? JSON.parse(req.body.medicines) : null,
        doctor: ticket.doctor,
        followUp: ticket.followUp,
        image: Key,
        symptoms: ticket.symptoms,
      },
      session
    );
    // finally create ticket
    if (!_id) {
      new ErrorHandler("failed to create prescription", 400);
    } else {
      const stage = await findStageByCode(0);
      const representatives = await getSortedLeadCountRepresentatives();
      const { status, body } = await createTicketHandler({
        consumer: ticket.consumer,
        prescription: _id,
        creator: new ObjectId(req.user!._id),
        assigned: representatives[0]._id,
        stage: stage._id!,
      });
      return res.status(status).json(body);
    }
  }
);

export const getAllTicket = PromiseWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const tickets = await getAllTicketHandler();
  return res.status(200).json(tickets);
});

export const search = PromiseWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const { search, departmentType } = <{ search: string; departmentType: string }>req.query;
  const { status, body } = await searchService(search, departmentType);
  return res.status(status).json(body);
});

export const ticketsWithPrescription = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const tickets = await getConsumerTickets(new ObjectId(req.params.consumerId));
    const prescriptions = await getConsumerPrescriptions(new ObjectId(req.params.consumerId));
    // mapping tickets with prescription
    const consumerTicketsWithPrescription: any = [];
    prescriptions.forEach((pres) => {
      const prescriptionTicket = tickets.find(
        (item) => item.prescription.toString() === pres._id?.toString()
      );
      if (prescriptionTicket) {
        consumerTicketsWithPrescription.push({ ...prescriptionTicket, prescription: pres });
      }
    });
    return res.status(200).json(consumerTicketsWithPrescription);
  }
);

export const getRepresentativeTickets = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    // const tickets = await findTicket({ creator: new ObjectId(req.user!._id) });
    const tickets = await MongoService.collection(Collections.TICKET)
      .aggregate([
        {
          $lookup: {
            from: Collections.CONSUMER,
            localField: "consumer",
            foreignField: "_id",
            let: { consumer: "$consumer" },
            pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$consumer"] } } }, { $limit: 1 }],
            as: "consumer",
          },
        },
        {
          $lookup: {
            from: Collections.PRESCRIPTION,
            localField: "prescription",
            let: { prescription: "$prescription" },
            pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$prescription"] } } }, { $limit: 1 }],
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
      ])
      .toArray();
    tickets.forEach((ticket) => {
      ticket.prescription[0].image = getMedia(ticket.prescription[0].image);
    });
    return res.status(200).json(tickets);
  }
);

// estimate
type iEstimateBody = Omit<iEstimate, "creator">;

export const createEstimateController = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction, session: ClientSession) => {
    const estimateBody: iEstimateBody = req.body;
    if (req.body.icuType) {
      const icuTypeCheck = await getWardById(estimateBody.icuType);
      if (icuTypeCheck === null) throw new ErrorHandler("Invalid ICU Type", 400);
    }
    estimateBody.service.forEach(async (item) => {
      const service = await getServiceById(item.id);
      if (service === null) {
        return res.status(400).json({ message: "Invalid Service Id" });
      }
    });
    const prescription = await getPrescriptionById(estimateBody.prescription);
    if (prescription === null) {
      throw new ErrorHandler("Invalid Prescription", 400);
    }
    const consumer = await findConsumerById(prescription.consumer);
    const estimate = await createEstimate({ ...estimateBody, creator: new ObjectId(req.user!._id) }, session);
    // console.log(estimate);
    // await generateEstimate(estimate._id); // creates and send estimate pdf

    const flowConnect = await findFlowConnectorByService(estimateBody.service[0].id); // start flow associated with this service
    if (flowConnect !== null && consumer !== null) {
      await startTemplateFlow(flowConnect.templateName, flowConnect.templateLanguage, consumer.phone);
    }
    return res.status(200).json(estimate);
  }
);

export const GetTicketEstimates = PromiseWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const estimates = await getTicketEstimates(new ObjectId(req.params.ticketId));
  res.status(200).json(estimates);
});

// note
export const CreateNote = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction, session: ClientSession) => {
    const note = await createNote(
      {
        text: req.body.text,
        ticket: req.body.ticket,
        createdAt: Date.now(),
        creator: req.user!._id,
      },
      session
    );
    res.status(200).json(note);
  }
);

export const GetTicketNotes = PromiseWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const notes = await getTicketNotes(new ObjectId(req.params.ticketId));
  res.status(200).json(notes);
});

import { ClientSession, Collection, ObjectId, WithId } from "mongodb";
import { CONSUMER } from "../../types/consumer/consumer";
import { iService } from "../../types/service/service";
import { ifollowUp, iPrescription, iTicket } from "../../types/ticket/ticket";
import MongoService, { Collections } from "../../utils/mongo";
import getDatabase from "../../utils/mongo";
export const FOLLOWUP = "followUp";

export const TICKET_DB = "ticket";
export const PRESCRIPTION_DB = "prescription";
export const PATIENTSTATUS_DB = "patientStatus"

const createSearchIndex = async () => {
  await MongoService.collection(TICKET_DB).createIndex({
    serviceId: "text",
    name: "text",
    department: "text",
    departmentType: "text",
  });
};

// createSearchIndex();

const createUniqueServiceIndex = async () => {
  await MongoService.collection(TICKET_DB).createIndex(
    { serviceId: 1 },
    { unique: true }
  );
};

// createUniqueServiceIndex();

// service
export const createManyServices = async (services: iTicket[]): Promise<any> => {
  await MongoService.collection(TICKET_DB).insertMany(services);
  return services;
};

export const findOneService = async (query: Object): Promise<CONSUMER> => {
  const consumer = await MongoService.collection(TICKET_DB).findOne(query);
  return consumer as CONSUMER;
};

export const findServices = async (query: Object) => {
  return await MongoService.collection(Collections.SERVICE)
    .find<iService>(query)
    .toArray();
};

// ticket
export const createOneTicket = async (
  ticket: iTicket,
  session: ClientSession
): Promise<iTicket> => {
  await MongoService.collection(TICKET_DB).insertOne(ticket, { session });
  return ticket;
};

export const findTicket = async (query: object): Promise<iTicket[]> => {
  return await MongoService.collection(TICKET_DB)
    .find<iTicket>(query)
    .toArray();
};

export const findTicketById = async (ticketId: ObjectId) => {
  return await MongoService.collection(Collections.TICKET).findOne<iTicket>({
    _id: ticketId,
  });
};

//prescription
export const createOnePrescription = async (
  prescription: iPrescription,
  session: ClientSession
) => {
  await MongoService.collection(PRESCRIPTION_DB).insertOne(prescription, {
    session,
  });
  return prescription;
};

export const findPrescriptionById = async (prescriptionId: ObjectId) => {
  return await MongoService.collection(
    Collections.PRESCRIPTION
  ).findOne<iPrescription>({
    _id: prescriptionId,
  });
};

export const findPrescription = async (query: any) => {
  return await MongoService.collection(Collections.PRESCRIPTION)
    .find<iPrescription>(query)
    .toArray();
};

export const createOneFollowUp = async (followUp: ifollowUp) => {
  await MongoService.collection(FOLLOWUP).insertOne(followUp);
  return followUp;
};

export const insertPatientStatusDetail = async (
  statusDetail: any,
  session: ClientSession
) => {
  await MongoService.collection(PATIENTSTATUS_DB).insertOne(statusDetail, {
    session,
  });
  return statusDetail;
};

export const findOnePrescription = async (query: any) => {
  return await MongoService.collection(
    Collections.PRESCRIPTION
  ).findOne<iPrescription>(query);
};
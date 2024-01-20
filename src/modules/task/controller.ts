import { NextFunction, Request, Response } from "express";
import { ClientSession, ObjectId } from "mongodb";
import PromiseWrapper from "../../middleware/promiseWrapper";
import { iReminder, iRescheduler, iTodo } from "../../types/task/task";
import ErrorHandler from "../../utils/errorHandler";
import { findTicketById } from "../ticket/crud";
import {
  createReminder,
  createRescheduler,
  createTodo,
  findCreatorReminders,
  findCreatorRescheduler,
  findCreatorTodo,
  findTicketReminders,
  findTicketRescheduler,
  findTicketTodo,
  findTodoById,
  remainderTicket,
  rescheduleTicket,
  updateTodoStatus,
} from "./functions";
import { findRepresentative } from "../representative/crud";

export const CreateReminder = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction, session: ClientSession) => {
    if (req.body.date < Date.now()) throw new ErrorHandler("Invalid Schedule Time", 400);
    console.log(req.body.ticket)
    const ticket = await findTicketById(req.body.ticket);
    if (ticket === null) throw new ErrorHandler("No Ticket Found", 404);
    console.log(req.user," this is user")
    console.log(req.body.user , " terin maaa ki chut")
    const reminderPayload: iReminder = { ...req.body};
  
    const id = ticket.assigned;
    const stop = await findRepresentative(id);
    const mobile: any = stop?.phone;
    const reminder = await createReminder(reminderPayload, session, mobile);
    res.status(200).json(reminder);
  }
);

export const GetReminder = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction, session: ClientSession) => {
    console.log(req.user!._id, "req.user!._id)");
    const reminders = await findCreatorReminders(new ObjectId(req.user!._id));
    res.status(200).json(reminders);
  }
);

export const GetTicketReminders = PromiseWrapper(async (req: Request, res: Response, next: NextFunction) => {
  // const ticket = await findTicketById(new ObjectId(req.params.ticketId));
  // if (ticket === null) throw new ErrorHandler("No Ticket Found", 400);
  const currentUnixTimestamp = Math.floor(Date.now());
  console.log(req.params.ticketId, "req.params.ticketId");
  const reminders = await findTicketReminders(new ObjectId(req.params.ticketId), currentUnixTimestamp);
 
  res.status(200).json(reminders);
});

// todo

export const CreateTodo = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction, session: ClientSession) => {
    if (req.body.date < Date.now()) throw new ErrorHandler("Invalid Due Date", 400);
    const ticket = await findTicketById(req.body.ticket);
    if (ticket === null) throw new ErrorHandler("No Ticket Found", 400);
    const todoPayload: iTodo = { ...req.body, creator: new ObjectId(req.user!._id), status: false };
    const todo = await createTodo(todoPayload, session);
    res.status(200).json(todo);
  }
);

export const GetCreatorTodo = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction, session: ClientSession) => {
    const todo = await findCreatorTodo(new ObjectId(req.user!._id));
    res.status(200).json(todo);
  }
);

export const GetTicketTodo = PromiseWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const ticket = await findTicketById(new ObjectId(req.params.ticketId));
  if (ticket === null) throw new ErrorHandler("No Ticket Found", 400);
  const todo = await findTicketTodo(new ObjectId(req.params.ticketId));
  res.status(200).json(todo);
});

export const UpdateTodoStatus = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction, session: ClientSession) => {
    const { todoId, status } = req.body;
    const todo = await findTodoById(todoId);
    if (todo === null) throw new ErrorHandler("Todo Not Found", 404);
    if (todo.creator.toString() !== req.user!._id) throw new ErrorHandler("Permission Denied", 401);
    if (todo.status === status) throw new ErrorHandler("Invalid Request", 400);
    await updateTodoStatus(todoId, status, session);
    res.status(200).json({ message: "Status Changed" });
  }
);


//call rescheduler
export const CreateRescheduler = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    console.log(req.body, " this is rescheldur ");
    if (req.body.date < Date.now())
      throw new ErrorHandler("Invalid Schedule Time", 400);
    const ticket = await findTicketById(req.body.ticket);
    if (ticket === null) throw new ErrorHandler("No Ticket Found", 404);
    const ReschedulerPayload: iRescheduler = { ...req.body };
  const id = ticket.assigned;
    const stop = await findRepresentative(id);
    const mobile: any = stop?.phone;
    const Rescheduler = await createRescheduler(
      ReschedulerPayload,
      session,
      mobile
    );
    res.status(200).json(Rescheduler);
  }
);

export const GetReschedular = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    console.log(req.user!._id, "");
    const reschedular = await findCreatorRescheduler(
      new ObjectId(req.user!._id)
    );
    res.status(200).json(reschedular);
  }
);

export const GetTicketRescheduler = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    // const ticket = await findTicketById(new ObjectId(req.params.ticketId));
    // if (ticket === null) throw new ErrorHandler("No Ticket Found", 400);
    const currentUnixTimestamp = Math.floor(Date.now());
    console.log(req.params.ticketId, "req.params.ticketIdreq.params.ticketId");
    const Rescheduler = await findTicketRescheduler(
      new ObjectId(req.params.ticketId),
      currentUnixTimestamp
    );
    res.status(200).json(Rescheduler);
  }
);


export const getAllReschedulet = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
   console.log("hello")
    const allRescheduler = await rescheduleTicket({});
    res.status(200).json(allRescheduler);
  }
);

export const getAllRemainder = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("hello");
    const allRemainder = await remainderTicket({});
    res.status(200).json(allRemainder);
  }
);
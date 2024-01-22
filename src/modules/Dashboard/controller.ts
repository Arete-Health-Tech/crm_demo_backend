import { NextFunction, Request, Response } from "express";
import { ClientSession, ObjectId } from "mongodb";
import PromiseWrapper from "../../middleware/promiseWrapper";
import {
  findTicketsByStatusAndRepresentative,
  findTicketsByStatusAndRepresentativeforAdmin,
  findTicketsByWONandLOSS,
  getTicketsCountByStage,
  getTicketsCountByStageAdmin,
  updateTicketStatusHandler,
} from "./function";
import idashboard from "../../types/dashboard/dashboard";
import { findOneTicket } from "../ticket/functions";
import { findRepresentative } from "../representative/crud";
export const updateTicketStatus = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticketId = new ObjectId(req.params.id);
  
      const payload: idashboard = req.body; // Assuming the payload is sent in the request body

      const { status, body } = await updateTicketStatusHandler(
        ticketId,
        payload
      );
      res.status(status).json(body);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
// export const getStautsTicket = PromiseWrapper(async (req: Request, res: Response, next: NextFunction) => {
//     const ticketId  = req.params.assigned ;
// })
export const getTicketsBydnd = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    try {
      const representativeId = req.user?._id;
      // console.log(representativeId ,"representativeId")
  
      const userRole = req.user?.role;
      // console.log(userRole ,"userRole");
      const status = "dnd";
    

      // Call the function to get tickets based on user's role and status
      const tickets =
        userRole === "ADMIN"
          ? await findTicketsByStatusAndRepresentativeforAdmin(status)
          : await findTicketsByStatusAndRepresentative(
              status,
              representativeId
            );

      res.status(200).json({ tickets });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export const getTicketsByPending = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    try {
      const representativeId = req.user?._id;
      // console.log(representativeId ,"representativeId")
      const userRole = req.user?.role;
      // console.log(userRole ,"userRole");
      const status = "pendingTask";
     
      // Call the function to get tickets based on user's role and status
      const tickets =
        userRole === "ADMIN"
          ? await findTicketsByStatusAndRepresentativeforAdmin(status)
          : await findTicketsByStatusAndRepresentative(
              status,
              representativeId
            );

      res.status(200).json({ tickets });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export const getTicketsBytodayTask = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    try {
      const representativeId = req.user?._id;
      // console.log(representativeId , "representativeId is ins rbdfjnsd"); 
      const userRole = req.user?.role;
      // console.log(userRole ,"userRole");
      const status = "todayTask";

      // Call the function to get tickets based on user's role and status
      const tickets =
        userRole === "ADMIN"
          ? await findTicketsByStatusAndRepresentativeforAdmin(status)
          : await findTicketsByStatusAndRepresentative(
              status,
              representativeId
            );

      res.status(200).json({ tickets });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export const getTicketsByCallCompleted = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    try {
      const representativeId = req.user?._id;
      // console.log(representativeId ,"representativeId")
      const userRole = req.user?.role;
      // console.log(userRole ,"userRole");
      const status = "CallCompleted";
     

      // Call the function to get tickets based on user's role and status
      const tickets =
        userRole === "ADMIN"
          ? await findTicketsByStatusAndRepresentativeforAdmin(status)
          : await findTicketsByStatusAndRepresentative(
              status,
              representativeId
            );

      res.status(200).json({ tickets });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export const getTicketsByRescheduleCall = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    try {
      const representativeId = req.user?._id;
      const userRole = req.user?.role;
      const status = "RescheduleCall";
     

      // Call the function to get tickets based on user's role and status
      const tickets =
        userRole === "ADMIN"
          ? await findTicketsByStatusAndRepresentativeforAdmin(status)
          : await findTicketsByStatusAndRepresentative(
              status,
              representativeId
            );

      res.status(200).json({ tickets });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export const pieWONLoss = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    try {
      const coming = req.user?._id;
      console.log(coming, "coming");
      
       const representativeId = new ObjectId(coming);
       console.log(representativeId, "representativeId");
       
       const userRole = req.user?.role;

      // Call the function to get won and loss tickets based on user's role
      const wonLossTickets =
        userRole === "ADMIN"
          ? await findTicketsByWONandLOSS()
          : await findTicketsByWONandLOSS(representativeId);
console.log(wonLossTickets, "wonLossTickets");
      const win = new ObjectId("65991601a62baad220000001");
      const lost = new ObjectId("65991601a62baad220000002");
      // Calculate the count of won and loss tickets
      const wonCount = wonLossTickets.filter((ticket) =>
        ticket.result.equals(win)
      ).length;
      console.log(wonCount," this is win count");
      const lossCount = wonLossTickets.filter((ticket) =>
        ticket.result.equals(lost)
      ).length;
      console.log(lossCount, " this is loss count");

      res.status(200).json({ wonCount, lossCount });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export const getTicketsCountByAssignedStage = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    try {

      const representativeId = new ObjectId(req.user?._id);
      const userRole = req.user?.role;

      // Call the function to get the count of tickets by stage for the assigned representative
      const ticketsCountByStage =  userRole === "ADMIN"
      ? await getTicketsCountByStageAdmin():await getTicketsCountByStage(
        representativeId
      );

      res.status(200).json({ ticketsCountByStage });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);



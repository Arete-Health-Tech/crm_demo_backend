import { Request, Response, NextFunction } from "express";
import { ValidationError, validationResult } from "express-validator";
import { ClientSession } from "mongodb";
import ErrorHandler from "../utils/errorHandler";
import MongoService from "../utils/mongo";
const PromiseWrapper =
  (func: (req: Request, res: Response, next: NextFunction, session: ClientSession) => Promise<any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const session = MongoService.session;
    try {
      validationResult(req).throw();
      await session.withTransaction(async () => func(req, res, next, session));
    } catch (error: any) {
      if (process.env.ENVIRONMENT === "dev") {
        console.log(error);
      }
      if (error.code) {
        next(error);
      } else if (error.errors) {
        return res.status(400).json(error.errors);
      } else {
        next(new ErrorHandler(error, 500));
      }
    }
  };

export default PromiseWrapper;

import { NextFunction, Request, Response } from "express";
import PromiseWrapper from "../../middleware/promiseWrapper";
import {
  registerRepresentativeHandler,
  loginRepresentativeHandler,
  fetchAllRepresentative,
} from "./functions";

export const register = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, body } = await registerRepresentativeHandler({
      ...req.body,
      leadAssignedCount: 0,
    });
    res.status(status).json(body);
  }
);

export const login = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, body } = await loginRepresentativeHandler(
      req.body.phone,
      req.body.password
    );
    res.status(status).json(body);
  }
);

export const getAllRepresentative = PromiseWrapper(
  async (req: Request, res: Response) => {
    const result = await fetchAllRepresentative();
    res.status(200).json(result);
  }
);

import { NextFunction, Request, Response } from "express";
import PromiseWrapper from "../../middleware/promiseWrapper";
import { registerRepresentativeHandler, loginRepresentativeHandler } from "./functions";

export const register = PromiseWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const { status, body } = await registerRepresentativeHandler(req.body);
  res.status(status).json(body);
});

export const login = PromiseWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const { status, body } = await loginRepresentativeHandler(req.body.email, req.body.password);
  res.status(status).json(body);
});

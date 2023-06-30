import { NextFunction, Request, Response } from "express";
import PromiseWrapper from "../../middleware/promiseWrapper";
import {
  createStageHandler,
  getAllStagesHandler,
  getAllSubStagesHandler,
  searchConsumer,
} from "./functions";

export const createStage = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, body } = await createStageHandler(req.body);
    return res.status(status).json(body);
  }
);

export const search = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { search, departmentType } = <
      { search: string; departmentType: string }
    >req.query;
    const { status, body } = await searchConsumer(search, departmentType);
    return res.status(status).json(body);
  }
);

export const getAllStages = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const stages = await getAllStagesHandler();
    return res.status(200).json(stages);
  }
);

export const getAllSubStages = PromiseWrapper(
  async (req: Request, res: Response) => {
    const subStages = await getAllSubStagesHandler();
    return res.status(200).json(subStages);
  }
);

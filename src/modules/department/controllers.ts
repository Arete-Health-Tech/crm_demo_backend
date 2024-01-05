import { NextFunction, Request, Response } from "express";
import { ClientSession } from "mongodb";
import PromiseWrapper from "../../middleware/promiseWrapper";
import ErrorHandler from "../../utils/errorHandler";
import {
  createDepartmentHandler,
  createDepartmentTagHandler,
  createDoctorHandler,
  createWard,
  findAllDepartmentTagsHandler,
  getAllDepartments,
  getAllWards,
  getDoctorsHandler,
} from "./functions";

export const addDepartment = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, body } = await createDepartmentHandler(req.body);
    res.status(status).json(body);
  }
);

export const getDepartments = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, body } = await getAllDepartments(
      req.query.parent === "true" && true
    );
    res.status(status).json(body);
  }
);

export const createDoctor = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, body } = await createDoctorHandler(
      req.body.name,
      req.body.department
    );
    res.status(status).json(body);
  }
);

export const getDoctors = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const department = req.query.department
      ? (req.query.department as string)
      : undefined;
    const subDepartment = req.query.subDepartment
      ? (req.query.subDepartment as string)
      : undefined;
    const { status, body } = await getDoctorsHandler(department, subDepartment);
    res.status(status).json(body);
  }
);

export const createDepartmentTag = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const tag = await createDepartmentTagHandler(req.body.name);
    res.status(200).json(tag);
  }
);

export const getDepartmentTags = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const tags = await findAllDepartmentTagsHandler();
    res.status(200).json(tags);
  }
);

//ward
export const createWardController = PromiseWrapper(
  async (
    req: Request,
    res: Response,
    next: NextFunction,
    session: ClientSession
  ) => {
    const ward = await createWard(req.body, session);
    res.status(200).json(ward);
  }
);

export const getAllWardsController = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const wards = await getAllWards();
    res.status(200).json(wards);
  }
);

import { NextFunction, Request, Response } from "express";
import PromiseWrapper from "../../middleware/promiseWrapper";
import { createServiceHandler, getServices, getTotalServiceCount, searchService, searchServiceAll, searchServicePck,  } from "./functions";

export const createService = PromiseWrapper(async (req: Request, res: Response, next: NextFunction) => {
  console.log(req.body," this is request bofy service ")
  const { status, body } = await createServiceHandler(req.body);
  return res.status(status).json(body);
});

export const GetServices = PromiseWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const { pageLength, page } = req.query as unknown as { pageLength: number; page: number };
  const services = await getServices(page, pageLength);
  const total = await getTotalServiceCount();
  res.status(200).json({ services, total });
});

export const search = PromiseWrapper(async (req: Request, res: Response, next: NextFunction) => {
  const { search, tag } = <{ search: string; tag: string }>req.query;
  const { status, body } = await searchService(search, tag);
  return res.status(status).json(body);
});



export const searchPck = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
  
    const { status, body } = await searchServicePck();
    return res.status(status).json(body);
  }
);
export const searchServiceAllEst = PromiseWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, body } = await searchServiceAll();
    return res.status(status).json(body);
  }
);
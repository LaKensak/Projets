import createError from "http-errors";
import { NextFunction, Request, Response } from "express";
import { env } from "../env";

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler =
  (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);

export function assertAdmin(req: Request): void {
  const token = req.header("x-admin-token");
  if (!token || token !== env.serverAdminToken) {
    throw createError(401, "admin token invalide");
  }
}

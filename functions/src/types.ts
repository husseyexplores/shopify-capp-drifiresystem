import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";

export type RequestHandler = (
  request: Request,
  response: Response
) => void | Promise<void>;

import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";

export type RequestHandler = (
  request: Request,
  response: Response
) => void | Promise<void>;

export type PubSubToJsonShopify = {
  attributes: {
    "Content-Type": string; // "application/json"
    "X-Shopify-API-Version": string; // "2023-07"
    "X-Shopify-Fulfillment-Id": string; // "4416187826265"
    "X-Shopify-Hmac-SHA256": string; // "fxnadT+azucJ21/KAodUZon/U5dWZD0ekzTUs73kaLt="
    "X-Shopify-Shop-Domain": string; // "hssn09dev.myshopify.com"
    "X-Shopify-Topic": string; // "fulfillments/update"
    "X-Shopify-Triggered-At": string; // "2023-06-12T10:38:30.325839167Z"
    "X-Shopify-Webhook-Id": string; // "a55b2ba9-8063-4fb2-bacd-b2ac843fce74"
  };
  data: string; // hashed string
  messageId: string; // "8368877730557747"
  publishTime: string; // "2023-06-12T10:38:32.14Z"
};

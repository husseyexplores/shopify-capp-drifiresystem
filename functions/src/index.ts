import { onRequest } from "firebase-functions/v2/https";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import * as logger from "firebase-functions/logger";
import * as updatePaymentTerms_ from "./handlers/updatePaymentTerms";
import * as install_ from "./handlers/install";
import * as debug_ from "./handlers/debug";
import type { PubSubToJsonShopify } from "./types";
import { C } from "./lib/firebase-admin";

export const debug = onRequest({ maxInstances: 1 }, (request, response) => {
  response.json(debug_.handler());
});

export const install = onRequest(
  {
    maxInstances: 1,
  },
  install_.onRequest
);

// For strikeman-wholesale.myshopify.com
export const updatePaymentTerms = onMessagePublished(
  {
    topic: "update_payment_terms",
  },
  async (event) => {
    const data = event.data.message.json;
    const json: PubSubToJsonShopify = event?.data?.message?.toJSON();
    const shop = json?.attributes?.["X-Shopify-Shop-Domain"];
    if (!shop) return true;

    const shopRef = await C.stores.doc(shop).get();
    if (!shopRef.exists) return true;

    const accessToken = shopRef.data()?.accessToken;
    if (typeof accessToken !== "string") return true;
    const auth = { shop, accessToken };

    logger.log(
      `[shop::${shop}] updatePaymentTerms triggered - TOPIC:${json.attributes["X-Shopify-Topic"]}`,
      json
    );
    return updatePaymentTerms_.handler({ payload: data, auth });
  }
);

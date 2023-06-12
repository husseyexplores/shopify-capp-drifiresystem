import { onRequest } from "firebase-functions/v2/https";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import * as updatePaymentTerms_ from "./handlers/updatePaymentTerms";
import * as registerWebhooks_ from "./handlers/registerWebhooks";
import * as debug_ from "./handlers/debug";
// import type { PubSubToJsonShopify } from "./types";

export const debug = onRequest((request, response) => {
  response.json(debug_.handler());
});

export const registerWebhooks = onRequest(registerWebhooks_.onRequest);

export const updatePaymentTerms = onMessagePublished(
  {
    topic: "update_payment_terms",
  },
  (event) => {
    const data = event.data.message.json;
    // const json: PubSubToJsonShopify = event.data.message.toJSON();
    return updatePaymentTerms_.handler({ payload: data });
  }
);

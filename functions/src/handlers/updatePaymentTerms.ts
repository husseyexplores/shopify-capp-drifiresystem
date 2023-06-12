import * as logger from "firebase-functions/logger";
import { getClient } from "../lib/shopifyClients";

type HandlerOptions = {
  payload: unknown;
};

export async function handler({ payload }: HandlerOptions) {
  logger.debug("updatePaymentTerms handler triggered", payload);

  const client = getClient();

  const shopInfo = await client.gql<any>({
    query: /* GraphQL */ `query {
    shop {
      name
      myshopifyDomain
    }
  }`,
  });

  logger.debug(`Shop information [${shopInfo.data.shop.name}]-> `, shopInfo);

  return true;
}

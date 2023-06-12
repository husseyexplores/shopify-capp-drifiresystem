import * as logger from "firebase-functions/logger";
import { ShopifyClient } from "../lib/shopifyClients";
import { shopifyAccessToken, shopifyShop } from "../env";

type HandlerOptions = {
  payload: unknown;
};

export const secrets = [shopifyShop, shopifyAccessToken];

export async function handler({ payload }: HandlerOptions) {
  const client = new ShopifyClient({
    accessToken: shopifyAccessToken.value(),
    apiVersion: "2023-07",
    shop: shopifyShop.value(),
  });

  const shopInfo = await client.gql<any>({
    query: /* GraphQL */ `queryquery {
      shop {
        name
        myshopifyDomain
      }
    }`,
  });

  logger.debug(`Shop information "${shopInfo.data.shop.name}"-> `, shopInfo);

  return true;
}

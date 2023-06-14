import { getClient } from "../shopifyClients";
import type { Shop } from "./types/shop";

export const query = {
  info: async (input: {
    // variables?: never;
    auth: { shop: string; accessToken: string };
  }) => {
    return getClient(input.auth)
      .gql<{
        shop: Shop;
      }>({
        query: /* GraphQL */ `
          query {
            shop {
              id
              name
              myshopifyDomain
              primaryDomain {
                host
                id
                url
              }
            }
          }
        `,
      })
      .then((data) => data.data.shop);
  },
};

export const mutation = {};

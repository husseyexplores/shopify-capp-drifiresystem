import type { DraftOrder } from "./types/draftorder";
import { getClient } from "../shopifyClients";

const FRAGMENTS = {
  get draftOrder() {
    return /* GraphQL */ `
      fragment DraftOrderFragment on DraftOrder {
        name
        id
        totalPrice
        subtotalPrice
        totalShippingPrice
        note: note2

        shippingLine {
          code
          title
          source
          custom

          originalPriceSet {
            ...MoneyBagFragment
          }
          discountedPriceSet {
            ...MoneyBagFragment
          }
        }
      }

      ${this.moneybag}
    `;
  },
  moneybag: /* GraphQL */ `
    fragment MoneyBagFragment on MoneyBag {
      presentmentMoney {
        amount
        currencyCode
      }
      shopMoney {
        amount
        currencyCode
      }
      __typename
    }
  `,
};

export const query = {
  byId: async (input: {
    variables: { id: string };
    auth: { shop: string; accessToken: string };
  }) => {
    return getClient(input.auth)
      .gql<{ draftOrder: null | DraftOrder }>({
        query: /* GraphQL */ `
          query getDraftOrder($id: ID!) {
            draftOrder(id: $id) {
              ...DraftOrderFragment
            }
          }

          ${FRAGMENTS.draftOrder}
        `,
        variables: input.variables,
      })
      .then((data) => data.data.draftOrder);
  },
};

export const mutation = {
  updateShippingLine: async (input: {
    variables: {
      id: string;
      input: {
        shippingLine: {
          price: string;
          title: string;
        };
      };
    };
    auth: { shop: string; accessToken: string };
  }) => {
    return getClient(input.auth)
      .gql<{
        draftOrderUpdate: {
          draftOrder: DraftOrder | null;
          userErrors: {
            field: string;
            message: string;
          }[];
        };
      }>({
        query: /* GraphQL */ `
          mutation draftOrderUpdate($id: ID!, $input: DraftOrderInput!) {
            draftOrderUpdate(id: $id, input: $input) {
              draftOrder {
                ...DraftOrderFragment
              }
              userErrors {
                field
                message
              }
            }
          }

          ${FRAGMENTS.draftOrder}
        `,
        variables: input.variables,
      })
      .then((data) => data.data.draftOrderUpdate);
  },
};

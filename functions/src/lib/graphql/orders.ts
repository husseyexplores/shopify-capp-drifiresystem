import type { PaymentTerms, Order } from "../../types/order";
import { getClient } from "../shopifyClients";

const FRAGMENTS = {
  get order() {
    return /* GraphQL */ `
      fragment OrderFramgment on Order {
        id
        name
        tags
        fulfillable
        fullyPaid
        paymentTerms {
          ...PaymentTermsFragment
        }
      }

      ${this.paymentTerms}
    `;
  },
  paymentTerms: /* GraphQL */ `
    fragment PaymentTermsFragment on PaymentTerms {
      id
      dueInDays
      overdue
      paymentTermsName
      translatedName
      paymentTermsType
      paymentSchedules(first: 10) {
        nodes {
          amount {
            amount
            currencyCode
          }
          id
          dueAt
          issuedAt
          completedAt
        }
      }
    }
  `,
};

export const query = {
  byId: (input: { variables: { id: string } }) => {
    return getClient()
      .gql<{ order: null | Order }>({
        query: /* GraphQL */ `
          query order($id: ID!) {
            order(id: $id) {
              ...OrderFramgment
            }
          }

          ${FRAGMENTS.order}
        `,
        variables: input.variables,
      })
      .then((data) => data.data.order);
  },
};

export const mutation = {
  updatePaymentTerms: async (input: {
    variables: {
      input: {
        paymentTermsId: string; // "gid://shopify/PaymentTerms/6180241497";
        paymentTermsAttributes: {
          paymentSchedules: { issuedAt: string }[];
          paymentTermsTemplateId?: string; //"gid://shopify/PaymentTermsTemplate/4";
        };
      };
    };
  }) => {
    return getClient()
      .gql<{
        paymentTermsUpdate: {
          paymentTerms: PaymentTerms | null;
          userErrors: {
            code: string;
            field: string;
            message: string;
          }[];
        };
      }>({
        query: /* GraphQL */ `
          mutation paymentTermsUpdate($input: PaymentTermsUpdateInput!) {
            paymentTermsUpdate(input: $input) {
              paymentTerms {
                ...PaymentTermsFragment
              }
              userErrors {
                field
                message
              }
            }
          }

          ${FRAGMENTS.paymentTerms}
        `,
        variables: input.variables,
      })
      .then((data) => data.data.paymentTermsUpdate);
  },
};

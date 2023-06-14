import { getClient } from "../shopifyClients";

export const query = {};

export const mutation = {
  tagsAdd: async (input: {
    variables: {
      id: string;
      tags: string[];
    };
    auth: { shop: string; accessToken: string };
  }) => {
    return getClient(input.auth)
      .gql<{
        tagsAdd: {
          node: null | {
            id: string;
          };
          userErrors: {
            code: string;
            field: string;
            message: string;
          }[];
        };
      }>({
        query: /* GraphQL */ `
          mutation tagsAdd($id: ID!, $tags: [String!]!) {
            tagsAdd(id: $id, tags: $tags) {
              node {
                id
              }
            }
          }
        `,
        variables: input.variables,
      })
      .then((data) => data.data);
  },

  tagsRemove: async (input: {
    variables: {
      id: string;
      tags: string[];
    };
    auth: { shop: string; accessToken: string };
  }) => {
    return getClient(input.auth)
      .gql<{
        tagsRemove: {
          node: null | {
            id: string;
          };
          userErrors: {
            code: string;
            field: string;
            message: string;
          }[];
        };
      }>({
        query: /* GraphQL */ `
          mutation tagsRemove($id: ID!, $tags: [String!]!) {
            tagsRemove(id: $id, tags: $tags) {
              node {
                id
              }
            }
          }
        `,
        variables: input.variables,
      })
      .then((data) => data.data);
  },
};

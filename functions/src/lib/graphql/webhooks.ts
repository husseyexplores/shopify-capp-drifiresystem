import type { WebhookSubscription } from "./types/webhook";
import { getClient } from "../shopifyClients";

const FRAGMENTS = {
  webhookSubscription: /* GraphQL */ `
    fragment WebhookSubscriptionFragment on WebhookSubscription {
      topic
      id
      apiVersion {
        displayName
        handle
        supported
      }
      createdAt
      endpoint {
        ... on WebhookPubSubEndpoint {
          pubSubProject
          pubSubTopic
        }
        __typename
      }
      includeFields
    }
  `,
};

export const query = {
  listRegisteredWebhooks: async (input: {
    // variables?: never
    auth: { shop: string; accessToken: string };
  }) => {
    return getClient(input.auth)
      .gql<{
        webhookSubscriptions: {
          nodes: WebhookSubscription[];
        };
      }>({
        query: /* GraphQL */ `
          query getWebhooks {
            webhookSubscriptions(first: 100) {
              nodes {
                ...WebhookSubscriptionFragment
              }
            }
          }

          ${FRAGMENTS.webhookSubscription}
        `,
      })
      .then((data) => data.data.webhookSubscriptions.nodes);
  },
};

export const mutation = {
  create: async (input: {
    variables: {
      topic: string;
      input: {
        pubSubProject: string;
        pubSubTopic: string;
        format: string;
      };
    };
    auth: { shop: string; accessToken: string };
  }) => {
    return getClient(input.auth)
      .gql<{
        pubSubWebhookSubscriptionCreate: {
          webhookSubscription: WebhookSubscription | null;

          userErrors?: {
            code: string;
            field: string;
            message: string;
          }[];
        };
      }>({
        query: /* GraphQL */ `
          mutation createWebhook(
            $topic: WebhookSubscriptionTopic!
            $input: PubSubWebhookSubscriptionInput!
          ) {
            pubSubWebhookSubscriptionCreate(
              topic: $topic
              webhookSubscription: $input
            ) {
              webhookSubscription {
                ...WebhookSubscriptionFragment
              }
              userErrors {
                code
                field
                message
              }
            }
          }

          ${FRAGMENTS.webhookSubscription}
        `,
        variables: input.variables,
      })
      .then((data) => data.data.pubSubWebhookSubscriptionCreate);
  },

  delete: async (input: {
    variables: { id: string };
    auth: { shop: string; accessToken: string };
  }) => {
    return getClient(input.auth)
      .gql<{
        webhookSubscriptionDelete: {
          deletedWebhookSubscriptionId: null | string;

          userErrors: {
            message: string;
          }[];
        };
      }>({
        query: /* GraphQL */ `
          mutation deleteWebhook($id: ID!) {
            webhookSubscriptionDelete(id: $id) {
              deletedWebhookSubscriptionId
              userErrors {
                message
              }
            }
          }
        `,
        variables: input.variables,
      })
      .then((data) => data.data);
  },
};

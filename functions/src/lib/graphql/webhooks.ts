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
        ...on WebhookPubSubEndpoint {
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
  listRegisteredWebhooks: () => ({
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
  }),
};

export const mutation = {
  create: (input: {
    variables: {
      topic: string;
      input: {
        pubSubProject: string;
        pubSubTopic: string;
        format: string;
      };
    };
  }) => ({
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
  }),

  delete: (input: { variables: { id: string } }) => ({
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
  }),
}

type WebhookSubscription = {
  topic: string;
  id: string;
  apiVersion: {
    displayName: string;
    handle: string;
    supported: boolean;
  };
  createdAt: string;
  endpoint: {
    pubSubProject: string
    pubSubTopic: string
    __typename: string;
  };
  includeFields: string[];
};

export type DataType = {
  get: {
    webhookSubscriptions: {
      nodes: WebhookSubscription[];
    };
  };
  create: {
    pubSubWebhookSubscriptionCreate:
      | {
          webhookSubscription: WebhookSubscription | null;
        }
      | {
          userErrors: {
            code: string;
            field: string;
            message: string;
          }[];
        };
  };

  delete: {
    webhookSubscriptionDelete:
      | {
          deletedWebhookSubscriptionId: string;
        }
      | {
          userErrors: {
            message: string;
          }[];
        };
  };
};


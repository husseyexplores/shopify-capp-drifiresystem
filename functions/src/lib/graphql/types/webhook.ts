export type WebhookSubscription = {
  topic: string;
  id: string;
  apiVersion: {
    displayName: string;
    handle: string;
    supported: boolean;
  };
  createdAt: string;
  endpoint: {
    pubSubProject: string;
    pubSubTopic: string;
    __typename: string;
  };
  includeFields: string[];
};

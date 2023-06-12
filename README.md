# Shopify Custom App

Built to deploy using Firebase.

Why Firebase?\
Easy to transfer it to the client once finished developing and comes with most of the features needed for building a backend app like db, scalable pubsub, cloud functions at a very cost effective price.

Can be adjusted for other deployment platforms with minor adjustments (logging, env vars).\
Major adjustments are needed for pubsub and webhook registering.

## Setup

```bash
# Make sure to install firebase cli
pnpm add -g firebase-tools

# install deps and create .env file
cd function && pnpm install && cp .env.SAMPLE .env
```

Fill out the `.env` file

## Deploy

```bash
firebase deploy --only functions
```

## Docs and Notes

### Webhooks

Webhooks are created via code.

1. Goto `functions/src/handlers/registerWebhooks.ts` and add required webhooks in `REQUIRED_WEBHOOKS`
2. Create the webhook handler in `function/src/index.ts` using `onMessagePublished`. Topic must be the same as `pubSubTopic` entered above in the previous step;
3. Run deploy command
4. Be sure to add `delivery@shopify-pubsub-webhooks.iam.gserviceaccount.com` as Publisher in GCP Pubsub console. It should be done for every topic regeristed.

Documentation to create the webhooks is in `functions/src/handlers/registerWebhooks.ts`

## Wishlist:

- [ ] Add `delivery@shopify-pubsub-webhooks.iam.gserviceaccount.com` as publisher in GCP via Google API so we don't have to touch the GCP console.

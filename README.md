# Shopify Custom App

Built to deploy using Firebase.

Why Firebase?\
Easy to transfer it to the client once finished developing and comes with most of the features needed for building a backend app like db, scalable pubsub, cloud functions at a very cost effective price.

Can be adjusted for other deployment platforms with minor adjustments (logging, env vars).\
Major adjustments are needed for pubsub and webhook registering.

**Note:** Usually, Shopify Custom Apps have a one-to-one relationship with `store <-> each-app-deployment`

- Each app is deployed specifically for one store.
- If you need to install the same custom app on another store, you have to redeploy the Firebase project.

But this implementation supports multiple stores with a single deployment.\
Access tokens are stored in Firestore instead of stored in environment variables.

## Setup

```sh
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

## Install the app

Let's configure Shopify store settings

1. Go to your store backend
2. Settings > Apps and sales channels
3. Click `Develop apps` on the top right corner
4. Click `Create an app`
5. Select these scopes: `write_draft_orders, read_draft_orders, write_orders, read_orders, write_payment_terms, read_payment_terms, write_fulfillments, read_fulfillments`
6. Click `Install`
7. Copy the access token.

Now let's link our backend to this shopify app.

1. Goto to your Firebase dashboard > functions.
2. Copy the `install` function url
3. Open it in a new tab.
4. Enter your shop url and access token that you just copied from the last step, and submit.
5. Success! You should see a log dump of installed webhooks.

## Docs and Notes

### Webhooks

Webhooks are created via code.

1. Goto `functions/src/handlers/registerWebhooks.ts` and add required webhooks in `REQUIRED_WEBHOOKS`
2. Create the webhook handler in `function/src/index.ts` using `onMessagePublished`. Topic must be the same as `pubSubTopic` entered above in the previous step;
3. Run deploy command `firebase deploy --only functions`
4. Be sure to add `delivery@shopify-pubsub-webhooks.iam.gserviceaccount.com` as Publisher in GCP Pubsub console. It should be done for every topic regeristed.

Documentation to create the webhooks is in `functions/src/handlers/registerWebhooks.ts`

## Wishlist:

- [ ] Installation process could be reimagined.
  - On the install page, present a list of features that the app offers
  - Merchant can select the features they need and install our app.
  - On the backend, we take the list of features that the merchant want to use, and only subscribe the merchant to those webhooks / features.
  - Also, there should be a way to list the features merchant is using.
- [ ] Add `delivery@shopify-pubsub-webhooks.iam.gserviceaccount.com` as publisher in GCP via Google API so we don't have to touch the GCP console.

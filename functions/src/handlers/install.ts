import * as logger from "firebase-functions/logger";
import * as webhookQ from "../lib/graphql/webhooks";
import * as shopQ from "../lib/graphql/shop";
import type { RequestHandler } from "../types";
import { C } from "../lib/firebase-admin";
import { html } from "../lib/html/install";

const REQUIRED_WEBHOOKS: Parameters<
  (typeof webhookQ)["mutation"]["create"]
>[0]["variables"][] = [
  {
    topic: "FULFILLMENTS_CREATE",
    input: {
      pubSubProject: process.env.GCLOUD_PROJECT ?? "drifiresystem-shopify",
      pubSubTopic: "update_payment_terms",
      format: "JSON",
    },
  },
  // {
  //   topic: "FULFILLMENTS_UPDATE", // shopify webhook topic
  //   input: {
  //     pubSubProject: process.env.GCLOUD_PROJECT ?? "drifiresystem-shopify",
  //     pubSubTopic: "update_payment_terms", // google pubsub topic
  //     format: "JSON",
  //   },
  // },
];

type HandlerOptions = {
  payload?: never; // fulfillment or order object
  auth: { shop: string; accessToken: string };
};

export async function handler({ auth }: HandlerOptions) {
  logger.debug(`[shop::${auth.shop}] Registering webhooks handler triggered`);

  let webhooksList = await getAllWebhooks(auth);
  let numWebhooksToInstall = webhooksList.missing.length;

  // Install missing webhooks
  if (webhooksList.missing.length > 0) {
    logger.debug(
      `[shop::${auth.shop}] Registering ${numWebhooksToInstall} webhooks`
    );

    await Promise.all(
      webhooksList.missing.map((wh) =>
        webhookQ.mutation
          .create({
            variables: wh,
            auth,
          })
          .then((response) => {
            const userErrors = response.userErrors;
            const logMsg =
              userErrors && userErrors.length > 0
                ? "Error creating webhook"
                : "Webhook created";
            logger.log(`[shop::${auth.shop}] ${logMsg}`, {
              input: wh,
              response,
            });

            return response;
          })
      )
    );

    // const userErrors = results.map(x => x.userErrors?.length ? x.userErrors : null).filter(Boolean)

    // re-fetch installed webhooks list
    webhooksList = await getAllWebhooks(auth);
  }

  logger.info(`[shop::${auth.shop}] Installed webhooks are `, {
    justInstalled: numWebhooksToInstall,
    list: webhooksList.installed,
  });

  return webhooksList;
}

export async function deleteAll(auth: HandlerOptions["auth"]) {
  logger.warn(`[shop::${auth.shop}] Deleting all webhooks...`);

  const webhooksList = await getAllWebhooks(auth);

  await Promise.all(
    webhooksList.installed.map((wh) => {
      return webhookQ.mutation.delete({ auth, variables: { id: wh.id } });
    })
  );

  logger.warn(`[shop::${auth.shop}] All webhooks successfully deleted!`);
  return true;
}

async function getAllWebhooks(auth: HandlerOptions["auth"]) {
  const registedWebhooks = await webhookQ.query.listRegisteredWebhooks({
    auth,
  });

  const missingWebhooks = REQUIRED_WEBHOOKS.filter((requiredWh) => {
    const insalled = registedWebhooks.find(
      (regWh) =>
        regWh.topic === requiredWh.topic &&
        regWh.endpoint.pubSubTopic === requiredWh.input.pubSubTopic &&
        regWh.endpoint.pubSubProject === requiredWh.input.pubSubProject
    );
    return !insalled;
  });

  return { installed: registedWebhooks, missing: missingWebhooks };
}

/*
  Trigger it like this:
  ----------------------

  ```js
  fetch(`https://install-blablabla.app`, {
    method: "POST",
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      method: 'GET',
      shop: 'handle.myshopify.com',
      // needed when installing for the first time
      // or deleting the app
      accessToken: '<shopify access token>',
    })
  })
  .then(r => r.json())
  .then(console.log)
  ```
 */

export const onRequest: RequestHandler = async function onRequest(
  request,
  response
) {
  const reqMethod = request.method.toUpperCase();
  if (reqMethod === "GET") {
    response.status(200).setHeader("Content-Type", "text/html").send(html);
    return;
  }

  if (reqMethod !== "POST") {
    response.status(400).json({
      error: { title: "Bad request." },
    });
    return;
  }

  const { shop, method } = request.body;
  let bodyAccessToken =
    typeof request.body.accessToken === "string"
      ? (request.body.accessToken as string)
      : null;

  if (
    !shop ||
    !method ||
    typeof shop !== "string" ||
    typeof method !== "string"
  ) {
    response.status(400).json({
      error: {
        title: "Bad request.",
        message: "Missing required params",
        params: { shop, method, accessToken: bodyAccessToken },
      },
    });
    return;
  }

  // User must provide an `accessToken` for sensitive operations
  if (method !== "GET") {
    if (!bodyAccessToken || typeof bodyAccessToken !== "string") {
      response.status(400).json({
        error: {
          title: "Missing required params",
          message: "Please provide an `accessToken` (string) in the body.",
        },
        params: { accessToken: bodyAccessToken },
      });
      return;
    }
  }

  const shopRef = await C.stores.doc(shop).get();
  const auth = shopRef.exists
    ? (shopRef.data() as HandlerOptions["auth"])
    : { shop, accessToken: "" };
  let storedAuth: HandlerOptions["auth"] | null = null;
  if (auth.accessToken) {
    storedAuth = { ...auth };
  }

  // First time installing? `accessToken` is required
  if (!auth.accessToken) {
    if (!bodyAccessToken) {
      response.status(400).json({
        error: {
          title:
            method === "GET"
              ? "Shop is not installed."
              : "Missing required params",
          message:
            method === "GET"
              ? "Please install the shop first."
              : "Missing `accessToken` (string) in the body.",
          code: "UNAUTHORIZED",
        },
      });
      return;
    }
    auth.accessToken = bodyAccessToken;

    const shopInfo = await shopQ.query.info({ auth }).catch(() => null);

    if (!shopInfo || shopInfo.myshopifyDomain !== shop) {
      response.status(400).json({
        error: {
          title: "Unable to fetch shop info.",
          message: "Bad access token",
          tip: "If you're sure that the access token is 100% correct, then please wait a couple of minutes and then try again.",
        },
        shopInfo,
        auth,
      });
      return;
    }

    // access token is correct. Store the `accessToken` in db
    await shopRef.ref.set(auth);
  }

  try {
    // Register webhooks
    if (method === "POST") {
      if (storedAuth && storedAuth.accessToken !== auth.accessToken) {
        await deleteAll(storedAuth);
      }

      const data = await handler({ auth });

      response.status(200).json({
        success: true,
        registered_webhooks: data,
      });
      return;
    }

    // Delete all webhooks
    if (method === "DELETE") {
      await Promise.all([deleteAll(auth), shopRef.ref.delete()]);

      response
        .status(200)
        .json({ success: true, message: "All webhooks deleted" });
      return;
    }

    if (method === "GET") {
      const list = await getAllWebhooks(auth);
      response.status(200).json({
        success: true,
        list,
      });
      return;
    }
  } catch (e) {
    response.status(500).json({
      success: false,
      method: method,
      error: {
        title: "Internal server error",
        message: e instanceof Error ? e.message : undefined,
      },
    });
    return;
  }

  if (!response.headersSent) {
    response.status(401).json({
      error: {
        title: "Bad request",
        message: "Bad request",
      },
    });
    return;
  }
};

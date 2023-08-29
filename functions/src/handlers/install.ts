import * as logger from "firebase-functions/logger";
import * as webhookQ from "../lib/graphql/webhooks";
import * as shopQ from "../lib/graphql/shop";
import type { WebhookSubscription } from "../lib/graphql/types/webhook";
import type { RequestHandler } from "../types";
import { C } from "../lib/firebase-admin";
import { html } from "../lib/html/install";

const AVAILABLE_WEBHOOKS: Parameters<
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
type WebhookCreateInput = (typeof AVAILABLE_WEBHOOKS)[number];

const AVAILABLE_WH_PUBSUB_TOPICS = AVAILABLE_WEBHOOKS.map(
  (x) => x.input.pubSubTopic
);

type HandlerOptions = {
  payload?: never; // fulfillment or order object
  auth: { shop: string; accessToken: string };
};

// Add webhooks
async function registerWebhooks(
  auth: HandlerOptions["auth"],
  predicate?: (webhookCreateInput: WebhookCreateInput) => boolean
) {
  logger.debug(`[shop::${auth.shop}] Registering webhooks handler triggered`);

  let webhooksList = await getAllWebhooks(auth);

  // predicate is required!
  let webhooksToInstall = predicate
    ? webhooksList.missing.filter(predicate)
    : [];
  let numWebhooksToInstall = webhooksToInstall.length;

  // Install missing webhooks
  if (webhooksToInstall.length > 0) {
    logger.debug(
      `[shop::${auth.shop}] Registering ${numWebhooksToInstall} webhooks`,
      {
        pubsubTopics: webhooksToInstall.map((x) => x.input.pubSubTopic),
      }
    );

    await Promise.all(
      webhooksToInstall.map((wh) =>
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
    installed: webhooksList.installed,
    missing: webhooksList.missing,
  });

  return webhooksList;
}

async function deleteWebhooks(
  auth: HandlerOptions["auth"],
  predicate?: (wh: WebhookSubscription) => boolean
) {
  logger.warn(`[shop::${auth.shop}] Deleting all webhooks...`);

  const webhooksList = await getAllWebhooks(auth);
  const installedWebhooks = predicate
    ? webhooksList.installed.filter(predicate)
    : webhooksList.installed;

  await Promise.all(
    installedWebhooks.map((wh) => {
      return webhookQ.mutation.delete({ auth, variables: { id: wh.id } });
    })
  );

  logger.warn(`[shop::${auth.shop}] All webhooks successfully deleted!`);
  return true;
}

type WebhooksOverview = {
  available: string[];
  installed: WebhookSubscription[];
  missing: WebhookCreateInput[];
};
async function getAllWebhooks(
  auth: HandlerOptions["auth"]
): Promise<WebhooksOverview> {
  const registedWebhooks = await webhookQ.query.listRegisteredWebhooks({
    auth,
  });

  const missingWebhooks = AVAILABLE_WEBHOOKS.filter((requiredWh) => {
    const insalled = registedWebhooks.find(
      (regWh) =>
        regWh.topic === requiredWh.topic &&
        regWh.endpoint.pubSubTopic === requiredWh.input.pubSubTopic &&
        regWh.endpoint.pubSubProject === requiredWh.input.pubSubProject
    );
    return !insalled;
  });

  return {
    available: AVAILABLE_WH_PUBSUB_TOPICS,
    installed: registedWebhooks,
    missing: missingWebhooks,
  };
}

function getWebhooksToConfigure(x: unknown) {
  let matchedWebhooks: null | string[] = null;

  if (x === "ALL") {
    matchedWebhooks = AVAILABLE_WH_PUBSUB_TOPICS;
  } else if (Array.isArray(x)) {
    matchedWebhooks = x.filter(
      (x) =>
        x &&
        typeof x === "string" &&
        AVAILABLE_WEBHOOKS.find((y) => y.input.pubSubTopic === x)
    );
  }

  return matchedWebhooks;
}

/*
  Trigger it like this:
  ----------------------

  ```js
  const installUrl = "https://install-blablabla.app";
  fetch(installUrl, {
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

  fetch(installUrl, {
    method: "POST",
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      method: 'PUT',
      shop: 'handle.myshopify.com',
      accessToken: '<shopify access token>',
      webhooks: {
        add: ["update_payment_terms"]
      }
    })
  })
  .then(r => r.json())
  .then(console.log)

  ```
 */

const _METHODS = ["GET", "POST", "DELETE", "PUT"] as const;

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

  const _request_invalid_params: Record<string, string> = {};

  let { shop, method: _method } = request.body;
  if (!shop || typeof shop !== "string") {
    _request_invalid_params.shop = "Please provide a shop handle";
  }

  if (
    !_method ||
    typeof _method !== "string" ||
    !_METHODS.includes(_method.toUpperCase() as any)
  ) {
    _request_invalid_params.method = `Please provide a valid method. (${_METHODS.join(
      ", "
    )})`;
  }

  const method = _method.toUpperCase() as (typeof _METHODS)[number];
  let bodyAccessToken =
    typeof request.body.accessToken === "string"
      ? (request.body.accessToken as string)
      : null;

  if (method !== "GET") {
    if (!bodyAccessToken) {
      _request_invalid_params.accessToken = "Please provide access token";
    }
  }

  if (Object.keys(_request_invalid_params).length > 0) {
    response.status(400).json({
      error: {
        title: "Bad request.",
        message: "Missing required params",
        params: _request_invalid_params,
      },
    });
    return;
  }

  // validate token
  if (bodyAccessToken) {
    const shopInfo = await shopQ.query
      .info({
        auth: { shop, accessToken: bodyAccessToken },
      })
      .catch((e) => null);

    if (!shopInfo || shopInfo.myshopifyDomain !== shop) {
      response.status(401).json({
        error: {
          title: "Unable to fetch shop info.",
          message: "Bad access token",
          tip: "If you're sure that the access token is 100% correct, then please wait a couple of minutes and then try again.",
        },
        shopInfo,
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

    // access token is correct. Store the `accessToken` in db
    await shopRef.ref.set(auth);
  }

  try {
    // Register webhooks
    if (method === "POST") {
      // new app?
      // delete the previous one
      if (storedAuth && storedAuth.accessToken !== auth.accessToken) {
        await deleteWebhooks(storedAuth);
      }

      const toAdd = getWebhooksToConfigure(request.body.webhooks?.add);

      const webhooks = await (toAdd
        ? registerWebhooks(auth, (whInput) =>
            toAdd.includes(whInput.input.pubSubTopic)
          )
        : getAllWebhooks(auth));

      response.status(200).json({
        success: true,
        data: { webhooks },
      });
      return;
    }

    // Delete all webhooks
    if (method === "DELETE") {
      await Promise.all([deleteWebhooks(auth), shopRef.ref.delete()]);

      response.status(200).json({
        success: true,
        message: "Shop uninstalled. All webhooks deleted",
      });
      return;
    }

    if (method === "GET") {
      const webhooks = await getAllWebhooks(auth);
      response.status(200).json({
        success: true,
        data: { webhooks },
      });
      return;
    }

    if (method === "PUT") {
      const toAdd = getWebhooksToConfigure(request.body.webhooks?.add);
      const toRemove = getWebhooksToConfigure(request.body.webhooks?.remove);

      let webhooks: WebhooksOverview | null = null;

      if (toRemove) {
        await deleteWebhooks(auth, (wh) =>
          toRemove.includes(wh.endpoint.pubSubTopic)
        );
      }

      if (toAdd) {
        webhooks = await registerWebhooks(auth, (whInput) =>
          toAdd.includes(whInput.input.pubSubTopic)
        );
      }

      if (!webhooks) {
        webhooks = await getAllWebhooks(auth);
      }

      response.status(200).json({
        success: true,
        data: { webhooks },
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

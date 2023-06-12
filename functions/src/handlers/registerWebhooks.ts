import * as logger from "firebase-functions/logger";
import { getClient } from "../lib/shopifyClients";
import { secretSalt } from "../env";
import * as webhookQ from "../lib/graphql/webhooks";
import type { RequestHandler } from "../types";

const REQUIRED_WEBHOOKS: Parameters<
  (typeof webhookQ)["mutation"]["create"]
>[0]["variables"][] = [
  {
    topic: "FULFILLMENTS_UPDATE", // shopify webhook topic
    input: {
      pubSubProject: process.env.GCLOUD_PROJECT ?? "drifiresystem-shopify",
      pubSubTopic: "update_payment_terms", // google pubsub topic
      format: "JSON",
    },
  },
  {
    topic: "FULFILLMENTS_CREATE",
    input: {
      pubSubProject: process.env.GCLOUD_PROJECT ?? "drifiresystem-shopify",
      pubSubTopic: "update_payment_terms",
      format: "JSON",
    },
  },
];

export async function handler() {
  logger.debug("Registering webhooks handler triggered");

  const client = getClient();

  let webhooksList = await getAllWebhooks();
  let numWebhooksToInstall = webhooksList.missing.length;

  // Install missing webhooks
  if (webhooksList.missing.length > 0) {
    logger.debug(`Registering ${numWebhooksToInstall} webhooks`);

    await Promise.all(
      webhooksList.missing.map((wh) =>
        client.gql<webhookQ.DataType["create"]>(
          webhookQ.mutation.create({
            variables: wh,
          })
        )
      )
    );

    // re-fetch installed webhooks list
    webhooksList = await getAllWebhooks();
  }

  logger.info(`Installed webhooks are `, {
    justInstalled: numWebhooksToInstall,
    list: webhooksList.installed,
  });

  return webhooksList;
}

export async function deleteAll() {
  logger.warn("Deleting all webhooks...");
  const client = getClient();

  const webhooksList = await getAllWebhooks();

  await Promise.all(
    webhooksList.installed.map((wh) => {
      return client.gql<webhookQ.DataType["delete"]>(
        webhookQ.mutation.delete({ variables: { id: wh.id } })
      );
    })
  );

  logger.warn("All webhooks successfully deleted!");
  return true;
}

async function getAllWebhooks() {
  const client = getClient();

  const registedWebhooks = (
    await client.gql<webhookQ.DataType["get"]>(
      webhookQ.query.listRegisteredWebhooks()
    )
  ).data.webhookSubscriptions.nodes;

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
  fetch(`https://registerwebhooks-blablabla.app`, {
    method: "POST",
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      method: 'GET',
      secret: '<env_secret_value>'
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
  const method = request.method.toUpperCase();
  const secret: string =
    typeof request.body?.secret === "string" ? request.body.secret : null;

  if (method === "POST" && secret === secretSalt.value()) {
    const _method: string =
      typeof request.body?.method === "string"
        ? request.body.method.toUpperCase()
        : null;

    try {
      // Register webhooks
      if (_method === "POST") {
        const data = await handler();

        response.status(200).json({
          success: true,
          registered_webhooks: data,
        });
        return;
      }

      // Delete all webhooks
      if (_method === "DELETE") {
        await deleteAll();
        response
          .status(200)
          .json({ success: true, message: "All webhooks deleted" });
        return;
      }

      if (_method === "GET") {
        const list = await getAllWebhooks();
        response.status(200).json({
          success: true,
          list,
        });
        return;
      }
    } catch (e) {
      response.status(500).json({
        success: false,
        method: _method,
        error: {
          title: "Internal server error",
          message: e instanceof Error ? e.message : undefined,
        },
      });
      return;
    }
  }

  if (!response.headersSent) {
    response.status(401).json({
      error: {
        title: "Bad request",
        message: "Bad request",
      },
    });
  }
};

import * as logger from "firebase-functions/logger";
import * as orderQ from "../lib/graphql/orders";
import * as tagsQ from "../lib/graphql/tags";

type HandlerOptions = {
  payload: unknown; // fulfillment or order object
  auth: { shop: string; accessToken: string };
};

const MAGIC_ORDER_TAGS = {
  COMPLETED: "pt-automation-completed",
  DISABLED: "pt-automation-disabled",
  MULTI_SCHEDULE: "pt-automation-multiple-schedules",
} as const;

export async function handler({ payload, auth }: HandlerOptions) {
  logger.debug(
    `[shop::${
      auth.shop
    }] updatePaymentTerms handler triggered [payload:${!!payload}]`,
    payload
  );

  if (!isValidPaylod(payload)) {
    logger.warn(`[shop::${auth.shop}] Invalid payload`, { payload });
    return true;
  }

  const order = await getOrder({ input: payload, auth });
  if (!order) {
    logger.warn(`[shop::${auth.shop}] No order found`, { payload });
    return true;
  }

  // Short-circuit - Have we processed this order?
  if (order.tags.includes(MAGIC_ORDER_TAGS.COMPLETED)) {
    logger.info(
      `[shop::${auth.shop}] Skipping payment terms update for order ${order.id} - Already completed.`,
      {
        order,
      }
    );
    return true;
  }

  // Short-circuit - Is it marked to be left alone?
  if (order.tags.includes(MAGIC_ORDER_TAGS.DISABLED)) {
    logger.info(
      `[shop::${auth.shop}] Skipping payment terms update for order ${order.id} - Disabled via order tag`,
      {
        order,
      }
    );
    return true;
  }

  // Short-circuit - Only completely FULFILLED orders are allowed
  if (order.displayFulfillmentStatus !== "FULFILLED") {
    logger.info(
      `[shop::${auth.shop}] Skipping payment terms update for order ${order.id} - Not FULFILLED yet.`,
      {
        order,
      }
    );

    // If we found any completed tag - remove it
    // This tag may be added in rare cases where
    // the order is marked is fulfulled earlier (we add the completed tag)
    // but then changed back to unfulfilled (now we remove it)
    if (order.tags.includes(MAGIC_ORDER_TAGS.COMPLETED)) {
      await tagsQ.mutation.tagsRemove({
        variables: { id: order.id, tags: [MAGIC_ORDER_TAGS.COMPLETED] },
        auth,
      });
    }
    return true;
  }

  const paymentTermsSchedulesCount =
    order.paymentTerms?.paymentSchedules.nodes.length ?? null;

  // something unusual? There should only be one payment term schedule.
  if (paymentTermsSchedulesCount != null && paymentTermsSchedulesCount > 1) {
    logger.warn(
      `[shop::${auth.shop}] Attention: order ${order.id} has more than one payment schedule`,
      { order }
    );

    if (!order.tags.includes(MAGIC_ORDER_TAGS.MULTI_SCHEDULE)) {
      await tagsQ.mutation.tagsAdd({
        variables: {
          id: order.id,
          tags: [MAGIC_ORDER_TAGS.MULTI_SCHEDULE],
        },
        auth,
      });
    }
  }

  // We only update the `NET` payment terms
  // And only if it's not already completed/paid
  const firstSchedule = order.paymentTerms?.paymentSchedules.nodes[0];
  if (
    order.paymentTerms &&
    order.paymentTerms.paymentTermsType === "NET" &&
    firstSchedule &&
    firstSchedule.completedAt == null
  ) {
    const updatedTerms = await orderQ.mutation.updatePaymentTerms({
      auth,
      variables: {
        input: {
          paymentTermsId: order.paymentTerms.id,
          paymentTermsAttributes: {
            paymentSchedules: [
              {
                issuedAt: new Date().toISOString(),
              },
            ],
          },
        },
      },
    });

    // Mark as completed
    if (!order.tags.includes(MAGIC_ORDER_TAGS.COMPLETED)) {
      await tagsQ.mutation.tagsAdd({
        variables: {
          id: order.id,
          tags: [MAGIC_ORDER_TAGS.COMPLETED],
        },
        auth,
      });
    }

    logger.log(
      `[shop::${auth.shop}] Updated payment terms for order ${order.id}`,
      {
        id: order.id,
        updatedTerms,
      }
    );
  } else {
    logger.log(
      `[shop::${auth.shop}] Not updating payment terms for order ${order.id}`,
      {
        order,
      }
    );
  }

  return true;
}

function isValidPaylod(
  input: unknown
): input is { admin_graphql_api_id: string; order_id?: number } {
  return (
    input != null &&
    typeof input === "object" &&
    "admin_graphql_api_id" in input &&
    typeof input.admin_graphql_api_id === "string"
  );
}

async function getOrder({
  input,
  auth,
}: {
  input: {
    admin_graphql_api_id: string;
    order_id?: number;
  };
  auth: { shop: string; accessToken: string };
}) {
  let orderId = input.order_id
    ? `gid://shopify/Order/${input.order_id}`
    : input.admin_graphql_api_id.startsWith("gid://shopify/Order/")
    ? input.admin_graphql_api_id
    : null;

  if (!orderId) {
    return null;
  }

  const order = await orderQ.query.byId({ variables: { id: orderId }, auth });
  return order;
}

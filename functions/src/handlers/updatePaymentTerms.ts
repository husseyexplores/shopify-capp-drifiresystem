import * as logger from "firebase-functions/logger";
import * as orderQ from "../lib/graphql/orders";
import * as tagsQ from "../lib/graphql/tags";

type HandlerOptions = {
  payload: unknown; // fulfillment payload
};

export async function handler({ payload }: HandlerOptions) {
  logger.debug(
    `updatePaymentTerms handler triggered [payload:${!!payload}]`,
    payload
  );

  if (!isValidPaylod(payload)) {
    logger.warn("Invalid payload", { payload });
    return true;
  }

  const order = await getOrder(payload);
  if (!order) {
    logger.warn("No order found", { payload });
    return true;
  }

  // magic tag!
  if (order.tags.includes('skip-payment-terms')) {
    logger.info(`Skipping payment terms update for order ${order.id} due to tag`, {
      order,
    });
    return true;
  }

  const paymentTermsSchedulesCount =
    order.paymentTerms?.paymentSchedules.nodes.length ?? null;

  // something unusual?
  if (paymentTermsSchedulesCount != null && paymentTermsSchedulesCount > 1) {
    logger.warn(
      `Attention: order ${order.id} has more than one payment schedule`,
      { order }
    );

    await tagsQ.mutation.tagsAdd({
      variables: {
        id: order.id,
        tags: ["multiple-payment-schedules"],
      },
    });
  }

  // Can we update terms?
  const firstSchedule = order.paymentTerms?.paymentSchedules.nodes[0];
  if (
    !order.fullyPaid &&
    order.paymentTerms &&
    order.paymentTerms.paymentTermsType === "NET" &&
    firstSchedule &&
    firstSchedule.completedAt == null
  ) {
    if (!order.tags.includes("test-processed")) {
      await tagsQ.mutation.tagsAdd({
        variables: {
          id: order.id,
          tags: ["test-processed"],
        },
      });
    }

    const updatedTerms = await orderQ.mutation.updatePaymentTerms({
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

    logger.log(`Updated payment terms for order ${order.id}`, {
      id: order.id,
      updatedTerms,
    });
  } else {
    logger.log(`Not updating payment terms for order ${order.id}`, {
      order,
    });
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

async function getOrder(input: {
  admin_graphql_api_id: string;
  order_id?: number;
}) {
  let orderId = input.order_id
    ? `gid://shopify/Order/${input.order_id}`
    : input.admin_graphql_api_id.startsWith("gid://shopify/Order/")
    ? input.admin_graphql_api_id
    : null;

  if (!orderId) {
    return null;
  }

  const order = await orderQ.query.byId({ variables: { id: orderId } });
  return order;
}

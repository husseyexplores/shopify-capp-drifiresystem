import * as logger from "firebase-functions/logger";
import * as draftorderQ from "../lib/graphql/draftOrders";
import { DraftOrder } from "../lib/graphql/types/draftorder";

type HandlerOptions = {
  payload: unknown; // fulfillment or order object
  auth: { shop: string; accessToken: string };
};

export async function handler({ payload, auth }: HandlerOptions) {
  logger.debug(
    `[shop::${
      auth.shop
    }] draftOrderShippingUpdate handler triggered [payload:${!!payload}]`,
    payload
  );

  if (!isValidPaylod(payload)) {
    logger.warn(`[shop::${auth.shop}] Invalid payload`, { payload });
    return true;
  }

  const draftOrder = await getDraftOrder({ input: payload, auth });
  if (!draftOrder) {
    logger.warn(`[shop::${auth.shop}] No order found`, { payload });
    return true;
  }

  if (canSetShippingToZero(draftOrder)) {
    const updated = await draftorderQ.mutation.updateShippingLine({
      auth,
      variables: {
        id: draftOrder.id,
        input: {
          shippingLine: {
            price: "0.00",
            title: "FREE SHIPPING",
          },
        },
      },
    });
    logger.log(
      `[shop::${auth.shop}] draftOrderShippingUpdate [COMPLETED]: ${draftOrder.id}`,
      {
        id: draftOrder.id,
        draftOrder: updated,
      }
    );

    return true;
  }

  logger.log(
    `[shop::${auth.shop}]  draftOrderShippingUpdate [SKIPPED]: ${draftOrder.id}`,
    {
      id: draftOrder.id,
      draftOrder: draftOrder,
    }
  );

  return true;
}

function isValidPaylod(
  input: unknown
): input is { admin_graphql_api_id: string; draft_order_id?: number } {
  return (
    input != null &&
    typeof input === "object" &&
    "admin_graphql_api_id" in input &&
    typeof input.admin_graphql_api_id === "string"
  );
}

async function getDraftOrder({
  input,
  auth,
}: {
  input: {
    admin_graphql_api_id: string;
    draft_order_id?: number;
  };
  auth: { shop: string; accessToken: string };
}) {
  let draftOrderId =
    typeof input.draft_order_id === "number"
      ? `gid://shopify/DraftOrder/${input.draft_order_id}`
      : input.admin_graphql_api_id.startsWith("gid://shopify/DraftOrder/")
      ? input.admin_graphql_api_id
      : null;

  if (!draftOrderId) {
    return null;
  }

  const draftOrder = await draftorderQ.query.byId({
    variables: { id: draftOrderId },
    auth,
  });
  return draftOrder;
}

function canSetShippingToZero(draftOrder: DraftOrder) {
  if (!draftOrder) return false;
  const note = draftOrder.note && draftOrder.note.trim().toUpperCase();
  if (!note) return false;

  const isRmaOrder = note.startsWith("RMA:") && note.includes("ORDER NUMBER:");
  if (!isRmaOrder) return false;

  const shippingLine = draftOrder.shippingLine;

  return (
    !shippingLine ||
    !shippingLine.custom ||
    draftOrder.totalShippingPrice !== "0.00"
  );
}

/*
_HXPLRS.shopifyRestRequest('/draft_orders/836386979929.json', {
  method: 'PUT',
  body: {
    draft_order: {
      shipping_line: {
        title: 'FREE SHIPPING',
        price: "0.00", // Format price to 2 decimal places
      },
    },
  }
})
.then(console.log)
*/

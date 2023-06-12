import { defineString } from "firebase-functions/params";

export const secretSalt = defineString("SECRET_SALT");
export const shopifyShop = defineString("SHOPIFY_SHOP");
export const shopifyAccessToken = defineString("SHOPIFY_ACCESS_TOKEN");
export const shopifyApiVersion = defineString("SHOPIFY_API_VERSION", {
  default: "2023-07",
});

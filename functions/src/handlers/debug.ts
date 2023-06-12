import { shopifyAccessToken, shopifyShop } from "../env";

export const secrets = [shopifyShop, shopifyAccessToken];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
// keep initial 10 chars,and mask others
function maskText(text: string) {
  if (!text) return "****";
  const tl = text.length;

  if (tl < 5) return text.slice(0, 2) + "*".repeat(randomInt(tl - 1, tl + tl));
  return text.slice(0, 5) + "*".repeat(randomInt(tl - 1, tl + 3));
}

export function handler() {
  return {
    message: "Hello from Firebase!",
    env: {
      shopifyShop: shopifyShop.value(),
      shopifyAccessToken: maskText(shopifyAccessToken.value()),
    },
    builtin_env: {
      CLOUD_RUNTIME_CONFIG: process.env.CLOUD_RUNTIME_CONFIG,
      ENTRY_POINT: process.env.ENTRY_POINT,
      GCP_PROJECT: process.env.GCP_PROJECT,
      GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
      FUNCTION_TRIGGER_TYPE: process.env.FUNCTION_TRIGGER_TYPE,
      FUNCTION_NAME: process.env.FUNCTION_NAME,
      FUNCTION_MEMORY_MB: process.env.FUNCTION_MEMORY_MB,
      FUNCTION_TIMEOUT_SEC: process.env.FUNCTION_TIMEOUT_SEC,
      FUNCTION_IDENTITY: process.env.FUNCTION_IDENTITY,
      FUNCTION_REGION: process.env.FUNCTION_REGION,
      FUNCTION_TARGET: process.env.FUNCTION_TARGET,
      FUNCTION_SIGNATURE_TYPE: process.env.FUNCTION_SIGNATURE_TYPE,
      K_SERVICE: process.env.K_SERVICE,
      K_REVISION: process.env.K_REVISION,
      PORT: process.env.PORT,
      K_CONFIGURATION: process.env.K_CONFIGURATION,
    },
  };
}

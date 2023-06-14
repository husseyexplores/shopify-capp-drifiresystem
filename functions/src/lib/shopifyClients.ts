import * as logger from "firebase-functions/logger";
import { GraphqlError, type GraphqlErrorItem } from "./utils";
import { shopifyApiVersion } from "../env";

type GraphqlExtension = {
  cost: {
    actualQueryCost: number;
    requestedQueryCost: number;
    throttleStatus: {
      currentlyAvailable: number;
      maximumAvailable: number;
      restoreRate: number;
    };
  };
};

export class ShopifyClient {
  private _accessToken: string;
  private _apiVersion: string;
  private _baseUrl: string;
  private _baseFetchOptions: RequestInit;

  constructor({
    shop,
    accessToken,
    apiVersion,
  }: {
    shop: string;
    accessToken: string;
    apiVersion: string;
  }) {
    this._accessToken = accessToken;
    this._apiVersion = apiVersion;

    const handle = shop.replace(/\.myshopify\.com$/, "");
    this._baseUrl = `https://${handle}.myshopify.com/admin/api/${this._apiVersion}`;

    this._baseFetchOptions = {
      headers: {
        "Content-Type": "application/json", // application/graphql
        "X-Shopify-Access-Token": this._accessToken,
      },
    };
  }

  /**
   *
   * @param path Relative path starting from slash `/`
   * @param requestOptions `fetch` options
   */
  async fetch<T = unknown>(path: string, requestOptions?: RequestInit) {
    const mergedHeaders = requestOptions?.headers
      ? { ...this._baseFetchOptions.headers, ...requestOptions.headers }
      : this._baseFetchOptions.headers;

    const options: RequestInit = requestOptions
      ? {
          headers: mergedHeaders,
          ...requestOptions,
        }
      : this._baseFetchOptions;

    try {
      const res = await fetch(`${this._baseUrl}${path}`, options).catch(() => {
        throw new Error("Network error");
      });

      logger.debug(`[shopify:fetch:${path}] ${res.status}: ${res.statusText}`);

      const data: T = await res.json().catch(() => {
        throw new Error("Failed to parse response as JSON");
      });

      return data;
    } catch (e) {
      throw e;
    }
  }

  async gql<T = unknown, U = unknown>({
    query,
    variables,
  }: {
    query: string;
    variables?: Record<string, unknown>;
  }): Promise<{
    data: T;
    extensions: GraphqlExtension;
  }> {
    const value = await this.fetch<
      | {
          data: T;
          extensions: GraphqlExtension;
        }
      | {
          errors: GraphqlErrorItem[];
        }
    >("/graphql.json", {
      method: "POST",
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (value && "data" in value) {
      return {
        data: value.data,
        extensions: value.extensions,
      };
    }

    if (value && "errors" in value) {
      logger.error("Graphql Errors", {
        errors: value.errors,
      });
      throw new GraphqlError({ errors: value.errors });
    }

    throw new Error("Failed to get data or is in unexpected shape");
  }

  async get<T = unknown>(path: string) {
    return this.fetch<T>(path);
  }

  async delete(path: string): Promise<true> {
    await this.fetch(path, { method: "DELETE" });
    return true;
  }

  async post<T = unknown>(path: string, body: Record<string, unknown>) {
    return this.fetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async put<T = unknown>(path: string, body: Record<string, unknown>) {
    return this.fetch<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
}

const clients: Map<string, ShopifyClient> = new Map();
export function getClient({
  shop,
  accessToken,
  apiVersion,
}: {
  shop: string;
  accessToken: string;
  apiVersion?: string;
}): ShopifyClient {
  const key = `${shop}_${accessToken}`;
  let client = clients.has(key) ? clients.get(key) : null;

  if (!client) {
    client = new ShopifyClient({
      shop,
      accessToken,
      apiVersion: apiVersion ?? shopifyApiVersion.value(),
    });
  }
  return client;
}

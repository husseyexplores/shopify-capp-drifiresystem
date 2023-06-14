export type Shop = {
  id: string; // `gid://shopify/Shop/23880287`
  name: string;
  myshopifyDomain: string;
  primaryDomain: null | {
    id: string; // `gid://shopify/Domain/12374933593`
    host: string;
    url: string; // with string
  };
};

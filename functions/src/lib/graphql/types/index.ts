export type ShippingLine = {
  title: string;
  custom: boolean;
  code: string | null;
  source: string | null;
  originalPriceSet: MoneyBag;
  discountedPriceSet: MoneyBag;
};

export type MoneyBag = {
  presentmentMoney: MoneyV2;
  shopMoney: MoneyV2;
  __typename: "MoneyBag";
};

export type MoneyV2 = {
  amount: string;
  currencyCode: string;
};

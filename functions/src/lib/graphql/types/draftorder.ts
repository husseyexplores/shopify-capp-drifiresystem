import type { ShippingLine } from "./index";

export type DraftOrder = {
  name: string;
  id: string;
  totalPrice: string;
  subtotalPrice: string;
  totalShippingPrice: string;
  note: string | null;
  shippingLine: ShippingLine | null;
};

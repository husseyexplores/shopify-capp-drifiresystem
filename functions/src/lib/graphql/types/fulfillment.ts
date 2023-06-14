export type Fulfillment = {
  id: number;
  order_id: number;
  status: string;
  created_at: string;
  service: any;
  updated_at: string;
  tracking_company: string;
  shipment_status: any;
  location_id: any;
  origin_address: any;
  email: string;
  destination: Destination;
  line_items: LineItem[];
  tracking_number: string;
  tracking_numbers: string[];
  tracking_url: string;
  tracking_urls: string[];
  receipt: Receipt;
  name: string;
  admin_graphql_api_id: string;
};

interface Destination {
  first_name: string;
  address1: string;
  phone: string;
  city: string;
  zip: string;
  province: string;
  country: string;
  last_name: string;
  address2: any;
  company: string;
  latitude: any;
  longitude: any;
  name: string;
  country_code: string;
  province_code: string;
}

interface LineItem {
  id: number;
  variant_id: number;
  title: string;
  quantity: number;
  sku: string;
  variant_title: any;
  vendor: any;
  fulfillment_service: string;
  product_id: number;
  requires_shipping: boolean;
  taxable: boolean;
  gift_card: boolean;
  name: string;
  variant_inventory_management: string;
  properties: any[];
  product_exists: boolean;
  fulfillable_quantity: number;
  grams: number;
  price: string;
  total_discount: string;
  fulfillment_status: any;
  price_set: PriceSet;
  total_discount_set: TotalDiscountSet;
  discount_allocations: DiscountAllocation[];
  duties: any[];
  admin_graphql_api_id: string;
  tax_lines: any[];
}

interface PriceSet {
  shop_money: ShopMoney;
  presentment_money: PresentmentMoney;
}

interface ShopMoney {
  amount: string;
  currency_code: string;
}

interface PresentmentMoney {
  amount: string;
  currency_code: string;
}

interface TotalDiscountSet {
  shop_money: ShopMoney2;
  presentment_money: PresentmentMoney2;
}

interface ShopMoney2 {
  amount: string;
  currency_code: string;
}

interface PresentmentMoney2 {
  amount: string;
  currency_code: string;
}

interface DiscountAllocation {
  amount: string;
  discount_application_index: number;
  amount_set: AmountSet;
}

interface AmountSet {
  shop_money: ShopMoney3;
  presentment_money: PresentmentMoney3;
}

interface ShopMoney3 {
  amount: string;
  currency_code: string;
}

interface PresentmentMoney3 {
  amount: string;
  currency_code: string;
}

type Receipt = Record<string, unknown>;

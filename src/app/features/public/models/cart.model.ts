// =========================================================================
// CART — Model Definitions
// =========================================================================

import { AppliedCoupon, TaxBreakdownItem } from "../../customer/checkout/models/checkout.model";

/** Action events for cart operations */
export type CartActionEvent = '' | 'Update' | 'Delete';

/** Payload for add-to-cart API */
export interface AddToCartPayload {
  cart_id: string;          // "0" for first product, actual cart_id for subsequent
  product_code: number;
  qty: number;
  action_event: CartActionEvent;
  tax_id?: number;
  tax_class_id?: number,
  tax_amount?: number;
  tax_breakdown?: TaxBreakdownItem[];
  shipping_address_id?: number;
  applied_coupons?: any[];
}

/** Single item in cart */
export interface CartItem {
  product_code: number;
  product_name: string;
  sku: string;
  qty: number;
  unit_price: number;
  net_amount: number;
  tax_id: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
}

/** Full cart response from API */
export interface Cart {
  cart_id: string;
  user_code: number;
  sub_total: number;
  order_status: string;
  shipping_amount: number;
  marketplace_fee: number;
  net_amount: number;
  payment_method: string | null;
  payment_status: string;
  shipping_address_id: number;
  billing_address_id: number;
  items: CartItem[];

  coupons?: AppliedCoupon[];
  coupon_discount?: number;
  grand_total?: number;
}

/** Local cart state */
export interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
}
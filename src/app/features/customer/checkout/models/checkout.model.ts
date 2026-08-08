// Cart  & CartItem
export interface CartItem {
  product_code: number;
  product_name: string;
  sku: string;
  qty: number;
  unit_price: number;
  net_amount: number;
  tax_id: number;
  tax_class_id?: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  tax_breakdown?: TaxBreakdownItem[]; // ✅ ADD THIS
}

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
  items: CartItem[];          // ✅ normalized lowercase (used internally)
  Items?: CartItem[];         // ✅ accept capital from backend
  coupons?: AppliedCoupon[];  // ✅ normalized lowercase
  Coupons?: AppliedCoupon[];  // ✅ accept capital from backend
  coupon_discount?: number;
  grand_total?: number;
}

// User Address Book
export interface AddressBook {
  address_book_id: number;
  user_code: number;
  full_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  is_default_billing: boolean;
  is_default_shipping: boolean;
}

// Payment
export type PaymentMethod = 'Online' | 'COD' | 'Bank Transfer' | 'Wallet';

export interface PaymentOption {
  method: PaymentMethod;
  label: string;
  icon: string;
  description: string;
  available: boolean;
}

// Place Order model
export interface PlaceOrderRequest {
  cart_id: string;
  shipping_address_id: number;
  billing_address_id: number;
  payment_method: PaymentMethod;
  shipping_amount: number;
}

export interface PlaceOrderResponse {
  order_id: string;
  order_no: string;
  order_status: string;
}

// Checkout State
export interface CheckoutState {
  cart: Cart | null;
  shippingAddress: AddressBook | null;
  billingAddress: AddressBook | null;
  paymentMethod: PaymentMethod | null;
  placedOrder: PlaceOrderResponse | null;
}



export interface AppliedCoupon {
  coupon_id: number;
  coupon_code: string;
  discountType: 'Percentage' | 'Value';
  discount_value: number;
  discount_applied: number;
  minimum_order_amount: number;
  can_be_clubbed: boolean;
}

export interface CouponValidateRequest {
  coupon_code: string;
  order_amount: number;
  current_applied_coupons: string[];
  user_code: number;
}

export interface CouponValidateResponse {
  coupon_id: number;
  coupon_code: string;
  discount_amount: number;
}

export interface CouponApiResponse {
  statusCode: number;
  message: string;
  data: CouponValidateResponse | null;
  requestId: string;
  timestamp: string;
}

// ✅ Coupon item shape used in cart API payload & response
export interface CartCouponPayloadItem {
  coupon_id: number;
  coupon_code: string;
  discount_amount: number;
}

// ✅ AddToCart request shape (supports all action events)
export interface AddToCartRequest {
  cart_id: string;
  product_code?: number;             // optional for ApplyCoupon event
  qty?: number;                      // optional for ApplyCoupon event
  action_event?: 'Add' | 'Update' | 'Delete' | 'ApplyCoupon' | ''; // ✅ Added ApplyCoupon
  applied_coupons?: CartCouponPayloadItem[];
  tax_id?: number;
  tax_amount?: number;
  tax_breakdown?: TaxBreakdownItem[];   // ✅ NEW
}

export interface TaxBreakdownItem {
  component_name: string;
  rate: number;
  calculation_type: string;
  calculated_amount: number;
}

export interface DeliveryCostRequest {
  post_discount_cart_total: number;
  destination_state: string;
  delivery_discount_amount: number;
}

export interface DeliveryCostResponse {
  policy_id_applied: number;
  base_fee: number;
  tax_amount: number;
  tax_type: string;
  discount_amount: number;
  final_total: number;
  calculation_snapshot: {
    engineDetails: {
      method: string;
      cartValueEvaluated: number;
      appliedPercentage: number;
      calculatedRawBase: number;
    };
    minMaxApplied: {
      min: number;
      max: number;
    };
  };
}


export interface SaveOrderDeliveryRequest {
  order_id: number;
  order_no: string;
  delivery_policy_id: number;
  delivery_base_fee: number;
  delivery_tax_amount: number;
  delivery_tax_type: string;
  delivery_discount_amount: number;
  delivery_final_total: number;
  calculation_snapshot_obj: {
    engineDetails: {
      method: string;
      cartValueEvaluated: number;
      appliedPercentage: number;
      calculatedRawBase: number;
    };
    minMaxApplied: {
      min: number;
      max: number;
    };
  };
}

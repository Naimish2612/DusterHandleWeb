// =========================================================================
// USER SECTION — Model Definitions
// Covers: Profile, Orders, Wishlist, Change Password
// =========================================================================

/* ── Profile ─────────────────────────────────────────────────────────── */

export interface UserProfile {
  user_code: number;
  user_name: string;
  full_name: string;
  email_id: string;
  mobile_no: string;
  phone_code: string;
  profile_photo_url?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHERS' | 'PREFER NOT TO SAY' | null;
  birthdate?: string | null;
  created_at: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
}

export interface UserState {
  profile: UserProfile | null;
  addresses: UserAddress[];
  isLoading: boolean;
  error: string | null;
}

export interface UserAddress {
  id: number;
  label: 'Home' | 'Work' | 'Other';
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export interface AddAddressPayload {
  user_code: number;
  address_type: 'shipping' | 'billing' | 'both';
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  phone?: string;
  is_default_shipping?: boolean;
  is_default_billing?: boolean;
  landmark?: string;
}

export interface UpdateAddressPayload extends Partial<AddAddressPayload> { }

export interface ProfileUpdatePayload {
  user_code: number;
  user_name: string;
  full_name: string;
  mobile_no: string;
  email_id: string;
  phone_code: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHERS' | 'PREFER NOT TO SAY' | null;
  birthdate?: string | null;
}

/* ── Change Password ─────────────────────────────────────────────────── */

export interface ChangePasswordPayload {
  user_code: number;
  password: string;
  new_password: string;
} 

// =========================================================================
// ORDER MODELS — Matching API response
// =========================================================================

/** Order status from API */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'return_requested'
  | 'returned';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderStatusConfig {
  label: string;
  color: string;
  icon: string;
  step: number;
}

/** Order item from API */
export interface OrderItem {
  order_txn_id: number;
  order_id: number;
  product_code: number;
  product_name: string;
  sku: string;
  description: string;
  qty: number;
  unit_price: number;
  net_amount: number;
  tax_id: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  image_url: string | null;
  is_reviewed?: boolean; // Add this field
}

/** Order from API */
export interface Order {
  order_id: number;
  order_no: string;
  user_code: number;
  order_date: string;
  sub_total: number;
  order_status: string;       // raw from API e.g. "Processing"
  shipping_amount: number;
  marketplace_fee: number;
  net_amount: number;
  payment_method: string;
  payment_status: string;     // raw from API e.g. "Pending"
  cart_details: any | null;
  shipping_address_id: number;
  billing_address_id: number;
  orderItems: OrderItem[];
  cart_id: string | null;
  invoice_file_path?: string | null;
  invoice_number?: string | null;          
  shipment_ack_number?: string | null;     
  shipment_tracking_url?: string | null;   
  discount_amount: number;

  tax_amount: number;
  tax_rate: number;          
  tax_label?: string; 
}

/** Order State for service */
export interface OrderState {
  orders: Order[];
  selectedOrder: Order | null;
  isLoading: boolean;
  error: string | null;
}

/* ── Wishlist ─────────────────────────────────────────────────────────── */

export interface WishlistProduct {
  id: number;
  product_code: number;
  name: string;
  slug: string;
  price: number;
  actual_price?: number;
  rating: number;
  review_count: number;
  image: string;
  in_stock: boolean;
  category: string;
  added_at: string;
  badge?: string;
  badge_type?: 'sale' | 'new' | 'hot';
}

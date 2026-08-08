// =========================================================================
// PRODUCT DETAIL — Model Definitions
// Matches API response structure; extensible for future fields
// =========================================================================

/**
 * Dynamic attribute map — values can be primitives or arrays.
 * Future attributes can be added without changing the model.
 */
export type AttributeValue =
  | string
  | number
  | boolean
  | string[]
  | number[];

export interface ProductAttribute {
  [key: string]: AttributeValue;
}

/**
* Product Image — maps 1:1 with API
*/
export interface ProductImage {
  image_url    : string;
  alt_text     : string;
  display_order: number;
  is_primary   : boolean;
}

/**
* Product Review — maps 1:1 with API
*/
export interface ProductReview {
  user_name            : string;
  rating               : string;  
  review_title         : string;
  comment              : string;
  is_verified_purchase : boolean;
  is_publish           : boolean;
  review_datetime      : string;
}

/**
 * Full product detail response — maps 1:1 with API
 */
export interface ProductDetailModel {
  product_code      : number;
  name              : string;
  sku               : string;
  slug              : string;
  description       : string;
  base_price        : number;
  category_id       : number;
  category_name     : string | null;
  sub_category_id   : number;
  sub_category_name : string | null;
  manufacturer_id   : number;
  manufacturer_name : string | null;
  attributes        : ProductAttribute | null;  
  attribute         : ProductAttribute; 
  is_active         : boolean;
  in_stock          : boolean;
  stock_quantity    : number;
  product_images    : ProductImage[];            
  product_reviews   : ProductReview[];           
  is_top_selling      : boolean;
  is_new_arrival      : boolean;
  tax_class_id?       : number; // ✅ NEW
  estimated_delivery_days?: number; // ✅ NEW
}

/**
 * Parsed attribute row for display in NzDescriptions
 */
export interface AttributeRow {
  key      : string;
  label    : string;
  value    : string;
  type     : 'text' | 'boolean' | 'array' | 'number';
  rawValue : AttributeValue;
}

/**
 * Cart item model
 */
export interface CartPayload {
  product_code       : number;
  quantity           : number;
  selected_attributes: Record<string, string | number>;
}

/**
 * Wishlist item model
 */
export interface WishlistPayload {
  product_code: number;
}

/**
 * Parsed review with numeric rating (for nz-rate)
 */
export interface ParsedReview extends ProductReview {
  numericRating: number;
  initials     : string;
  avatarColor  : string;
}

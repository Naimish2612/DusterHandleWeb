// ── API Image ──────────────────────────────────────────────────────────────
export interface ApiProductImage {
    image_url: string;
    alt_text: string;
    display_order: number;
    is_primary: boolean;
}

export interface ProductBadge {
  label: string;
  type: 'sale' | 'new' | 'hot';
}

// ── API Product ───────────────────────────────────────────────────────────
export interface ApiProduct {
    product_code: number;
    name: string;
    sku: string;
    slug: string;
    description: string;
    base_price: number;
    actual_price: number;
    rating: number;
    total_review: number;
    category_id: number;
    category_name: string | null;
    sub_category_id: number;
    sub_category_name: string | null;
    manufacturer_id: number;
    manufacturer_name: string | null;
    attributes: any | null;
    attribute: Record<string, any>;
    is_active: boolean;
    in_stock: boolean;
    stock_quantity: number;
    product_reviews: any | null;
    product_images: ApiProductImage[];
    is_top_selling: boolean;
    is_new_arrival: boolean;
    tax_class_id?: number;
    estimated_delivery_days?: number;
    badges: ProductBadge[];
}

// ── Filter API Models ──────────────────────────────────────────────────────
export interface ApiManufacturer {
    manufacturer_code: number;
    manufacturer_name: string;
    product_count: number;
}

export interface ApiCategory {
    category_code: number;
    category_name: string;
    product_count: number;

}

export interface ApiSubCategory {
    sub_category_code: number;
    sub_category_name: string;
    category_code: number;
    product_count: number;

}

// ── Frontend Product Model ─────────────────────────────────────────────────
export interface Product {
    id: number;
    name: string;
    sku: string;
    slug: string;
    description: string;
    price: number;
    actual_price?: number;
    rating: number;
    total_review: number;
    images: string[];
    image: string;
    badge?: string;
    badgeType?: 'sale' | 'new' | 'hot';
    category?: string;
    subCategory?: string;
    brand?: string;
    in_stock: boolean;
    stock_quantity: number;
    isTopSelling: boolean;
    isNewArrival: boolean;
    tax_class_id?: number;
    estimated_delivery_days?: number;
    badges?: ProductBadge[];
}

// ── Generic Dropdown Option from API ───────────────────────────────
export interface ApiDropdownOption {
    id: number;
    value: string;
    product_count: number;
}

// ── Filter Section (UI) ─────────────────────────────────────────────
export interface FilterOption {
    label: string;
    value: string;   // store ID as string for checkbox binding
    count: number;
}

export interface FilterSection {
    label: string;
    key: string;
    options: FilterOption[];
    loading?: boolean;
}

// ── Filter State ─────────────────────────────────────────────────────
export interface FilterState {
    manufacturers: ApiDropdownOption[];
    categories: ApiDropdownOption[];
    subCategories: ApiDropdownOption[];
    filterSections: FilterSection[];
}


// ── Catalog State ──────────────────────────────────────────────────────────
export interface CatalogState {
    topSelling: Product[];
    newArrivals: Product[];
    allProducts: Product[];
    selected: Product | null;
    filterSections: FilterSection[];
} 
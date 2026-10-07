import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap, forkJoin, catchError, EMPTY, of } from 'rxjs';

import { ApiCallService } from '../../../core/infrastructure/api-call.service';
import { ResponseEntity } from '../../../shared/models/response-entity';
import { API_ENDPOINTS } from '../../../core/global-api-endpoints/api-endpoints';

import {
    ApiProduct,
    ApiProductImage,
    Product,
    FilterSection,
    FilterState,
    CatalogState,
    ApiDropdownOption,
    ProductBadge,
    PriceVariant,
    CatalogFilterParams,
    PaginationMetadata,
} from '../models/catalog.model';

@Injectable({ providedIn: 'root' })
export class CatalogService {

    private apiCall = inject(ApiCallService);

    // ══════════════════════════════════════════════════════════════════════════
    // STATE SIGNALS
    // ══════════════════════════════════════════════════════════════════════════

    private _state = signal<CatalogState>({
        topSelling: [],
        newArrivals: [],
        allProducts: [],
        selected: null,
        filterSections: [],
        totalCount: 0,
        paginationMetadata: null,
    });

    private _filterState = signal<FilterState>({
        manufacturers: [],
        categories: [],
        subCategories: [],
        filterSections: [],
    });

    // ── Readonly computed signals ─────────────────────────────────────────────
    readonly state = this._state.asReadonly();
    readonly filterState = this._filterState.asReadonly();

    readonly topSelling = computed(() => this._state().topSelling);
    readonly newArrivals = computed(() => this._state().newArrivals);
    readonly allProducts = computed(() => this._state().allProducts);
    readonly selected = computed(() => this._state().selected);
    readonly filterSections = computed(() => this._filterState().filterSections);
    readonly manufacturers = computed(() => this._filterState().manufacturers);
    readonly categories = computed(() => this._filterState().categories);
    readonly subCategories = computed(() => this._filterState().subCategories);
    readonly totalCount = computed(() => this._state().totalCount || this._state().allProducts.length);
    readonly paginationMetadata = computed(() => this._state().paginationMetadata ?? null);

    // ══════════════════════════════════════════════════════════════════════════
    // CATALOG APIs
    // ══════════════════════════════════════════════════════════════════════════

    // ── Top Selling ──────────────────────────────────────────────────────────
    getTopSelling(): Observable<ResponseEntity<ApiProduct[]>> {
        return this.apiCall
            .get<ApiProduct[]>('common', API_ENDPOINTS.CUSTOMER.CATALOG.TOP_SELLING)
            .pipe(
                tap((res) =>
                    this.patchState({
                        topSelling: (res.data ?? []).map((p) => this.mapToProduct(p)),
                    })
                )
            );
    }

    // ── New Arrivals ─────────────────────────────────────────────────────────
    getNewArrivals(): Observable<ResponseEntity<ApiProduct[]>> {
        return this.apiCall
            .get<ApiProduct[]>('common', API_ENDPOINTS.CUSTOMER.CATALOG.NEW_ARRIVALS)
            .pipe(
                tap((res) =>
                    this.patchState({
                        newArrivals: (res.data ?? []).map((p) => this.mapToProduct(p)),
                    })
                )
            );
    }

    // ── All Products (Paginated) ──────────────────────────────────────────────
    getAllProducts(params: CatalogFilterParams = { PageNumber: 1, PageSize: 9 }): Observable<ResponseEntity<any>> {
        const payload: CatalogFilterParams = {
            PageNumber: params?.PageNumber ?? 1,
            PageSize: params?.PageSize ?? 9,
            ...(params?.category_id ? { category_id: params.category_id } : {}),
            ...(params?.sub_category_id ? { sub_category_id: params.sub_category_id } : {}),
            ...(params?.manufacturer_id ? { manufacturer_id: params.manufacturer_id } : {}),
            ...(params?.name ? { name: params.name } : {}),
            ...(params?.sku ? { sku: params.sku } : {}),
            ...(params?.in_stock != null ? { in_stock: params.in_stock } : {}),
        };

        return this.apiCall
            .post<any>('common', API_ENDPOINTS.CUSTOMER.CATALOG.ALL_PRODUCTS, payload)
            .pipe(
                tap((res) => {
                    const rawData = res?.data;
                    const isArray = Array.isArray(rawData);
                    const rawList: ApiProduct[] = isArray
                        ? rawData
                        : (rawData?.data ?? rawData?.Data ?? rawData?.items ?? rawData?.products ?? []);

                    const rawMeta = isArray
                        ? null
                        : (rawData?.metadata ?? rawData?.Metadata ?? (res as any)?.metadata ?? (res as any)?.Metadata ?? null);

                    let totalCount = 0;
                    if (rawMeta) {
                        totalCount = Number(
                            rawMeta.totalCount ??
                            rawMeta.TotalCount ??
                            rawMeta.total_count ??
                            rawMeta.totalRecords ??
                            rawMeta.TotalRecords ??
                            rawMeta.total ??
                            rawMeta.Total ??
                            0
                        );
                    }
                    if (!totalCount && !isArray) {
                        totalCount = Number(
                            rawData?.totalCount ??
                            rawData?.TotalCount ??
                            rawData?.total_count ??
                            rawData?.totalRecords ??
                            rawData?.TotalRecords ??
                            rawData?.total ??
                            rawData?.Total ??
                            (res as any)?.totalCount ??
                            (res as any)?.TotalCount ??
                            0
                        );
                    }
                    if (!totalCount && rawList.length > 0) {
                        totalCount = rawList.length;
                    }

                    const pageSize = Number(rawMeta?.pageSize ?? rawMeta?.PageSize ?? payload.PageSize ?? 9) || 9;
                    const currentPage = Number(rawMeta?.currentPage ?? rawMeta?.CurrentPage ?? payload.PageNumber ?? 1) || 1;
                    const totalPages = Number(rawMeta?.totalPages ?? rawMeta?.TotalPages ?? Math.max(1, Math.ceil(totalCount / pageSize))) || Math.max(1, Math.ceil(totalCount / pageSize));

                    const parsedMetadata: PaginationMetadata = {
                        currentPage,
                        totalPages,
                        pageSize,
                        totalCount,
                        hasPrevious: rawMeta?.hasPrevious ?? rawMeta?.HasPrevious ?? (currentPage > 1),
                        hasNext: rawMeta?.hasNext ?? rawMeta?.HasNext ?? (currentPage < totalPages),
                    };

                    const products = rawList.map((p) => this.mapToProduct(p));

                    this.patchState({
                        allProducts: products,
                        totalCount: totalCount,
                        paginationMetadata: parsedMetadata,
                    });
                })
            );
    }

    // ── Get Product By Slug ───────────────────────────────────────────────────
    getProductBySlug(slug: string): Observable<ResponseEntity<ApiProduct>> {
        return this.apiCall
            .get<ApiProduct>('common', `${API_ENDPOINTS.CUSTOMER.CATALOG.GET_PRODUCT_BY_SLUG}/${slug}`)
            .pipe(
                tap((res) =>
                    this.patchState({
                        selected: res.data ? this.mapToProduct(res.data) : null,
                    })
                )
            );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FILTER APIs  (3 separate endpoints)
    // ══════════════════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────
    // GET MANUFACTURERS
    // ─────────────────────────────────────────────────────────────
    getManufacturers(): Observable<ResponseEntity<ApiDropdownOption[]>> {
        return this.apiCall
            .get<ApiDropdownOption[]>('common', API_ENDPOINTS.CUSTOMER.DROPDOWN.MANUFACTURER)
            .pipe(
                tap((res) => {
                    this.patchFilterState({ manufacturers: res.data ?? [] });
                    this.rebuildFilterSections();
                })
            );
    }

    // ─────────────────────────────────────────────────────────────
    // GET CATEGORIES
    // ─────────────────────────────────────────────────────────────
    getCategories(): Observable<ResponseEntity<ApiDropdownOption[]>> {
        return this.apiCall
            .get<ApiDropdownOption[]>('common', API_ENDPOINTS.CUSTOMER.DROPDOWN.CATEGORY)
            .pipe(
                tap((res) => {
                    this.patchFilterState({ categories: res.data ?? [] });
                    this.rebuildFilterSections();
                })
            );
    }

    // ─────────────────────────────────────────────────────────────
    // GET SUBCATEGORIES (Requires categoryId)
    // ─────────────────────────────────────────────────────────────

    getSubCategories(categoryId: number): Observable<ResponseEntity<ApiDropdownOption[]>> {
        return this.apiCall
            .get<ApiDropdownOption[]>('common', `${API_ENDPOINTS.CUSTOMER.DROPDOWN.SUB_CATEGORY}/${categoryId}`)
            .pipe(
                tap((res) => {
                    this.patchFilterState({ subCategories: res.data ?? [] });
                    this.rebuildFilterSections();
                }),
                catchError((error) => {
                    console.warn('No subcategories for category:', categoryId);

                    this.patchFilterState({ subCategories: [] });
                    this.rebuildFilterSections();
                    return EMPTY;   // prevent crash
                })
            );
    }

    // ─────────────────────────────────────────────────────────────
    // LOAD ALL FILTERS (WITHOUT SUBCATEGORY)
    // ─────────────────────────────────────────────────────────────
    loadAllFilters(): Observable<any> {
        return forkJoin([
            this.apiCall.get<ApiDropdownOption[]>('common', API_ENDPOINTS.CUSTOMER.DROPDOWN.MANUFACTURER),
            this.apiCall.get<ApiDropdownOption[]>('common', API_ENDPOINTS.CUSTOMER.DROPDOWN.CATEGORY),
        ]).pipe(
            tap(([mfr, cat]) => {
                this.patchFilterState({
                    manufacturers: mfr.data ?? [],
                    categories: cat.data ?? [],
                    subCategories: [],
                });
                this.rebuildFilterSections();
            })
        );
    }

    // ── Reload Sub-Categories when a Category is selected ────────────────────
    onCategoryChange(categoryCode: number): Observable<ResponseEntity<ApiDropdownOption[]>> {
        return this.getSubCategories(categoryCode);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ══════════════════════════════════════════════════════════════════════════

    // ── Rebuild FilterSections[] from current FilterState ────────────────────
    private rebuildFilterSections(): void {
        const { manufacturers, categories, subCategories } = this._filterState();

        const sections: FilterSection[] = [];

        // ── Manufacturer Section ───────────────────────────
        if (manufacturers.length > 0) {
            sections.push({
                label: 'Manufacturer',
                key: 'brand',
                options: manufacturers.map((m) => ({
                    label: m.value,           // ← USE value
                    value: String(m.id),      // ← USE id
                    count: 0,
                })),
            });
        }

        // ── Category Section ───────────────────────────────
        if (categories.length > 0) {
            sections.push({
                label: 'Category',
                key: 'category',
                options: categories.map((c) => ({
                    label: c.value,
                    value: String(c.id),
                    count: 0,
                })),
            });
        }

        // ── SubCategory Section (only if exists) ───────────
        if (subCategories.length > 0) {
            sections.push({
                label: 'Sub-Category',
                key: 'subCategory',
                options: subCategories.map((s) => ({
                    label: s.value,
                    value: String(s.id),
                    count: 0,
                })),
            });
        }

        this.patchFilterState({ filterSections: sections });
    }

    // ── Patch catalog state ───────────────────────────────────────────────────
    private patchState(patch: Partial<CatalogState>): void {
        this._state.update((s) => ({ ...s, ...patch }));
    }

    // ── Patch filter state ────────────────────────────────────────────────────
    private patchFilterState(patch: Partial<FilterState>): void {
        this._filterState.update((s) => ({ ...s, ...patch }));
    }

    // ── Reset ─────────────────────────────────────────────────────────────────
    resetCatalog(): void {
        this._state.set({
            topSelling: [],
            newArrivals: [],
            allProducts: [],
            selected: null,
            filterSections: [],
            totalCount: 0,
            paginationMetadata: null,
        });
    }

    resetFilters(): void {
        this._filterState.set({
            manufacturers: [],
            categories: [],
            subCategories: [],
            filterSections: [],
        });
    }

    setSelected(product: Product | null): void {
        this.patchState({ selected: product });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MAPPER: API → Frontend Product Model
    // ══════════════════════════════════════════════════════════════════════════
    private mapToProduct(api: ApiProduct): Product {

        // ══════════════════════════════════════════════════════════════
        // ✅ MULTI-BADGE LOGIC
        // ══════════════════════════════════════════════════════════════
        const badges: ProductBadge[] = [];

        if (api.is_top_selling) {
            badges.push({ label: 'TOP SALE', type: 'sale' });
        }

        if (api.is_new_arrival) {
            badges.push({ label: 'NEW', type: 'new' });
        }

        // ── Images ────────────────────────────────────────────────────
        const images = (api.product_images ?? []).map(
            (img: ApiProductImage) => img.image_url
        );
        const primaryImg = (api.product_images ?? []).find(
            (img: ApiProductImage) => img.is_primary
        );
        const image = primaryImg?.image_url || images[0] || '';

        const parsedAttr = this.parseAttributes(api.attribute ?? api.attributes);

        return {
            id: api.product_code,
            name: api.name,
            sku: api.sku ?? '',
            slug: api.slug ?? '',
            description: api.description ?? '',
            price: api.base_price,
            actual_price: api.actual_price,
            discount_percentage: api.discount_percentage,
            rating: api.rating,
            total_review: api.total_review,
            images,
            image,
            badges,
            category: api.category_name ?? '',
            subCategory: api.sub_category_name ?? '',
            brand: api.manufacturer_name ?? '',
            in_stock: api.in_stock,
            stock_quantity: api.stock_quantity,
            isTopSelling: api.is_top_selling,
            isNewArrival: api.is_new_arrival,
            tax_class_id: api.tax_class_id,
            estimated_delivery_days: api.estimated_delivery_days,
            attribute: parsedAttr,
            attributes: parsedAttr,
        };
    }

    getSubCategoriesForMultiple(categoryIds: number[]): Observable<ResponseEntity<ApiDropdownOption[]>[]> {

        if (categoryIds.length === 0) {
            this.patchFilterState({ subCategories: [] });
            this.rebuildFilterSections();
            return of([]);
        }

        const calls = categoryIds.map(id =>
            this.apiCall
                .get<ApiDropdownOption[]>('common', `${API_ENDPOINTS.CUSTOMER.DROPDOWN.SUB_CATEGORY}/${id}`)
                .pipe(
                    catchError(() => {
                        console.warn(`No subcategories for category: ${id}`);
                        // ✅ Include ALL required ResponseEntity properties
                        return of({
                            statusCode: 200,
                            message: '',
                            data: [] as ApiDropdownOption[],
                            requestId: '',
                            timestamp: new Date().toISOString(),
                        } as ResponseEntity<ApiDropdownOption[]>);
                    })
                )
        );

        return forkJoin(calls).pipe(
            tap((responses) => {
                const allSubCats: ApiDropdownOption[] = [];
                const seenIds = new Set<number>();

                responses.forEach(res => {
                    (res.data ?? []).forEach(item => {
                        if (!seenIds.has(item.id)) {
                            seenIds.add(item.id);
                            allSubCats.push(item);
                        }
                    });
                });

                this.patchFilterState({ subCategories: allSubCats });
                this.rebuildFilterSections();
            })
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ATTRIBUTE & PRICE PARSING ENGINE
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Safely parse attributes from object, JSON string, or nested JSON string
     */
    parseAttributes(raw: any): Record<string, any> | null {
        if (!raw) return null;
        let data = raw;
        while (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch {
                break;
            }
        }
        return (typeof data === 'object' && data !== null && !Array.isArray(data)) ? data : null;
    }

    /**
     * Find price key in attributes using 'price' (or 'rate'/'mrp') keyword matching.
     * Matches: 'price', 'prices', 'price_(pcs.)', 'price_(box)', 'price_per_pc', etc.
     */
    findPriceKey(attrs: Record<string, any>): string | undefined {
        if (!attrs || typeof attrs !== 'object') return undefined;
        const keys = Object.keys(attrs);

        // 1. Exact match / standard keys
        const exact = keys.find(k => {
            const clean = k.trim().toLowerCase();
            return clean === 'price' || clean === 'prices' || clean === 'price_(pcs.)' || clean === 'price_(box)';
        });
        if (exact && attrs[exact] != null) return exact;

        // 2. Starts with 'price' (e.g. price_(pcs.), price_box, etc.)
        const startsWith = keys.find(k => {
            const clean = k.trim().toLowerCase();
            return clean.startsWith('price') && attrs[k] != null;
        });
        if (startsWith) return startsWith;

        // 3. Contains 'price' (e.g. unit_price, selling_price)
        const contains = keys.find(k => {
            const clean = k.trim().toLowerCase();
            return clean.includes('price') && attrs[k] != null;
        });
        if (contains) return contains;

        // 4. Fallback: rate or mrp
        return keys.find(k => {
            const clean = k.trim().toLowerCase();
            return (clean.includes('rate') || clean.includes('mrp')) && attrs[k] != null;
        });
    }

    /**
     * Extracts size-wise price variants (with packing if available) from attribute
     */
    extractPriceVariants(raw: any): PriceVariant[] {
        const attrs = this.parseAttributes(raw);
        if (!attrs) return [];

        const priceKey = this.findPriceKey(attrs);
        if (!priceKey || attrs[priceKey] == null) return [];

        const priceData = attrs[priceKey];

        // Find size key (case-insensitive)
        const sizeKey = Object.keys(attrs).find(k => {
            const lower = k.trim().toLowerCase();
            return lower.includes('size') || lower.includes('dimension') || lower.includes('length');
        });

        let sizeData = sizeKey ? attrs[sizeKey] : null;
        let sizes: string[] = [];
        if (Array.isArray(sizeData)) {
            sizes = sizeData.map(s => String(s).trim());
        } else if (typeof sizeData === 'string' && sizeData.trim()) {
            sizes = sizeData.split(',').map(s => s.trim()).filter(Boolean);
        }

        // Find packing info if available (e.g. 'packing_(box)', 'packing', 'pack')
        const packKey = Object.keys(attrs).find(k => {
            const clean = k.trim().toLowerCase();
            return clean.includes('pack') || clean.includes('box');
        });

        const packMapByName = new Map<string, string>();
        const packMapByIndex = new Map<number, string>();

        if (packKey && attrs[packKey]) {
            const packData = attrs[packKey];
            const isBoxKey = packKey.toLowerCase().includes('box');

            const parsePackVal = (v: any): string => {
                if (v == null) return '';
                const s = String(v).trim();
                if (/^\d+$/.test(s)) {
                    return isBoxKey ? `${s} / Box` : `${s} Pcs`;
                }
                return s;
            };

            if (Array.isArray(packData)) {
                packData.forEach((item, idx) => {
                    const str = String(item).trim();
                    const lastSlash = str.lastIndexOf('/');
                    if (lastSlash > 0) {
                        const sPart = str.substring(0, lastSlash).trim();
                        const pPart = str.substring(lastSlash + 1).trim();
                        packMapByName.set(sPart.toLowerCase(), parsePackVal(pPart));
                    } else {
                        packMapByIndex.set(idx, parsePackVal(str));
                    }
                });
            } else if (typeof packData === 'object' && packData !== null) {
                Object.entries(packData).forEach(([k, v]) => {
                    packMapByName.set(k.trim().toLowerCase(), parsePackVal(v));
                });
            } else if (typeof packData === 'string' || typeof packData === 'number') {
                packMapByIndex.set(0, parsePackVal(packData));
            }
        }

        const variants: PriceVariant[] = [];

        // Scenario 1: Array of objects [{ size: ..., price: ... }]
        if (Array.isArray(priceData) && priceData.length > 0 && typeof priceData[0] === 'object' && priceData[0] !== null) {
            priceData.forEach((item, index) => {
                const s = item.size ?? item.name ?? sizes[index] ?? `Size ${index + 1}`;
                const p = item.price ?? item.rate ?? item.value ?? item.base_price;
                if (p != null) {
                    const sizeStr = String(s);
                    const packing = packMapByName.get(sizeStr.toLowerCase()) ?? packMapByIndex.get(index);
                    variants.push({
                        size: sizeStr,
                        price: this.formatPrice(p),
                        ...(packing ? { packing } : {})
                    });
                }
            });
        }
        // Scenario 2: Object with key-value pairs { "100mm": 150, "150mm": 200 }
        else if (typeof priceData === 'object' && priceData !== null && !Array.isArray(priceData)) {
            let idx = 0;
            Object.entries(priceData).forEach(([s, p]) => {
                if (p != null) {
                    const packing = packMapByName.get(s.toLowerCase()) ?? packMapByIndex.get(idx);
                    variants.push({
                        size: s,
                        price: this.formatPrice(p as number | string),
                        ...(packing ? { packing } : {})
                    });
                    idx++;
                }
            });
        }
        // Scenario 3: Array of values (strings like "Aldrop 8\"/864" or numbers)
        else if (Array.isArray(priceData)) {
            priceData.forEach((val, index) => {
                if (val == null || val === '') return;
                const fallback = sizes[index] ?? (sizes.length === 1 && index === 0 ? sizes[0] : (priceData.length > 1 ? `Size ${index + 1}` : 'Base Price'));
                const parsed = this.parseSizePriceItem(val, fallback);
                if (parsed.price) {
                    const packing = packMapByName.get(parsed.size.toLowerCase()) ?? packMapByIndex.get(index);
                    variants.push({
                        ...parsed,
                        ...(packing ? { packing } : {})
                    });
                }
            });
        }
        // Scenario 4: String value e.g. "150, 200, 250" or "Aldrop 8\"/864, Aldrop 10\"/918"
        else if (typeof priceData === 'string' && priceData.trim()) {
            const rawParts = priceData.split(',').map(s => s.trim()).filter(Boolean);
            rawParts.forEach((part, index) => {
                const fallback = sizes[index] ?? (sizes.length === 1 && index === 0 ? sizes[0] : (rawParts.length > 1 ? `Size ${index + 1}` : 'Base Price'));
                const parsed = this.parseSizePriceItem(part, fallback);
                if (parsed.price) {
                    const packing = packMapByName.get(parsed.size.toLowerCase()) ?? packMapByIndex.get(index);
                    variants.push({
                        ...parsed,
                        ...(packing ? { packing } : {})
                    });
                }
            });
        }
        // Scenario 5: Single numeric value e.g. price: 150
        else if (typeof priceData === 'number') {
            const fallback = sizes[0] ?? 'Base Price';
            const packing = packMapByIndex.get(0);
            variants.push({
                size: fallback,
                price: this.formatPrice(priceData),
                ...(packing ? { packing } : {})
            });
        }

        return variants;
    }

    /**
     * Extracts first numeric attribute price from raw attributes for default variant
     */
    extractFirstAttributePrice(raw: any): number | null {
        const variants = this.extractPriceVariants(raw);
        if (variants && variants.length > 0 && variants[0].price) {
            const num = parseFloat(String(variants[0].price).replace(/[^0-9.]/g, ''));
            if (!isNaN(num) && num > 0) return num;
        }
        return null;
    }

    /**
     * Extracts first variant (size, price, packing) from raw attributes
     */
    extractFirstPriceVariant(raw: any): PriceVariant | null {
        const variants = this.extractPriceVariants(raw);
        return variants && variants.length > 0 ? variants[0] : null;
    }

    /**
     * Extracts the first variant size (or default size) from raw attributes
     */
    extractFirstVariantSize(raw: any): string | null {
        const variants = this.extractPriceVariants(raw);
        if (variants && variants.length > 0 && variants[0].size && variants[0].size !== 'Base Price') {
            return variants[0].size;
        }

        const attrs = this.parseAttributes(raw);
        if (attrs) {
            const sizeKey = Object.keys(attrs).find(k => {
                const lower = k.trim().toLowerCase();
                return lower.includes('size') || lower.includes('dimension') || lower.includes('length');
            });
            if (sizeKey && attrs[sizeKey] != null) {
                const val = attrs[sizeKey];
                if (Array.isArray(val) && val.length > 0 && val[0]) {
                    return String(val[0]).trim();
                } else if (typeof val === 'string' && val.trim()) {
                    const first = val.split(',')[0].trim();
                    if (first) return first;
                }
            }
        }
        return null;
    }

    /**
     * Determines tooltip header title based on price key unit
     */
    getPriceTooltipTitle(raw: any): string {
        const attrs = this.parseAttributes(raw);
        if (!attrs) return 'Size-Wise Pricing';

        const priceKey = this.findPriceKey(attrs);
        if (!priceKey) return 'Size-Wise Pricing';

        const lower = priceKey.toLowerCase();
        if (lower.includes('pcs') || lower.includes('pc')) {
            return 'Size-Wise Pricing (Per Pc)';
        }
        if (lower.includes('box')) {
            return 'Size-Wise Pricing (Per Box)';
        }
        if (lower.includes('set')) {
            return 'Size-Wise Pricing (Per Set)';
        }
        if (lower.includes('pair')) {
            return 'Size-Wise Pricing (Per Pair)';
        }
        if (lower.includes('meter') || lower.includes('mtr')) {
            return 'Size-Wise Pricing (Per Meter)';
        }
        if (lower.includes('kg') || lower.includes('kilo')) {
            return 'Size-Wise Pricing (Per Kg)';
        }

        return 'Size-Wise Pricing';
    }

    formatPrice(price: number | string | null | undefined): string {
        if (price == null || price === '') return '';
        const num = typeof price === 'number' ? price : parseFloat(String(price).replace(/[^0-9.]/g, ''));
        if (isNaN(num)) return String(price);
        return '₹' + num.toLocaleString('en-IN');
    }

    private parseSizePriceItem(val: any, fallbackSize: string): { size: string; price: string } {
        if (val == null) {
            return { size: fallbackSize, price: '' };
        }

        const str = String(val).trim();

        // 1. Slash delimiter e.g. "Aldrop 8\"/864"
        const lastSlash = str.lastIndexOf('/');
        if (lastSlash > 0 && lastSlash < str.length - 1) {
            const pricePart = str.substring(lastSlash + 1).trim();
            if (/\d/.test(pricePart)) {
                const sizePart = str.substring(0, lastSlash).trim();
                return {
                    size: sizePart || fallbackSize,
                    price: this.formatPrice(pricePart)
                };
            }
        }

        // 2. Colon delimiter e.g. "Aldrop 8\": 864"
        const lastColon = str.lastIndexOf(':');
        if (lastColon > 0 && lastColon < str.length - 1) {
            const pricePart = str.substring(lastColon + 1).trim();
            if (/\d/.test(pricePart)) {
                const sizePart = str.substring(0, lastColon).trim();
                return {
                    size: sizePart || fallbackSize,
                    price: this.formatPrice(pricePart)
                };
            }
        }

        // 3. Hyphen delimiter e.g. "Aldrop 8\" - 864"
        const lastDash = str.lastIndexOf(' - ');
        if (lastDash > 0 && lastDash < str.length - 3) {
            const pricePart = str.substring(lastDash + 3).trim();
            if (/\d/.test(pricePart)) {
                const sizePart = str.substring(0, lastDash).trim();
                return {
                    size: sizePart || fallbackSize,
                    price: this.formatPrice(pricePart)
                };
            }
        }

        return {
            size: fallbackSize,
            price: this.formatPrice(str)
        };
    }
}

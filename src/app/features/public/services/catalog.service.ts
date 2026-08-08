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

    // ── All Products ─────────────────────────────────────────────────────────
    getAllProducts(): Observable<ResponseEntity<ApiProduct[]>> {
        return this.apiCall
            .post<ApiProduct[]>('common', API_ENDPOINTS.CUSTOMER.CATALOG.ALL_PRODUCTS, {})
            .pipe(
                tap((res) =>
                    this.patchState({
                        allProducts: (res.data ?? []).map((p) => this.mapToProduct(p)),
                    })
                )
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

        return {
            id: api.product_code,
            name: api.name,
            sku: api.sku ?? '',
            slug: api.slug ?? '',
            description: api.description ?? '',
            price: api.base_price,
            actual_price: api.actual_price,
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
}
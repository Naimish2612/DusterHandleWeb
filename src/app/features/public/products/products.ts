import { Component, OnInit, signal, inject, DestroyRef, ChangeDetectorRef, ChangeDetectionStrategy, } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzMessageService } from 'ng-zorro-antd/message';

import { CatalogService } from '../services/catalog.service';
import { FilterSection, Product } from '../models/catalog.model';
import { WishlistService } from '../../customer/services/wishlist.service';
import { CartService } from '../services/cart.service';
import { SessionService } from '../../../core/infrastructure/session.service';


@Component({
    selector: 'app-products',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, FormsModule, RouterLink,
        NzIconModule, NzButtonModule, NzSelectModule,
        NzCheckboxModule, NzRateModule, NzPaginationModule,
        NzSliderModule, NzTagModule, NzDrawerModule,
        NzBadgeModule, NzSpinModule, NzEmptyModule,
        NzSkeletonModule,
    ],
    templateUrl: './products.html',
    styleUrl: './products.scss',
})
export class Products implements OnInit {

    // ── Inject ────────────────────────────────────────────────────────────────
    private catalog = inject(CatalogService);
    private message = inject(NzMessageService);
    private destroyRef = inject(DestroyRef);
    private cdr = inject(ChangeDetectorRef);
    private wishlistService = inject(WishlistService);
    private cartService = inject(CartService);
    private router = inject(Router);
    private sessionService = inject(SessionService);
    private route = inject(ActivatedRoute);

    // ── UI Signals ────────────────────────────────────────────────────────────
    mobileFilterOpen = signal(false);
    isWishlisted = signal(false);
    wishlistIds = signal<Set<number>>(new Set());
    isLoggedIn = signal<boolean>(false);

    // ── Loading / Error ───────────────────────────────────────────────────────
    loadingProducts = true;
    loadingFilters = true;
    errorProducts: string | null = null;
    errorFilters: string | null = null;
    loadingProductId = signal<number | null>(null);

    // ── Data ──────────────────────────────────────────────────────────────────
    allProducts: Product[] = [];
    filterSections: FilterSection[] = [];
    currentImageIndex: Record<number, number | undefined> = {};

    // ── Filter State ──────────────────────────────────────────────────────────
    selectedBrands: string[] = [];
    selectedCategories: string[] = [];
    selectedSubCategories: string[] = [];
    priceRange: [number, number] = [0, 1500000];
    currentPage = 1;
    pageSize = 12;

    // ── Sort ──────────────────────────────────────────────────────────────────
    selectedSort = 'default';

    sortOptions = [
        { label: 'A → Z', value: 'az' },
        { label: 'Z → A', value: 'za' },
        { label: 'New Arrivals', value: 'new' },
        { label: 'Price: Low to High', value: 'priceLow' },
        { label: 'Price: High to Low', value: 'priceHigh' },
        { label: 'Top Rated', value: 'rated' },
    ];

    // ── Placeholder Image ─────────────────────────────────────────────────────
    readonly placeholderImage: string = (() => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="#F8FAFC"/>
      <rect x="140" y="120" width="120" height="100" rx="10" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="2"/>
      <circle cx="172" cy="148" r="16" fill="#CBD5E1"/>
      <polygon points="140,220 182,172 218,200 252,176 300,220" fill="#CBD5E1"/>
      <text x="200" y="268" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#94A3B8">No Image</text>
    </svg>`;
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    })();

    // ══════════════════════════════════════════════════════════════════════════
    // COMPUTED: Display Products (Filter + Sort combined)
    // ══════════════════════════════════════════════════════════════════════════

    get displayProducts(): Product[] {
        let products = [...this.allProducts];

        // ── Step 1: Filter by Brand ────────────────────────────────────────────
        if (this.selectedBrands.length > 0) {
            products = products.filter(p => {
                const brandId = this.getBrandId(p.brand ?? '');
                return brandId > 0 && this.selectedBrands.includes(String(brandId));
            });
        }

        // ── Step 2: Filter by Category ────────────────────────────────────────
        if (this.selectedCategories.length > 0) {
            products = products.filter(p => {
                const catId = this.getCategoryId(p.category ?? '');
                return catId > 0 && this.selectedCategories.includes(String(catId));
            });
        }

        // ── Step 3: Filter by Sub-Category ────────────────────────────────────
        if (this.selectedSubCategories.length > 0) {
            products = products.filter(p => {
                const subId = this.getSubCategoryId(p.subCategory ?? '');
                return subId > 0 && this.selectedSubCategories.includes(String(subId));
            });
        }

        // ── Step 4: Filter by Price Range ─────────────────────────────────────
        products = products.filter(p =>
            p.price >= this.priceRange[0] && p.price <= this.priceRange[1]
        );

        // ── Step 5: Apply Sort ────────────────────────────────────────────────
        switch (this.selectedSort) {
            case 'az': products.sort((a, b) => (a.name ?? '').trim().toLowerCase().localeCompare((b.name ?? '').trim().toLowerCase(), 'en', { sensitivity: 'base', numeric: true })); break;
            case 'za': products.sort((a, b) => (b.name ?? '').trim().toLowerCase().localeCompare((a.name ?? '').trim().toLowerCase(), 'en', { sensitivity: 'base', numeric: true })); break;
            case 'priceLow': products.sort((a, b) => a.price - b.price); break;
            case 'priceHigh': products.sort((a, b) => b.price - a.price); break;
            case 'rated': products.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
            case 'new': products.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0)); break;
        }

        return products;
    }

    // ── Paginated Products ────────────────────────────────────────────────────
    get paginatedProducts(): Product[] {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        return this.displayProducts.slice(start, end);
    }

    // ── Reverse Lookup Helpers (name → id) ───────────────────────────────────
    private getBrandId(brandName: string): number {
        return this.catalog.manufacturers().find(m => m.value === brandName)?.id ?? 0;
    }

    private getCategoryId(categoryName: string): number {
        return this.catalog.categories().find(c => c.value === categoryName)?.id ?? 0;
    }

    private getSubCategoryId(subCategoryName: string): number {
        return this.catalog.subCategories().find(s => s.value === subCategoryName)?.id ?? 0;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ══════════════════════════════════════════════════════════════════════════

    ngOnInit(): void {

        this.loadProducts();
        this.loadFilters();

        const token = localStorage.getItem('ATOKEN');
        this.isLoggedIn.set(!!token);
        if (this.isLoggedIn()) {
            this.loadWishlistIds();
        }

        // Listen for query params change dynamically
        this.route.queryParams
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(params => {
                const queryCategory = params['category'] || history.state?.category;
                if (queryCategory && this.catalog.categories().length > 0) {
                    const cat = this.catalog.categories().find(
                        c => c.value.toLowerCase() === queryCategory.toLowerCase()
                    );
                    if (cat) {
                        this.selectedCategories = [String(cat.id)];
                        this.loadSubCategoriesForAll(this.selectedCategories);
                        this.currentPage = 1;
                        this.cdr.markForCheck();
                    }
                }
            });
    }

    // ── Load Products ─────────────────────────────────────────────────────────
    loadProducts(): void {
        this.loadingProducts = true;
        this.errorProducts = null;
        this.allProducts = [];

        this.catalog.getAllProducts()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.allProducts = this.catalog.allProducts();
                    this.loadingProducts = false;
                    this.cdr.markForCheck();
                },
                error: (err) => {
                    this.loadingProducts = false;
                    this.errorProducts = err?.message ?? 'Failed to load products';
                    this.message.error(this.errorProducts!);
                    this.cdr.markForCheck();
                },
            });
    }

    // ── Load Filters ─────────────────────────────────────────────────────────
    loadFilters(): void {
        this.loadingFilters = true;
        this.errorFilters = null;

        this.catalog.loadAllFilters()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.filterSections = this.catalog.filterSections();
                    this.loadingFilters = false;

                    const queryCategory = this.route.snapshot.queryParams['category'] || history.state?.category;
                    if (queryCategory) {
                        const cat = this.catalog.categories().find(
                            c => c.value.toLowerCase() === queryCategory.toLowerCase()
                        );
                        if (cat) {
                            this.selectedCategories = [String(cat.id)];
                            this.loadSubCategoriesForAll(this.selectedCategories);
                        }
                    }

                    this.cdr.markForCheck();
                },
                error: (err) => {
                    this.loadingFilters = false;
                    this.errorFilters = err?.message ?? 'Failed to load filters';
                    console.error('Filter load error:', err);
                    this.cdr.markForCheck();
                },
            });
    }

    loadWishlistIds(): void {
        this.wishlistService
            .getWishlist()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    const ids = new Set(
                        this.wishlistService.wishlist().map(p => p.product_code)
                    );
                    this.wishlistIds.set(ids);
                },
                error: () => {
                    console.error('Failed to load wishlist');
                }
            });
    }

    // ── Retry ─────────────────────────────────────────────────────────────────
    retryProducts(): void { this.loadProducts(); }
    retryFilters(): void { this.loadFilters(); }

    // ══════════════════════════════════════════════════════════════════════════
    // SORT
    // ══════════════════════════════════════════════════════════════════════════

    onSortChange(): void {
        this.currentPage = 1;        // reset to first page on sort
        this.cdr.markForCheck();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FILTERS
    // ══════════════════════════════════════════════════════════════════════════

    get activeFilterCount(): number {
        return this.selectedBrands.length + this.selectedCategories.length + this.selectedSubCategories.length;
    }

    isSelected(key: string, value: string): boolean {
        switch (key) {
            case 'brand': return this.selectedBrands.includes(value);
            case 'category': return this.selectedCategories.includes(value);
            case 'subCategory': return this.selectedSubCategories.includes(value);
            default: return false;
        }
    }

    // ── Toggle filter (single select per section) ─────────────────────────────
    toggleFilter(key: string, value: string): void {
        switch (key) {

            case 'brand':
                this.selectedBrands = this.toggle(this.selectedBrands, value);
                break;

            case 'category':
                const wasSelected = this.selectedCategories.includes(value);
                this.selectedCategories = this.toggle(this.selectedCategories, value);

                if (this.selectedCategories.length === 0) {
                    // ✅ All categories deselected → clear subcategories
                    this.clearSubCategories();
                } else {
                    // ✅ Load sub-categories for ALL currently selected categories
                    this.loadSubCategoriesForAll(this.selectedCategories);

                    // ✅ If a category was REMOVED, also remove its subcategories from selection
                    if (wasSelected) {
                        this.cleanupOrphanedSubCategories();
                    }
                }
                break;

            case 'subCategory':
                this.selectedSubCategories = this.toggle(this.selectedSubCategories, value);
                break;
        }

        this.currentPage = 1;
        this.cdr.markForCheck();
    }

    private loadSubCategoriesForAll(categoryIds: string[]): void {
        if (categoryIds.length === 0) {
            this.clearSubCategories();
            return;
        }

        // Mark sub-category section as loading
        this.filterSections = this.filterSections.map(s =>
            s.key === 'subCategory'
                ? { ...s, loading: true, options: [] }
                : s
        );

        // If no subCategory section exists yet, add one
        if (!this.filterSections.some(s => s.key === 'subCategory')) {
            this.filterSections = [
                ...this.filterSections,
                { key: 'subCategory', label: 'Sub-Category', loading: true, options: [] } as FilterSection
            ];
        }
        this.cdr.markForCheck();

        this.catalog.getSubCategoriesForMultiple(categoryIds.map(Number))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.filterSections = this.catalog.filterSections();
                    // ✅ After refresh, also clean orphaned sub-cats
                    this.cleanupOrphanedSubCategories();
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.filterSections = this.filterSections.map(s => s.key === 'subCategory' ? { ...s, loading: false, options: [] } : s);
                    this.cdr.markForCheck();
                },
            });
    }

    private cleanupOrphanedSubCategories(): void {
        const subCatSection = this.filterSections.find(s => s.key === 'subCategory');
        if (!subCatSection) {
            this.selectedSubCategories = [];
            return;
        }
        const availableIds = subCatSection.options.map(o => o.value);
        this.selectedSubCategories = this.selectedSubCategories.filter(s =>
            availableIds.includes(s)
        );
    }

    private clearSubCategories(): void {
        this.selectedSubCategories = [];
        this.filterSections = this.filterSections.filter(s => s.key !== 'subCategory');
        this.cdr.markForCheck();
    }

    private toggle(arr: string[], value: string): string[] {
        return arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value];
    }

    clearFilters(): void {
        this.selectedBrands = [];
        this.selectedCategories = [];
        this.selectedSubCategories = [];
        this.priceRange = [0, 1500000];
        this.currentPage = 1;
        this.filterSections = this.filterSections.filter(
            s => s.key !== 'subCategory'
        );
        this.cdr.markForCheck();
    }

    removeBrand(b: string): void {
        this.selectedBrands = this.selectedBrands.filter(x => x !== b);
        this.currentPage = 1;
        this.cdr.markForCheck();
    }

    removeCategory(c: string): void {
        this.selectedCategories = this.selectedCategories.filter(x => x !== c);
        if (this.selectedCategories.length === 0) {
            this.clearSubCategories();
        } else {
            this.loadSubCategoriesForAll(this.selectedCategories);
            this.cleanupOrphanedSubCategories();
        }
        this.currentPage = 1;
        this.cdr.markForCheck();
    }

    removeSubCategory(s: string): void {
        this.selectedSubCategories = this.selectedSubCategories.filter(x => x !== s);
        this.currentPage = 1;
        this.cdr.markForCheck();
    }

    getFilterLabel(key: string, value: string): string {
        const section = this.filterSections.find(s => s.key === key);
        const option = section?.options.find(o => o.value === value);
        return option?.label ?? value;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // IMAGE HELPERS
    // ══════════════════════════════════════════════════════════════════════════

    getImage(product: Product): string {
        const idx = this.currentImageIndex[product.id] ?? 0;
        return product.images?.[idx] || product.image || '';
    }

    onImageError(event: Event): void {
        const img = event.target as HTMLImageElement;
        img.onerror = null;
        img.src = this.placeholderImage;
    }

    nextImage(product: Product, event: Event): void {
        event.preventDefault(); event.stopPropagation();
        if (!product.images?.length) return;
        const cur = this.currentImageIndex[product.id] ?? 0;
        this.currentImageIndex[product.id] = (cur + 1) % product.images.length;
        this.cdr.markForCheck();
    }

    prevImage(product: Product, event: Event): void {
        event.preventDefault(); event.stopPropagation();
        if (!product.images?.length) return;
        const cur = this.currentImageIndex[product.id] ?? 0;
        this.currentImageIndex[product.id] = (cur - 1 + product.images.length) % product.images.length;
        this.cdr.markForCheck();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PRICE + CART HELPERS
    // ══════════════════════════════════════════════════════════════════════════
    discount(product: any): number {
        if (!product.actual_price || !product.price) return 0;
        const percent = ((product.actual_price - product.price) / product.actual_price) * 100;
        return percent > 0 ? Math.max(1, Math.round(percent)) : 0;
    }

    formatPrice(price: number): string { return '₹' + price.toLocaleString('en-IN'); }

    onAddToCart(product: Product): void {
        if (!product.in_stock) {
            this.message.warning('Product is out of stock');
            return;
        }

        // ✅ Check login before calling cart API
        if (!this.sessionService.isAuthenticated() ||
            this.sessionService.getUserType() !== 'CUSTOMER') {

            this.message.warning('Please login to add items to cart');
            this.router.navigate(['/auth/login'], {
                queryParams: { returnUrl: this.router.url }
            });
            return;
        }

        this.loadingProductId.set(product.id);

        this.cartService.quickAddToCart(product.id, product.price, product.tax_class_id ?? 1)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.loadingProductId.set(null);
                    this.message.success(`${product.name} added to cart! 🛒`);
                },
                error: (err) => {
                    this.loadingProductId.set(null);

                    // ✅ Handle 401 (session expired)
                    if (err?.status === 401) {
                        this.message.warning('Session expired. Please login again');
                        this.router.navigate(['/auth/login'], {
                            queryParams: { returnUrl: this.router.url }
                        });
                    } else {
                        this.message.error(err?.error?.message || 'Failed to add to cart');
                    }
                },
            });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PAGINATION
    // ══════════════════════════════════════════════════════════════════════════

    onPageChange(page: number): void {
        this.currentPage = page;
        this.cdr.markForCheck();
        window.scrollTo({ top: 0, behavior: 'smooth' });   // scroll to top on page change
    }

    toggleWishlist(product: Product, event: Event): void {
        event.preventDefault();
        event.stopPropagation();

        const productCode = product.id;
        if (!productCode) return;

        const isCurrentlyWishlisted = this.wishlistIds().has(productCode);

        const request$ = isCurrentlyWishlisted
            ? this.wishlistService.removeFromWishlist(productCode)
            : this.wishlistService.addToWishlist(productCode);

        request$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {

                    const ids = new Set(this.wishlistIds());

                    if (isCurrentlyWishlisted) {
                        ids.delete(productCode);
                        this.message.info('Removed from wishlist');
                    } else {
                        ids.add(productCode);
                        this.message.success('Added to wishlist ❤️');
                    }

                    this.wishlistIds.set(ids);
                },
                error: () => {
                    this.message.error('Wishlist action failed');
                }
            });
    }

}
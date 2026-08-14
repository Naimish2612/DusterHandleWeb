import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy, DestroyRef, } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';

import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';

import { CatalogService } from '../services/catalog.service';
import { CartService } from '../services/cart.service';

import {
    ProductDetailModel,
    ProductReview,
    AttributeRow,
    AttributeValue,
    ParsedReview,
    CartPayload,
} from '../product-detail/product-detail.model';
import { WishlistService } from '../../customer/services/wishlist.service';
import { SessionService } from '../../../core/infrastructure/session.service';

// ── Avatar colour palette for review initials ──────────────────────────
const AVATAR_COLORS = [
    '#009CDE', '#52c41a', '#faad14', '#9c27b0',
    '#1890ff', '#ff4d4f', '#00b96b', '#722ed1',
];

@Component({
    selector: 'app-product-detail',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        NzSpinModule,
        NzEmptyModule,
        NzButtonModule,
        NzTagModule,
        NzRateModule,
        NzDescriptionsModule,
        NzDividerModule,
        NzAvatarModule,
        NzIconModule,
        NzTabsModule,
        NzProgressModule,
        NzBreadCrumbModule,
        NzSkeletonModule,
        NzToolTipModule,
    ],
    templateUrl: './product-detail.html',
    styleUrl: './product-detail.scss',
})
export class ProductDetail implements OnInit {

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private catalog = inject(CatalogService);
    private message = inject(NzMessageService);
    private destroyRef = inject(DestroyRef);
    private wishlistService = inject(WishlistService);
    private cartService = inject(CartService);
    private sessionService = inject(SessionService);

    // ── Auth ─────────────────────────────────────────────────────────
    isLoggedIn = signal<boolean>(false);

    // ── Loading state ────────────────────────────────────────────────
    isLoading = signal(true);
    error = signal<string | null>(null);

    // ── Product data ─────────────────────────────────────────────────
    product = signal<ProductDetailModel | null>(null);

    // ── Image state ──────────────────────────────────────────────────
    activeImageIndex = signal(0);

    // ── Cart state ───────────────────────────────────────────────────
    quantity = signal(1);
    isAddingToCart = signal(false);

    // ── Wishlist state ───────────────────────────────────────────────
    wishlistIds = signal<Set<number>>(new Set<number>());

    /**
     * ✅ Reactive flag — auto-updates whenever:
     *    - product changes
     *    - wishlistIds changes (after add/remove)
     */
    isWishlisted = computed<boolean>(() => {
        const code = this.product()?.product_code;
        if (code == null) return false;
        return this.wishlistIds().has(Number(code));
    });

    // ── Dynamic attribute selections ─────────────────────────────────
    selectedVariants = signal<Record<string, string | number>>({});

    // ── Computed: parsed attribute rows ──────────────────────────────
    attributeRows = computed<AttributeRow[]>(() => {
        const p = this.product();
        if (!p?.attribute) return [];
        return Object.entries(p.attribute).map(([key, value]) => ({
            key,
            label: this.formatLabel(key),
            value: this.formatValue(value),
            type: this.resolveType(value),
            rawValue: value,
        }));
    });

    // ── Computed: reviews with parsed ratings ────────────────────────
    parsedReviews = computed<ParsedReview[]>(() => {
        const p = this.product();
        if (!p?.product_reviews?.length) return [];
        return p.product_reviews.map((r, i) => ({
            ...r,
            numericRating: parseFloat(r.rating) || 0,
            initials: this.getInitials(r.user_name),
            avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
        }));
    });

    // ── Computed: average rating ─────────────────────────────────────
    averageRating = computed<number>(() => {
        const reviews = this.parsedReviews();
        if (!reviews.length) return 0;
        const sum = reviews.reduce((acc, r) => acc + r.numericRating, 0);
        return Math.round((sum / reviews.length) * 10) / 10;
    });

    // ── Computed: rating distribution ────────────────────────────────
    ratingDistribution = computed<{ star: number; count: number; percent: number }[]>(() => {
        const reviews = this.parsedReviews();
        const total = reviews.length;
        return [5, 4, 3, 2, 1].map(star => {
            const count = reviews.filter(r => Math.round(r.numericRating) === star).length;
            return { star, count, percent: total ? Math.round((count / total) * 100) : 0 };
        });
    });

    // ── Computed: array-type attributes ──────────────────────────────
    variantAttributes = computed<AttributeRow[]>(() =>
        this.attributeRows().filter(r => r.type === 'array')
    );

    // ─────────────────────────────────────────────────────────────────
    ngOnInit(): void {
        const token = localStorage.getItem('ATOKEN');
        this.isLoggedIn.set(!!token);

        if (this.isLoggedIn()) {
            this.loadWishlistIds();
        }

        const slug = this.route.snapshot.paramMap.get('id');
        if (!slug) {
            this.error.set('Product not found');
            this.isLoading.set(false);
            return;
        }

        this.catalog.getProductBySlug(slug)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    if (res?.data) {
                        this.product.set(res.data);
                        this.initVariantSelections();
                    } else {
                        this.error.set('Product not available');
                    }
                    this.isLoading.set(false);
                },
                error: (err) => {
                    this.error.set(err?.message ?? 'Failed to load product');
                    this.isLoading.set(false);
                },
            });
    }

    // ── Load wishlist IDs (FIXED: ensure number type) ────────────────
    loadWishlistIds(): void {
        this.wishlistService
            .getWishlist()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    const ids = new Set<number>(
                        this.wishlistService.wishlist().map(p => Number(p.product_code))
                    );
                    this.wishlistIds.set(ids);
                },
                error: () => {
                    console.error('Failed to load wishlist');
                },
            });
    }

    // ── Variant selection ────────────────────────────────────────────
    private initVariantSelections(): void {
        const p = this.product();
        if (!p?.attribute) return;
        const initial: Record<string, string | number> = {};
        Object.entries(p.attribute).forEach(([key, val]) => {
            if (Array.isArray(val) && val.length) {
                initial[key] = val[0];
            }
        });
        this.selectedVariants.set(initial);
    }

    selectVariant(key: string, value: string | number): void {
        this.selectedVariants.update(current => ({ ...current, [key]: value }));
    }

    isVariantSelected(key: string, value: string | number): boolean {
        return this.selectedVariants()[key] === value;
    }

    // ── Quantity controls commented out ──
    /*
    incrementQty(): void {
        const max = this.product()?.stock_quantity ?? 99;
        if (this.quantity() < max) this.quantity.update(q => q + 1);
    }

    decrementQty(): void {
        if (this.quantity() > 1) this.quantity.update(q => q - 1);
    }
    */

    // ── Image navigation ─────────────────────────────────────────────
    selectImage(index: number): void {
        this.activeImageIndex.set(index);
    }

    // ── Cart action commented out ──
    /*
    addToCart(buyNow: boolean = false): void {
        const product = this.product();
        if (!product || !product.in_stock) return;

        if (
            !this.sessionService.isAuthenticated() ||
            this.sessionService.getUserType() !== 'CUSTOMER'
        ) {
            this.message.warning('Please login to continue shopping');
            this.router.navigate(['/auth/login'], {
                queryParams: { returnUrl: this.router.url },
            });
            return;
        }

        const productCode = product.product_code;
        const qty = this.quantity();
        const isAlreadyInCart = this.cartService.isProductInCart(productCode);

        this.isAddingToCart.set(true);

        const request$ = isAlreadyInCart ? this.cartService.updateCartItem(
                productCode,
                this.cartService.getProductQty(productCode) + qty,
                product.base_price,
                product.tax_class_id ?? 1
            )
            : this.cartService.addToCart(productCode, qty, product.base_price, product.tax_class_id ?? 1);

        request$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.isAddingToCart.set(false);
                    if (buyNow) {
                        this.message.success(`${product.name} added! Redirecting to cart... 🛒`);
                        this.router.navigate(['/customer/checkout']);
                    } else {
                        this.message.success(
                            isAlreadyInCart
                                ? `Cart updated! ${product.name} 🛒`
                                : `${product.name} added to cart! 🛒`
                        );
                    }
                },
                error: (err) => {
                    this.isAddingToCart.set(false);
                    if (err?.status === 401) {
                        this.message.warning('Session expired. Please login again');
                        this.router.navigate(['/auth/login'], {
                            queryParams: { returnUrl: this.router.url },
                        });
                    } else {
                        this.message.error(
                            err?.error?.message || 'Failed to add to cart. Please try again.'
                        );
                    }
                },
            });
    }
    */

    // ── Wishlist action (FIXED: update wishlistIds Set) ──────────────
    toggleWishlist(): void {
        const product = this.product();
        if (!product) return;

        const productCode = Number(product.product_code);
        const isCurrentlyWishlisted = this.isWishlisted();

        const request$ = isCurrentlyWishlisted
            ? this.wishlistService.removeFromWishlist(productCode)
            : this.wishlistService.addToWishlist(productCode);

        request$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    // ✅ Update Set immutably to trigger signal change
                    const updated = new Set(this.wishlistIds());
                    if (isCurrentlyWishlisted) {
                        updated.delete(productCode);
                        this.message.success('Removed from wishlist');
                    } else {
                        updated.add(productCode);
                        this.message.success('Added to wishlist ❤️');
                    }
                    this.wishlistIds.set(updated);
                },
                error: () => {
                    this.message.error('Wishlist action failed');
                },
            });
    }

    // ── Helpers ──────────────────────────────────────────────────────
    formatLabel(key: string): string {
        return key
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/\s+/g, ' ')
            .trim();
    }

    formatValue(value: AttributeValue): string {
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (Array.isArray(value)) return value.join(', ');
        return String(value);
    }

    resolveType(value: AttributeValue): 'text' | 'boolean' | 'array' | 'number' {
        if (typeof value === 'boolean') return 'boolean';
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'number') return 'number';
        return 'text';
    }

    getInitials(name: string): string {
        return name
            .split(' ')
            .slice(0, 2)
            .map(n => n[0]?.toUpperCase() ?? '')
            .join('');
    }

    formatPrice(price: number): string {
        return '₹' + price.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    }

    trackByKey(_: number, row: AttributeRow): string {
        return row.key;
    }

    trackByReview(_: number, r: ParsedReview): string {
        return r.user_name + r.review_datetime;
    }

    // ── Fallback Image ───────────────────────────────────────────────
    readonly placeholderImage: string = (() => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
                    <rect width="600" height="600" fill="#F8FAFC"/>
                    <rect x="200" y="180" width="200" height="160" rx="16" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="2"/>
                    <circle cx="250" cy="220" r="28" fill="#CBD5E1"/>
                    <polygon points="200,340 268,258 325,305 375,268 440,340" fill="#CBD5E1"/>
                    <text x="300" y="405" text-anchor="middle"
                            font-family="Arial, sans-serif"
                            font-size="18"
                            fill="#94A3B8">
                        No Image Available
                    </text>
                    </svg>`;
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    })();
}
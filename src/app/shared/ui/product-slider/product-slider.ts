import { Component, Input, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, inject, DestroyRef, NgZone, OnInit, SimpleChanges, OnChanges, EventEmitter, Output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Product } from '../../../features/public/models/catalog.model';
import { WishlistService } from '../../../features/customer/services/wishlist.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartService } from '../../../features/public/services/cart.service';
import { SessionService } from '../../../core/infrastructure/session.service';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';

@Component({
  selector: 'app-product-slider',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NzIconModule, NzButtonModule, NzRateModule, NzSkeletonModule],
  templateUrl: './product-slider.html',
  styleUrl: './product-slider.scss',
})
export class ProductSlider implements OnInit, OnChanges, AfterViewInit, OnDestroy {

  @Input() sectionTag = '';
  @Input() sectionTitle = '';
  @Input() sectionSub = '';
  @Input() products: Product[] = [];
  @Input() isDark = false;
  @Input() Sliderloading = false;
  @Input() hasError = false;
  @Output() retryClicked = new EventEmitter<void>();

  readonly skeletonItems = [1, 2, 3, 4, 5, 6];

  @ViewChild('track') track!: ElementRef<HTMLDivElement>;

  wishlistIds = signal<Set<number>>(new Set());

  // ✅ Track which product is being added to cart (for per-card loader)
  loadingCartId = signal<number | null>(null);
  isLoggedIn = signal<boolean>(false);

  private animationFrameId!: number;

  private isPaused = false;
  private wishlistService = inject(WishlistService);
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);
  private sessionService = inject(SessionService);
  private router = inject(Router);

  constructor(private ngZone: NgZone, private message: NzMessageService) { }

  ngOnInit(): void {
    this.checkAuthStatus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['Sliderloading'] &&
      changes['Sliderloading'].previousValue === true &&
      changes['Sliderloading'].currentValue === false &&
      !this.hasError
    ) {
      setTimeout(() => this.initAutoScroll(), 150);
    }
  }

  ngAfterViewInit(): void {
    if (!this.Sliderloading && !this.hasError) {
      setTimeout(() => this.initAutoScroll(), 100);
    }
  }

  onRetry(): void {
    this.retryClicked.emit();
  }

  private checkAuthStatus(): void {
    const token = localStorage.getItem('ATOKEN');
    this.isLoggedIn.set(!!token);
    // If logged in, load existing wishlist (optional)
    if (this.isLoggedIn()) {
      this.loadWishlist();
    }
  }

  private loadWishlist(): void {
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

  get allProducts(): Product[] {
    return [...(this.products ?? []), ...(this.products ?? [])];
  }


  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src = this.placeholderImage;
  }

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

  initAutoScroll(): void {
    const element = this.track?.nativeElement;
    if (!element) return;
    cancelAnimationFrame(this.animationFrameId);

    const originalWidth = element.scrollWidth / 2;

    this.ngZone.runOutsideAngular(() => {
      const step = () => {
        if (!this.isPaused) {
          element.scrollLeft += 1;
          if (element.scrollLeft >= originalWidth) {
            element.scrollLeft = 0;
          }
        }
        this.animationFrameId = requestAnimationFrame(step);
      };
      this.animationFrameId = requestAnimationFrame(step);
    });
  }

  pauseScroll(): void {
    this.isPaused = true;
  }

  resumeScroll(): void {
    this.isPaused = false;
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationFrameId);
  }

  // =============================
  // ✅ WISHLIST
  // =============================

  toggleWishlist(product: Product, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const ids = new Set(this.wishlistIds());
    const exists = ids.has(product.id);

    const request$ = exists
      ? this.wishlistService.removeFromWishlist(product.id)
      : this.wishlistService.addToWishlist(product.id);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (exists) {
            ids.delete(product.id);
            this.message.info('Removed from wishlist');
          } else {
            ids.add(product.id);
            this.message.success('Added to wishlist ❤️');
          }
          this.wishlistIds.set(ids);
        },
        error: () => {
          this.message.error('Wishlist action failed');
        }
      });
  }

  isWishlisted(id: number): boolean {
    return this.wishlistIds().has(id);
  }

  // =============================
  // ✅ ADD TO CART
  // =============================
  addToCart(product: Product, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!product.in_stock) {
      this.message.warning('Product is out of stock');
      return;
    }

    // ✅ Pre-check: skip API call if not logged in
    if (!this.isLoggedInCustomer()) {
      this.redirectToLogin();
      return;
    }

    this.loadingCartId.set(product.id);

    this.cartService
      .quickAddToCart(product.id, product.price, product.tax_class_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadingCartId.set(null);
          this.message.success(`"${product.name}" added to cart 🛒`);
        },
        error: (err) => {
          this.loadingCartId.set(null);

          // Fallback: handle 401 from server
          if (err?.status === 401) {
            this.redirectToLogin();
          } else {
            this.message.error(
              err?.error?.message || 'Failed to add to cart. Please try again.'
            );
          }
        },
      });
  }

  /**
   * ✅ Check if user can add to cart
   */
  private isLoggedInCustomer(): boolean {
    return this.sessionService.isAuthenticated() && this.sessionService.getUserType() === 'CUSTOMER';
  }

  /**
   * ✅ Redirect to login with current page as return URL
   */
  private redirectToLogin(): void {
    this.message.warning('Please login to continue shopping');
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  /**
   * Check if specific product card is loading
   */
  isAddingToCart(productId: number): boolean {
    return this.loadingCartId() === productId;
  }

  // =============================
  // ✅ HELPERS
  // =============================

  discount(product: any): number {
    if (!product.actual_price || !product.price) return 0;
    const percent = ((product.actual_price - product.price) / product.actual_price) * 100;
    return percent > 0 ? Math.max(1, Math.round(percent)) : 0;
  }

  formatPrice(price: number): string {
    return '₹' + price.toLocaleString('en-IN');
  }
}
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { WishlistProduct } from '../models/user.common.model';
import { NzMessageService } from 'ng-zorro-antd/message';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { WishlistService } from '../services/wishlist.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?w=400&q=80`;

@Component({
  selector: 'app-my-wishlist',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzIconModule,
    NzButtonModule,
    NzTagModule,
    NzRateModule,
    NzEmptyModule,
    NzSkeletonModule,
    NzSelectModule,
    NzInputModule,
    NzPopconfirmModule,
    NzToolTipModule,
    NzBadgeModule,
  ],
  templateUrl: './my-wishlist.html',
  styleUrl: './my-wishlist.scss',
})
export class MyWishlist implements OnInit {
  isLoading = signal(true);
  addingToCart = signal<Set<number>>(new Set());
  searchText = signal('');
  sortBy = signal('newest');
  private wishlistService = inject(WishlistService);
  private destroyRef = inject(DestroyRef);
  wishlist = this.wishlistService.wishlist;

  sortOptions = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Price: Low → High', value: 'priceLow' },
    { label: 'Price: High → Low', value: 'priceHigh' },
    { label: 'Top Rated', value: 'rated' },
    { label: 'Name A → Z', value: 'az' },
  ];

  filteredList = computed(() => {
    let list = this.wishlist();
    const search = this.searchText().toLowerCase().trim();

    if (search) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(search) || p.category.toLowerCase().includes(search),
      );
    }

    switch (this.sortBy()) {
      case 'priceLow':
        return [...list].sort((a, b) => a.price - b.price);
      case 'priceHigh':
        return [...list].sort((a, b) => b.price - a.price);
      case 'rated':
        return [...list].sort((a, b) => b.rating - a.rating);
      case 'az':
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
      default:
        return [...list].sort(
          (a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime(),
        );
    }
  });

  get inStockCount(): number {
    return this.wishlist().filter((p) => p.in_stock).length;
  }
  get outStockCount(): number {
    return this.wishlist().filter((p) => !p.in_stock).length;
  }

  constructor(private message: NzMessageService) { }

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.isLoading.set(true);

    this.wishlistService
      .getWishlist()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.message.error('Failed to load wishlist');
        }
      });
  }

  removeFromWishlist(product: WishlistProduct): void {
    this.wishlistService
      .removeFromWishlist(product.product_code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.wishlistService.removeLocal(product.product_code);
          // this.wishlist.set(this.wishlistService.wishlist());
          this.message.success(`"${product.name}" removed from wishlist`);
        },
        error: () => {
          this.message.error('Failed to remove from wishlist');
        }
      });
  }

  addToCart(product: WishlistProduct): void {
    const ids = new Set(this.addingToCart());
    ids.add(product.id);
    this.addingToCart.set(ids);

    setTimeout(() => {
      const updated = new Set(this.addingToCart());
      updated.delete(product.id);
      this.addingToCart.set(updated);
      this.message.success(`"${product.name}" added to cart 🛒`);
    }, 900);
  }

  addAllToCart(): void {
    const inStock = this.wishlist().filter((p) => p.in_stock);
    inStock.forEach((p) => this.addToCart(p));
    this.message.success(`${inStock.length} items added to cart!`);
  }

  clearAll(): void {

    const items = this.wishlist();
    if (!items.length) return;

    this.isLoading.set(true);

    forkJoin(
      items.map(item =>
        this.wishlistService.removeFromWishlist(item.product_code)
      )
    ).subscribe({
      next: () => {
        this.loadWishlist();
        this.message.success('Wishlist cleared ✅');
      },
      error: () => {
        this.message.error('Failed to clear wishlist');
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  isAddingToCart(id: number): boolean {
    return this.addingToCart().has(id);
  }

  discount(product: any): number {
    if (!product.actual_price || !product.price) return 0;
    const percent = ((product.actual_price - product.price) / product.actual_price) * 100;
    return percent > 0 ? Math.max(1, Math.round(percent)) : 0;
  }

  formatPrice(price: number): string {
    return '₹' + price.toLocaleString('en-IN');
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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
}

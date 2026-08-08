import { Component, OnInit, inject, DestroyRef, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';

import { ProductSlider } from '../../../shared/ui/product-slider/product-slider';
import { Banner } from '../../public/banner/banner';
import { CatalogService } from '../../public/services/catalog.service';
import { Product } from '../../public/models/catalog.model';
import { ClientUserService } from '../../../core/infrastructure/client-user.service';

@Component({
  selector: 'app-customer-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,  
  imports: [CommonModule, ProductSlider, Banner, NzSpinModule, NzEmptyModule, NzButtonModule, NzIconModule],
  templateUrl: './customer-home.html',
  styleUrl: './customer-home.scss',
})
export class CustoemrHome implements OnInit {
  // ── Inject ───────────────────────────────────────────
  private catalog = inject(CatalogService);
  private message = inject(NzMessageService);
  private destroyRef = inject(DestroyRef);
  private clientUserService = inject(ClientUserService);

  // ── Signal State ─────────────────────────────────────
  loadingTop = signal(false);
  loadingNew = signal(false);
  errorTop = signal<string | null>(null);
  errorNew = signal<string | null>(null);

  topSellingProducts = signal<Product[]>([]);
  newArrivals = signal<Product[]>([]);

  // ── Lifecycle ───────────────────────────────────────
  ngOnInit(): void {
    this.clientUserService.loadUser(true).subscribe({
      error: () => { },
    });

    this.loadTopSelling();
    this.loadNewArrivals();
  }

  // ── Top Selling ─────────────────────────────────────
  loadTopSelling(): void {
    this.loadingTop.set(true);
    this.errorTop.set(null);

    this.catalog
      .getTopSelling()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.topSellingProducts.set(this.catalog.topSelling());
          this.loadingTop.set(false);
        },
        error: (err) => {
          this.loadingTop.set(false);
          this.errorTop.set(err?.message || 'Failed to load top selling products');
          this.message.error(this.errorTop()!);
        },
      });
  }

  // ── New Arrivals ────────────────────────────────────
  loadNewArrivals(): void {
    this.loadingNew.set(true);
    this.errorNew.set(null);

    this.catalog
      .getNewArrivals()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.newArrivals.set(this.catalog.newArrivals());
          this.loadingNew.set(false);
        },
        error: (err) => {
          this.loadingNew.set(false);
          this.errorNew.set(err?.message || 'Failed to load new arrivals');
          this.message.error(this.errorNew()!);
        },
      });
  }

  retryTopSelling(): void {
    this.loadTopSelling();
  }
  retryNewArrivals(): void {
    this.loadNewArrivals();
  }
}

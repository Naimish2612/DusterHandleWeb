import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzIconModule } from 'ng-zorro-antd/icon'; 

import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';

import { ProductSlider } from '../../../shared/ui/product-slider/product-slider';
import { Banner } from '../banner/banner';
import { CatalogService } from '../services/catalog.service';

@Component({
  selector  : 'app-home',
  standalone: true,
  imports   : [
    CommonModule,
    ProductSlider,
    Banner,
    NzSpinModule,
    NzEmptyModule,
    NzButtonModule,
    NzIconModule
  ],
  templateUrl: './home.html',
  styleUrl   : './home.scss',
})
export class Home implements OnInit {

  // ── Inject ────────────────────────────────────────────────────────────────
  private catalog    = inject(CatalogService);
  private message    = inject(NzMessageService);
  private destroyRef = inject(DestroyRef);

  // ── Loading / Error state ─────────────────────────────────────────────────
  loadingTop = true;
  loadingNew = true;
  errorTop   : string | null = null;
  errorNew   : string | null = null; 

  // ✅ Use signals directly
  topSellingProducts = this.catalog.topSelling;
  newArrivals        = this.catalog.newArrivals;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadTopSelling();
    this.loadNewArrivals();
  }

  // ── Top Selling ───────────────────────────────────────────────────────────
  loadTopSelling(): void {
    this.loadingTop = true;
    this.errorTop   = null;

    this.catalog.getTopSelling()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.loadingTop = false;
        },
        error: (err) => {
          this.loadingTop = false;
          this.errorTop   = err?.message || 'Failed to load top selling products';
          this.message.error(this.errorTop!);
        },
      });
  }

  // ── New Arrivals ──────────────────────────────────────────────────────────
  loadNewArrivals(): void {
    this.loadingNew = true;
    this.errorNew   = null;

    this.catalog.getNewArrivals()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.loadingNew  = false;
        },
        error: (err) => {
          this.loadingNew = false;
          this.errorNew   = err?.message || 'Failed to load new arrivals';
          this.message.error(this.errorNew!);
        },
      });
  }

  retryTopSelling () : void { this.loadTopSelling();  }
  retryNewArrivals() : void { this.loadNewArrivals(); }
}
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CheckoutService } from '../services/checkout.service';
import { CommonModule } from '@angular/common';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs';
import { CartService } from '../../../public/services/cart.service';
import { NzSkeletonComponent } from "ng-zorro-antd/skeleton";
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [
    CommonModule,
    NzResultModule,
    NzButtonModule,
    NzIconModule,
    NzDescriptionsModule,
    NzTagModule,
    NzDividerModule,
    NzAlertModule,
    NzSkeletonComponent,
    NzTooltipModule
],
  templateUrl: './order-success.html',
  styleUrl: './order-success.scss',
})
export class OrderSuccess {
  private svc = inject(CheckoutService);
  private router = inject(Router);
  private breakpointObserver = inject(BreakpointObserver);
  private cartService = inject(CartService);

  placedOrder = this.svc.placedOrder;
  cart = this.svc.cart;
  shippingAddress = this.svc.shippingAddress;
  paymentMethod = this.svc.paymentMethod;

  // ── ✅ Coupon State ──────────────────────────────────
  appliedCoupons = this.svc.appliedCoupons;
  totalCouponDiscount = this.svc.totalCouponDiscount;
  grandTotalAfterCoupons = this.svc.grandTotalAfterCoupons;
  totalTaxAmount = this.svc.totalTaxAmount;
  shippingAmount = this.svc.shippingAmount;
  deliveryCost = this.svc.deliveryCost;

  // ── Order Date ───────────────────────────────────────
  orderDate = computed(() => new Date());

  constructor() {
    this.clearCart();
  }

  /**
   * Clear cart from localStorage and reset cart state
   * Called when order is successfully placed
   */
  private clearCart(): void {
    this.cartService.resetCart();   // ✅ Clears state + removes 'duster_cart_id' from localStorage
  }

  goToOrders(): void {
    this.svc.resetCheckout();
    this.router.navigate(['/customer/my/orders']);
  }

  continueShopping(): void {
    this.svc.resetCheckout();
    this.router.navigate(['/home']);
  }

  private isSmallScreen = toSignal(
    this.breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(map(result => result.matches)),
    { initialValue: false }
  );

  // ✅ Returns 1 on small screens, 2 on larger screens
  shipToSpan = computed(() => this.isSmallScreen() ? 1 : 2);
}

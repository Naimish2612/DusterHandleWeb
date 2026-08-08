import { Component, computed, DestroyRef, effect, HostListener, inject, OnInit, output, signal } from '@angular/core';
import { CheckoutService } from '../services/checkout.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartItem, AppliedCoupon } from '../models/checkout.model';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { switchMap, of, tap } from 'rxjs';
import { NzSkeletonComponent } from "ng-zorro-antd/skeleton";

@Component({
  selector: 'app-cart-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzDescriptionsModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzPopconfirmModule,
    NzInputNumberModule,
    NzInputModule,
    NzEmptyModule,
    NzDividerModule,
    NzToolTipModule,
    NzSpinModule,
    NzModalModule,
    NzAlertModule,
    NzSkeletonComponent
],
  templateUrl: './cart-view.html',
  styleUrl: './cart-view.scss',
})
export class CartView implements OnInit {
  proceedToCheckout = output<void>();

  private svc = inject(CheckoutService);
  private message = inject(NzMessageService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private prevCouponCodes: string[] = [];

  cart = this.svc.cart;
  isUpdating = signal(false);
  updatingItemId = signal<number | null>(null);
  removingItemId = signal<number | null>(null);

  // Qty input model per product (local only before save)
  qtyMap = signal<Record<number, number>>({});

  // ── Coupon State ─────────────────────────────────────
  isCouponModalVisible = signal<boolean>(false);
  couponInputCode = signal<string>('');
  isCouponApplying = signal<boolean>(false);
  isRemovingCouponCode = signal<string | null>(null);
  couponErrorMsg = signal<string | null>(null);
  couponSuccessMsg = signal<string | null>(null);

  // ── From Service (Reactive) ──────────────────────────
  appliedCoupons = this.svc.appliedCoupons;
  totalCouponDiscount = this.svc.totalCouponDiscount;
  grandTotalAfterCoupons = this.svc.grandTotalAfterCoupons;

  // Add these signals from service
  totalTaxAmount = this.svc.totalTaxAmount;
  productTaxes = this.svc.productTaxes;
  shippingAmount = this.svc.shippingAmount;
  deliveryCost = this.svc.deliveryCost;

  // ── Coupon Validations ───────────────────────────────
  isValidCouponCode = computed(
    () => this.couponInputCode().trim().length >= 3
  );

  isDuplicateCoupon = computed(() =>
    this.appliedCoupons().some(
      (c) =>
        c.coupon_code.toUpperCase() ===
        this.couponInputCode().trim().toUpperCase()
    )
  );

  canApplyCoupon = computed(
    () =>
      this.isValidCouponCode() &&
      !this.isDuplicateCoupon() &&
      !this.isCouponApplying()
  );

  continueShopping(): void {
    this.svc.resetCheckout();
    this.router.navigate(['/home']);
  }

  // ── Cart Summary ─────────────────────────────────────
  cartSummary = computed(() => {
    const c = this.cart();
    if (!c) return null;
    return {
      itemCount: c.items.reduce((s, i) => s + i.qty, 0),
      subTotal: c.sub_total,
      shippingAmount: c.shipping_amount,
      marketplaceFee: c.marketplace_fee,
      netAmount: c.net_amount,
      paymentStatus: c.payment_status,
      orderStatus: c.order_status,
    };
  });

  constructor() {
    // ✅ Effect runs whenever cart() signal changes
    effect(() => {
      const items = this.cart()?.items ?? [];
      if (items.length === 0) return;

      const map: Record<number, number> = {};
      items.forEach((i) => {
        map[i.product_code] = i.qty;
      });
      this.qtyMap.set(map);
    });

    // ✅ SAFE: Detect auto-removed coupons → notify user
    effect(() => {
      const currentCodes = this.appliedCoupons().map(c => c.coupon_code);

      // Read from plain property (no signal dependency = no loop)
      if (this.prevCouponCodes.length > 0) {
        const removed = this.prevCouponCodes.filter(
          code => !currentCodes.includes(code)
        );
        if (removed.length > 0) {
          removed.forEach(code => {
            this.message.warning(
              `Coupon "${code}" removed — minimum order amount no longer met or cart is empty.`,
              { nzDuration: 4000 }
            );
          });
        }
      }

      // ✅ Plain assignment — NOT a signal write — no infinite loop
      this.prevCouponCodes = currentCodes;
    });
  }

  getProductTax(productCode: number): number {
    return this.svc.getProductTax(productCode)?.tax_amount ?? 0;
  }

  ngOnInit(): void {
    // Calculate taxes when cart loads
    this.calculateTaxes();
  }

  private calculateTaxes(): void {
    this.svc.calculateCartTaxes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => this.message.error('Failed to calculate taxes')
      });
  }

  getQty(productCode: number): number {
    return this.qtyMap()[productCode] ?? 1;
  }

  onQtyInput(productCode: number, value: number): void {
    this.qtyMap.update((m) => ({ ...m, [productCode]: value }));
  }

  updateQty(item: CartItem): void {
    const newQty = this.qtyMap()[item.product_code];
    if (!newQty || newQty === item.qty || newQty < 1) return;

    this.updatingItemId.set(item.product_code);
    this.svc
      .updateCartItemQty(this.cart()!.cart_id, item.product_code, newQty)
      .pipe(
        switchMap(() => this.svc.calculateCartTaxes()), // ✅ recalc tax
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.updatingItemId.set(null);
          this.message.success('Quantity updated');
        },
        error: () => {
          this.updatingItemId.set(null);
          this.message.error('Failed to update quantity');
        },
      });
  }

  removeItem(item: CartItem): void {
    this.removingItemId.set(item.product_code);
    this.svc
      .removeCartItem(this.cart()!.cart_id, item.product_code, item.qty)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.removingItemId.set(null);
          this.message.success(`"${item.product_name}" removed from cart`);
        },
        error: () => {
          this.removingItemId.set(null);
          this.message.error('Failed to remove item');
        },
      });
  }

  // ── Coupon Modal Controls ────────────────────────────
  openCouponModal(): void {
    this.couponInputCode.set('');
    this.couponErrorMsg.set(null);
    this.couponSuccessMsg.set(null);
    this.isCouponModalVisible.set(true);
  }

  closeCouponModal(): void {
    this.isCouponModalVisible.set(false);
    this.couponErrorMsg.set(null);
    this.couponSuccessMsg.set(null);
  }

  clearCouponMessages(): void {
    this.couponErrorMsg.set(null);
    this.couponSuccessMsg.set(null);
  }

  // ── ✅ APPLY COUPON (Exact API Integration) ──────────
  applyCoupon(): void {
    if (!this.canApplyCoupon()) return;

    const code = this.couponInputCode().trim().toUpperCase();
    this.couponErrorMsg.set(null);
    this.couponSuccessMsg.set(null);
    this.isCouponApplying.set(true);

    // ✅ Call POST /api/coupon/validate
    this.svc
      .validateCoupon(code)
      .pipe(takeUntilDestroyed(this.destroyRef),
        switchMap((res) => {
          // ✅ Check statusCode AND data exists (null safety)
          if (res?.statusCode === 200 && res?.data != null) {

            const couponCode = res.data.coupon_code;
            const discountAmt = res.data.discount_amount;
            const couponMessage = res.message;

            const newCoupon: AppliedCoupon = {
              coupon_id: res.data.coupon_id,
              coupon_code: couponCode,
              discount_applied: discountAmt,
              discountType: 'Value',
              discount_value: res.data.discount_amount,
              minimum_order_amount: 0,
              can_be_clubbed: false,
            };

            // Add to service state
            return this.svc.addCouponToStateAndSync(newCoupon).pipe(
              tap(() => {
                this.isCouponApplying.set(false);
                this.couponInputCode.set('');

                // ✅ No null risk — using stored variables
                this.couponSuccessMsg.set(`${couponMessage} You saved ₹${discountAmt}!`);
                this.message.success(`Coupon "${couponCode}" applied! Saved ₹${discountAmt}`);
              })
            );

          } else {
            this.isCouponApplying.set(false);
            this.couponErrorMsg.set(res?.message || 'Invalid coupon code. Please try again.');
            return of(null);
          }
        })
      )
      .subscribe({
        next: () => {
          this.isCouponApplying.set(false);
        },

        error: (err) => {
          this.isCouponApplying.set(false);

          // ✅ Handle HTTP error / statusCode: 500
          const errorMessage =
            err?.error?.message ||
            err?.message ||
            'Coupon code not found. Please try again.';

          this.couponErrorMsg.set(errorMessage);
        },
      });
  }

  // ── ✅ REMOVE COUPON (Local State) ───────────────────
  removeCouponFromModal(coupon: AppliedCoupon): void {
    this.isRemovingCouponCode.set(coupon.coupon_code);
    this.couponErrorMsg.set(null);
    this.couponSuccessMsg.set(null);

    // ⭐ Remove + sync to cart API
    this.svc
      .removeCouponFromStateAndSync(coupon.coupon_code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isRemovingCouponCode.set(null);
          this.message.success(`Coupon "${coupon.coupon_code}" removed.`);
        },
        error: () => {
          this.isRemovingCouponCode.set(null);
          this.message.error('Failed to sync coupon removal.');
        },
      });
  }

  // ── Quick Remove from Order Summary ─────────────────
  quickRemoveCoupon(code: string): void {
    this.svc
      .removeCouponFromStateAndSync(code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.message.success(`Coupon "${code}" removed.`),
        error: () => this.message.error('Failed to sync coupon removal.'),
      });
  }

  // ── Helper: Is this coupon being removed ─────────────
  isRemovingThisCoupon(code: string): boolean {
    return this.isRemovingCouponCode() === code;
  }

  // ── Enter Key Support ────────────────────────────────
  onCouponKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.canApplyCoupon()) {
      this.applyCoupon();
    }
  }

  // ── Proceed ──────────────────────────────────────────
  onProceed(): void {
    this.proceedToCheckout.emit();
  }

  trackByProduct(_: number, item: CartItem): number {
    return item.product_code;
  }

  isSmallScreen = signal(window.innerWidth < 992);
  @HostListener('window:resize')
  onResize() {
    this.isSmallScreen.set(window.innerWidth < 992);
  }
}

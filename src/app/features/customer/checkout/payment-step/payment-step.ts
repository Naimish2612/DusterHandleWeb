import { Component, computed, DestroyRef, EventEmitter, inject, Output, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AppliedCoupon, PaymentMethod, PaymentOption, PlaceOrderRequest } from '../models/checkout.model';
import { CheckoutService } from '../services/checkout.service';
import { CommonModule } from '@angular/common';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule, NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzSkeletonComponent } from "ng-zorro-antd/skeleton";
import { map, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-payment-step',
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzDividerModule,
    NzAlertModule,
    NzDescriptionsModule,
    NzSpinModule,
    NzTooltipModule,
    NzSkeletonComponent
  ],
  templateUrl: './payment-step.html',
  styleUrl: './payment-step.scss',
})
export class PaymentStep {
  back = output<void>();
  orderPlaced = output<void>();

  private svc = inject(CheckoutService);
  private message = inject(NzMessageService);
  private destroyRef = inject(DestroyRef);

  isPlacingOrder = signal(false);
  selectedMethod = signal<PaymentMethod | null>(null);

  // From service
  cart = this.svc.cart;
  shippingAddress = this.svc.shippingAddress;
  billingAddress = this.svc.billingAddress;
  // ── ✅ Coupon Signals from Service ───────────────────
  appliedCoupons = this.svc.appliedCoupons;
  totalCouponDiscount = this.svc.totalCouponDiscount;
  grandTotalAfterCoupons = this.svc.grandTotalAfterCoupons;
  totalTaxAmount = this.svc.totalTaxAmount;
  shippingAmount = this.svc.shippingAmount;
  deliveryCost = this.svc.deliveryCost;


  canPlaceOrder = computed(() => this.selectedMethod() !== null && !this.isPlacingOrder());

  readonly paymentOptions: PaymentOption[] = [
    {
      method: 'Online',
      label: 'Online Payment',
      icon: 'global',
      description: 'Credit card, Debit card, Net Banking, UPI',
      available: false, // Coming soon
    },
    {
      method: 'COD',
      label: 'Cash on Delivery',
      icon: 'wallet',
      description: 'Pay with cash when your order is delivered',
      available: true,
    },
    {
      method: 'Bank Transfer',
      label: 'Bank Transfer',
      icon: 'bank',
      description: 'Direct bank transfer — details shared after order',
      available: false,
    },
    {
      method: 'Wallet',
      label: 'Wallet',
      icon: 'dollar-circle',
      description: 'Use your wallet balance',
      available: false,
    },
  ];

  selectMethod(option: PaymentOption): void {
    if (!option.available) return;
    this.selectedMethod.set(option.method);
    this.svc.setPaymentMethod(option.method);
  }

  onPlaceOrder(): void {
    if (!this.canPlaceOrder()) return;

    const cart = this.cart();
    const sa = this.shippingAddress();
    const ba = this.billingAddress();
    const pm = this.selectedMethod();
    const delivery = this.svc.deliveryCost();

    if (!cart || !sa || !ba || !pm) {
      this.message.error('Missing required checkout data');
      return;
    }

    const payload: PlaceOrderRequest = {
      cart_id: cart.cart_id,
      shipping_address_id: sa.address_book_id,
      billing_address_id: ba.address_book_id,
      payment_method: pm,
      shipping_amount: delivery?.final_total ?? 0,
    };

    this.isPlacingOrder.set(true);

    this.svc
      .placeOrder(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((res) => {
          const order = (res as any)?.Data ?? (res as any)?.data ?? null;
          if (!order?.order_id || !order?.order_no) {
            console.warn('[PaymentStep] order_id/order_no missing — skipping delivery save');
            return of(res);
          }
          console.log('[PaymentStep] Saving delivery calculation for order:', order.order_id, order.order_no);
          return this.svc.saveOrderDeliveryCalculation(order.order_id, order.order_no).pipe(map(() => res));
        }),
      )
      .subscribe({
        next: () => {
          this.isPlacingOrder.set(false);
          this.orderPlaced.emit();
        },
        error: (err: unknown) => {
          this.isPlacingOrder.set(false);
          this.message.error(
            (err as any)?.error?.message ?? 'Failed to place order. Please try again.'
          );
        },
      });
  }

  onBack(): void {
    this.back.emit();
  }

  formatAddress(addr: {
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    country: string;
    pin_code: string;
  }): string {
    return [
      addr.address_line1,
      addr.address_line2,
      addr.city,
      addr.state,
      addr.country,
      addr.pin_code,
    ]
      .filter(Boolean)
      .join(', ');
  }

  // ── ✅ Remove Coupon ─────────────────────────────────
  quickRemoveCoupon(code: string): void {
    this.svc.removeCouponFromState(code);
    this.message.success(`Coupon "${code}" removed.`);
  }
}

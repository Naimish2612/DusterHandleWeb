import { Component, computed, DestroyRef, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CheckoutService } from '../services/checkout.service';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { CartView } from '../cart-view/cart-view';
import { AddressStep } from '../address-step/address-step';
import { PaymentStep } from '../payment-step/payment-step';
import { OrderSuccess } from '../order-success/order-success';
import { CartService } from '../../../public/services/cart.service';
import { switchMap, of, forkJoin, Observable, map, catchError } from 'rxjs';
import { UserService } from '../../services/user.service';

export type CheckoutStep = 0 | 1 | 2 | 3;

@Component({
  selector: 'app-checkout-shell',
  standalone: true,
  imports: [
    CommonModule,
    NzStepsModule,
    NzIconModule,
    NzButtonModule,
    NzSpinModule,
    CartView,
    AddressStep,
    PaymentStep,
    OrderSuccess,
  ],
  templateUrl: './checkout-shell.html',
  styleUrl: './checkout-shell.scss',
})
export class CheckoutShell implements OnInit {
  private svc = inject(CheckoutService);
  private destroyRef = inject(DestroyRef);
  private cartService = inject(CartService);
  private userService = inject(UserService);

  currentStep = signal<CheckoutStep>(0);
  isLoading = signal(false);
  cart = this.cartService.cart;
  shippingAddress = this.svc.shippingAddress;
  billingAddress = this.svc.billingAddress;
  paymentMethod = this.svc.paymentMethod;
  placedOrder = this.svc.placedOrder;

  appliedCoupons = this.svc.appliedCoupons;
  totalCouponDiscount = this.svc.totalCouponDiscount;
  grandTotalAfterCoupons = this.svc.grandTotalAfterCoupons;

  readonly steps = [
    { title: 'Cart', subtitle: 'Review items', icon: 'shopping-cart' },
    { title: 'Address', subtitle: 'Shipping & Billing', icon: 'environment' },
    { title: 'Payment', subtitle: 'Select method', icon: 'credit-card' },
  ];

  canProceed = computed(() => {
    switch (this.currentStep()) {
      case 0: return (this.cart()?.items?.length ?? 0) > 0;
      case 1: return !!this.shippingAddress() && !!this.billingAddress();
      case 2: return !!this.paymentMethod();
      default: return false;
    }
  });

  quickRemoveCoupon(code: string): void {
    this.svc.removeCouponFromState(code);
  }

  constructor() {
    effect(() => {
      const checkoutCart = this.svc.cart();
      untracked(() => {
        this.cartService.setCart(checkoutCart);
      });
    });
  }

  ngOnInit(): void {
    this.loadCart();
  }

  private loadCart(): void {
    const existingCart = this.cartService.cart();
    if (existingCart) {
      this.svc.setCart(existingCart);
      this.loadAddressThenTaxes();
      return;
    }

    this.isLoading.set(true);

    this.cartService
      .loadOpenCart()
      .pipe(takeUntilDestroyed(this.destroyRef),
        switchMap((res) => {
          if (res?.data) { this.svc.setCart(res.data); }
          return this.resolveUserCode();
        }),

        switchMap((userCode) => {
          if (!userCode) {
            console.warn('[CheckoutShell] - userCode missing — skipping address load');
            return of(null);
          }
          return this.svc.getDefaultShipping(userCode);
        }),

        switchMap(() => {
          return forkJoin({
            taxes: this.svc.calculateCartTaxes(),
            delivery: this.svc.calculateDeliveryCost(),
          });
        }),
      )
      .subscribe({
        next: ({ }) => { this.isLoading.set(false); },
        error: () => { this.isLoading.set(false); }
      });
  }

  private loadAddressThenTaxes(): void {
    this.resolveUserCode()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((userCode) => {
          if (!userCode) {
            console.warn('[CheckoutShell] - userCode missing — skipping address + tax load');
            return of(null);
          }
          return this.svc.getDefaultShipping(userCode);
        }),
        switchMap(() => {
          return forkJoin({
            taxes: this.svc.calculateCartTaxes(),
            delivery: this.svc.calculateDeliveryCost(),
          });
        }),
      )
      .subscribe({
        next: ({ delivery }) => console.log('[CheckoutShell] ✅ Delivery (reuse path):', delivery?.data?.final_total),
        error: (err: unknown) => console.error('[CheckoutShell] ❌ Error:', err),
      });
  }

  private resolveUserCode(): Observable<number | null> {
    const existing = this.userService.profile()?.user_code;
    if (existing) {
      return of(existing);
    }
    return this.userService.getUserProfile().pipe(
      map(() => {
        const userCode = this.userService.profile()?.user_code ?? null;
        return userCode;
      }),
      catchError((err: unknown) => { return of(null); }));
  }

  goNext(): void {
    if (this.currentStep() < 2 && this.canProceed()) { this.currentStep.update((s) => (s + 1) as CheckoutStep); }
  }

  goBack(): void {
    if (this.currentStep() > 0) { this.currentStep.update((s) => (s - 1) as CheckoutStep); }
  }

  onOrderPlaced(): void { this.currentStep.set(3); }
}

import { Component, computed, DestroyRef, inject, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { AddressBook } from '../models/checkout.model';
import { CheckoutService } from '../services/checkout.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { UserService } from '../../services/user.service';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-address-step',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzRadioModule,
    NzDescriptionsModule,
    NzDividerModule,
    NzSpinModule,
    NzEmptyModule,
    NzAlertModule,
    NzToolTipModule
  ],
  templateUrl: './address-step.html',
  styleUrl: './address-step.scss',
})
export class AddressStep implements OnInit {
  back = output<void>();
  next = output<void>();

  private svc = inject(CheckoutService);
  private destroyRef = inject(DestroyRef);
  private userService = inject(UserService);
  private message = inject(NzMessageService);

  isLoading = signal(false);
  allAddresses = signal<AddressBook[]>([]);
  selectedShipping = signal<number | null>(null);
  selectedBilling = signal<number | null>(null);
  sameAsBilling = signal(false);
  isRecalculating = this.svc.isRecalculating;
  useSameAsBilling = signal(false);

  // From service signals
  shippingAddress = this.svc.shippingAddress;
  billingAddress = this.svc.billingAddress;
  deliveryCost = this.svc.deliveryCost;
  shippingAmount = this.svc.shippingAmount;
  totalTaxAmount = this.svc.totalTaxAmount;
  grandTotalAfterCoupons = this.svc.grandTotalAfterCoupons;
  totalCouponDiscount = this.svc.totalCouponDiscount;
  cart = this.svc.cart;

  getTaxType(): string {
    const state = this.shippingAddress()?.state?.trim()?.toLowerCase();
    return state === 'gujarat' ? '(CGST + SGST)' : '(IGST)';
  }

  canProceed = computed(() => this.selectedShipping() !== null && this.selectedBilling() !== null);

  // User code — replace with actual auth service value
  private readonly USER_CODE = this.userService.profile()?.user_code;;

  ngOnInit(): void {
    const profile = this.userService.profile();

    if (!profile) {
      // ✅ Fetch profile first
      this.userService.getUserProfile()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.loadAddresses();
          },
          error: () => {
            this.message.error('Unable to load user profile');
          }
        });
    } else {
      this.loadAddresses();
    }
  }

  onBillingAddressSelect(address: AddressBook): void {
    const currentId = this.billingAddress()?.address_book_id;
    if (currentId === address.address_book_id) return;
    this.svc.setBillingAddress(address);
  }

  onUseSameAsBillingChange(checked: boolean): void {
    this.useSameAsBilling.set(checked);
    if (checked) {
      const shipping = this.shippingAddress();
      if (shipping) this.svc.setBillingAddress(shipping);
    }
  }

  private loadAddresses(): void {
    this.isLoading.set(true);

    const userCode = this.userService.profile()?.user_code;
    if (!userCode) {
      this.isLoading.set(false);
      this.message.error('User not loaded');
      return;
    }

    forkJoin({
      all: this.svc.getAllAddresses(userCode),
      shipping: this.svc.getDefaultShipping(userCode),
      billing: this.svc.getDefaultBilling(userCode),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ all, shipping, billing }) => {
          this.allAddresses.set(all.data ?? []);

          // Pre-select defaults
          if (shipping?.data) {
            this.selectedShipping.set(shipping.data.address_book_id);
            this.svc.setShippingAddress(shipping.data);
          }

          // Check if billing data actually exists before using it
          if (billing?.data) {
            this.selectedBilling.set(billing.data.address_book_id);
            this.svc.setBillingAddress(billing.data);
          }

          // this.selectedShipping.set(shipping.data.address_book_id);
          // this.selectedBilling.set(billing.data.address_book_id);

          // // Sync to service
          // this.svc.setShippingAddress(shipping.data);
          // this.svc.setBillingAddress(billing.data);

          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  getAddressById(id: number | null): AddressBook | null {
    if (id === null) return null;
    return this.allAddresses().find((a) => a.address_book_id === id) ?? null;
  }

  // onShippingChange(id: number): void {
  //   this.selectedShipping.set(id);
  //   const addr = this.getAddressById(id);
  //   if (addr) this.svc.setShippingAddress(addr);

  //   if (this.sameAsBilling()) {
  //     this.selectedBilling.set(id);
  //     if (addr) this.svc.setBillingAddress(addr);
  //   }
  // }

  onShippingChange(id: number): void {
    if (this.selectedShipping() === id) return;
    const addr = this.getAddressById(id);
    if (!addr) return;
    this.selectedShipping.set(id);
    this.svc
      .changeShippingAddress(addr)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const rate = this.svc.deliveryCost();
          if (rate?.final_total === 0) {
            this.message.success(`🚚 Free delivery for ${addr.state}!`);
          } else if (rate?.final_total) {
            this.message.info(`Delivery updated: ₹${rate.final_total.toLocaleString('en-IN')} for ${addr.state}`);
          }

          if (this.sameAsBilling()) {
            this.selectedBilling.set(id);
            this.svc.setBillingAddress(addr);
          }
        },
        error: () => { this.message.error('Failed to recalculate. Please try again.'); }
      });
  }

  onBillingChange(id: number): void {
    this.selectedBilling.set(id);
    const addr = this.getAddressById(id);
    if (addr) this.svc.setBillingAddress(addr);
  }

  onSameAsBillingChange(checked: boolean): void {
    this.sameAsBilling.set(checked);
    if (checked && this.selectedShipping() !== null) {
      this.selectedBilling.set(this.selectedShipping());
      const addr = this.getAddressById(this.selectedShipping());
      if (addr) this.svc.setBillingAddress(addr);
    }
  }

  formatAddress(addr: AddressBook): string {
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

  onBack(): void {
    this.back.emit();
  }
  onNext(): void {
    if (this.canProceed()) this.next.emit();
  }
}

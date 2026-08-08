import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import {
  AddressBook,
  AddressCardState,
  INDIAN_STATES,
  COUNTRIES,
  getAddressTags,
  addressToFormValue,
  AddressFormValue,
  buildEditPayload,
  buildCreatePayload,
} from '../models/address-book.model';
import { CommonModule } from '@angular/common';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AddressBookService } from '../services/address-book.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { UserService } from '../services/user.service';
import { forkJoin, Observable, of, switchMap, tap } from 'rxjs';
import { CheckoutService } from '../checkout/services/checkout.service';

// ── PIN code validator (6-digit India PIN) ─────────────────────────────
function pinCodeValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v: string = ctrl.value || '';
  return /^\d{6}$/.test(v) ? null : { invalidPin: true };
}

// ── Mobile number validator ────────────────────────────────────────────
function mobileValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v: string = ctrl.value || '';
  return /^[\+]?[0-9]{10,12}$/.test(v) ? null : { invalidMobile: true };
}

@Component({
  selector: 'app-my-address-book',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzCheckboxModule,
    NzSelectModule,
    NzTagModule,
    NzPopconfirmModule,
    NzSkeletonModule,
    NzEmptyModule,
    NzDividerModule,
    NzToolTipModule,
    NzBadgeModule,
    NzAlertModule,
    NzSwitchModule,
    NzStepsModule,
  ],
  templateUrl: './my-address-book.html',
  styleUrl: './my-address-book.scss',
})
export class MyAddressBook implements OnInit {
  private fb = inject(FormBuilder);
  private message = inject(NzMessageService);
  private addressService = inject(AddressBookService);
  private destroyRef = inject(DestroyRef);
  private userService = inject(UserService);
  private checkoutService = inject(CheckoutService);


  // ── Page state ─────────────────────────────────────────────────
  isLoading = signal(true);
  isSaving = signal(false);
  isEditMode = signal(false);
  editingId = signal<number | null>(null);
  showForm = signal(false);

  // ── Data ───────────────────────────────────────────────────────
  addresses = signal<AddressBook[]>([]);
  cardStates = signal<Map<number, AddressCardState>>(new Map());

  // ── Dropdown data ──────────────────────────────────────────────
  indianStates = INDIAN_STATES;
  countries = COUNTRIES;
  getAddressTags = getAddressTags;

  // ── Computed stats ─────────────────────────────────────────────
  shippingAddress = computed(() => this.addresses().find((a) => a.is_default_shipping) ?? null);
  billingAddress = computed(() => this.addresses().find((a) => a.is_default_billing) ?? null);
  totalCount = computed(() => this.addresses().length);

  // ── Form ───────────────────────────────────────────────────────
  addressForm: FormGroup = this.fb.group({
    full_name: [null, [Validators.required, Validators.minLength(3)]],
    mobile_number: [null, [Validators.required, mobileValidator]],
    address_line1: [null, [Validators.required, Validators.minLength(10)]],
    address_line2: [''],
    city: [null, [Validators.required]],
    state: [null, [Validators.required]],
    country: ['India', [Validators.required]],
    pin_code: [null, [Validators.required, pinCodeValidator]],
    is_default_shipping: [false],
    is_default_billing: [false],
  });

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

  loadAddresses(): void {
    this.isLoading.set(true);
    const userCode = this.userService.profile()?.user_code;
    if (!userCode) {
      this.isLoading.set(false);
      this.message.error('User not loaded');
      return;
    }

    this.addressService
      .getAddresses(userCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.addresses.set(this.addressService.addresses());
          this.initCardStates(this.addresses());
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.message.error('Failed to load addresses');
        },
      });
  }

  // ── Initialise per-card UI state ───────────────────────────────
  private initCardStates(addresses: AddressBook[]): void {
    const map = new Map<number, AddressCardState>();
    addresses.forEach((a) =>
      map.set(a.address_book_id, {
        address: a,
        isDeleting: false,
        isSettingShipping: false,
        isSettingBilling: false,
      }),
    );
    this.cardStates.set(map);
  }

  private getCardState(id: number): AddressCardState | undefined {
    return this.cardStates().get(id);
  }

  private updateCardState(id: number, patch: Partial<AddressCardState>): void {
    const map = new Map(this.cardStates());
    const existing = map.get(id);
    if (existing) map.set(id, { ...existing, ...patch });
    this.cardStates.set(map);
  }

  // ── Form open / close ──────────────────────────────────────────
  openAddForm(): void {
    this.isEditMode.set(false);
    this.editingId.set(null);
    this.addressForm.reset({
      country: 'India',
      is_default_shipping: false,
      is_default_billing: false,
    });
    this.showForm.set(true);
    // Scroll to form
    setTimeout(() => document.getElementById('address-form-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  openEditForm(address: AddressBook): void {
    this.isEditMode.set(true);
    this.editingId.set(address.address_book_id);
    this.addressForm.patchValue(addressToFormValue(address));
    this.showForm.set(true);
    setTimeout(
      () =>
        document
          .getElementById('address-form-section')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      100
    );
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.isEditMode.set(false);
    this.editingId.set(null);
    this.addressForm.reset({
      country: 'India',
      is_default_shipping: false,
      is_default_billing: false,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ██  FIXED submitForm — handles unsetting previous defaults  ██
  // ═══════════════════════════════════════════════════════════════
  submitForm(): void {
    if (this.addressForm.invalid) {
      Object.values(this.addressForm.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const userCode = this.userService.profile()?.user_code;

    if (!userCode) {
      this.message.error('User not loaded');
      return;
    }

    this.isSaving.set(true);

    const fv: AddressFormValue = this.addressForm.value;
    const currentAddresses = this.addresses();
    const editingId = this.editingId();

    // ─────────────────────────────────────────────────────────────
    // STEP 1: FIRST unset previous defaults BEFORE saving new one
    // ─────────────────────────────────────────────────────────────
    const unsetCalls: Observable<any>[] = [];

    // If user checked "Default Shipping", find ALL addresses that
    // currently have is_default_shipping = true (except the one being edited)
    if (fv.is_default_shipping) {
      const previousShippingDefaults = currentAddresses.filter(
        (a) =>
          a.is_default_shipping &&
          a.address_book_id !== editingId // don't unset the one we're editing
      );

      previousShippingDefaults.forEach((addr) => {
        const formVal = addressToFormValue(addr);
        formVal.is_default_shipping = false; // ← UNSET shipping

        // If this same address also needs billing unset, handle it
        if (fv.is_default_billing && addr.is_default_billing) {
          formVal.is_default_billing = false; // ← UNSET billing too
        }

        const unsetPayload = buildEditPayload(
          formVal,
          userCode,
          addr.address_book_id
        );

        console.log(
          `[UNSET SHIPPING] Unsetting default shipping on ID: ${addr.address_book_id} (${addr.full_name})`
        );

        unsetCalls.push(this.addressService.updateAddress(unsetPayload));
      });
    }

    // If user checked "Default Billing", find ALL addresses that
    // currently have is_default_billing = true (except the one being edited)
    // AND that we haven't already added an unset call for above
    if (fv.is_default_billing) {
      const previousBillingDefaults = currentAddresses.filter(
        (a) =>
          a.is_default_billing &&
          a.address_book_id !== editingId
      );

      previousBillingDefaults.forEach((addr) => {
        // Check if we already have an unset call for this address
        // (from the shipping unset above)
        const alreadyHandled =
          fv.is_default_shipping && addr.is_default_shipping;

        if (!alreadyHandled) {
          const formVal = addressToFormValue(addr);
          formVal.is_default_billing = false; // ← UNSET billing

          const unsetPayload = buildEditPayload(
            formVal,
            userCode,
            addr.address_book_id
          );

          unsetCalls.push(this.addressService.updateAddress(unsetPayload));
        }
      });
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Execute unsets first, THEN save the new/edited address
    // ─────────────────────────────────────────────────────────────
    const unsetAll$: Observable<any> =
      unsetCalls.length > 0 ? forkJoin(unsetCalls) : of(null);

    unsetAll$
      .pipe(
        // After all unsets complete, now save the actual address
        switchMap(() => {
          const payload =
            this.isEditMode() && editingId
              ? buildEditPayload(fv, userCode, editingId)
              : buildCreatePayload(fv, userCode);

          const request$ =
            this.isEditMode() && editingId
              ? this.addressService.updateAddress(payload)
              : this.addressService.addAddress(payload);

          return request$;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.loadAddresses(); // ✅ Always reload
          this.isSaving.set(false);
          this.cancelForm();
          this.message.success('Address saved successfully ✅');
        },
        error: (err) => {
          this.isSaving.set(false);
          this.message.error(err?.error?.message || 'Operation failed');
        },
      });
  }

  // ── Set default shipping ────────────────────────────────────────
  setDefaultShipping(address: AddressBook): void {
    const userCode = this.userService.profile()?.user_code;
    if (!userCode) return;

    this.updateCardState(address.address_book_id, {
      isSettingShipping: true,
    });

    // STEP 1: Unset shipping on all other addresses first
    const currentAddresses = this.addresses();
    const unsetCalls: Observable<any>[] = [];

    currentAddresses
      .filter(
        (a) =>
          a.is_default_shipping &&
          a.address_book_id !== address.address_book_id
      )
      .forEach((addr) => {
        const formVal = addressToFormValue(addr);
        formVal.is_default_shipping = false;

        const unsetPayload = buildEditPayload(
          formVal,
          userCode,
          addr.address_book_id
        );

        unsetCalls.push(this.addressService.updateAddress(unsetPayload));
      });

    const unsetAll$: Observable<any> =
      unsetCalls.length > 0 ? forkJoin(unsetCalls) : of(null);

    // STEP 2: After unsets, set shipping on the target address
    unsetAll$
      .pipe(
        switchMap(() => {
          // Now set the target address as default shipping
          const formVal = addressToFormValue(address);
          formVal.is_default_shipping = true;

          const setPayload = buildEditPayload(
            formVal,
            userCode,
            address.address_book_id
          );

          return this.addressService.updateAddress(setPayload);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          // Update local state immediately
          this.addresses.update((list) =>
            list.map((a) => ({
              ...a,
              is_default_shipping:
                a.address_book_id === address.address_book_id
            }))
          );

          this.initCardStates(this.addresses());
          this.updateCardState(address.address_book_id, { isSettingShipping: false });
          this.message.success(`"${address.full_name}" set as default shipping 🚀`);
        },
        error: () => {
          this.updateCardState(address.address_book_id, { isSettingShipping: false });
          this.message.error('Failed to set default shipping');
        },
      });
  }

  // ── Set default billing ─────────────────────────────────────────
  setDefaultBilling(address: AddressBook): void {
    const userCode = this.userService.profile()?.user_code;

    if (!userCode) {
      this.isSaving.set(false);
      this.message.error('User not loaded');
      return;
    }

    this.updateCardState(address.address_book_id, { isSettingBilling: true });

    // STEP 1: Unset billing on all other addresses first
    const currentAddresses = this.addresses();
    const unsetCalls: Observable<any>[] = [];

    currentAddresses
      .filter((a) => a.is_default_billing && a.address_book_id !== address.address_book_id)
      .forEach((addr) => {
        const formVal = addressToFormValue(addr);
        formVal.is_default_billing = false;

        const unsetPayload = buildEditPayload(formVal, userCode, addr.address_book_id);
        unsetCalls.push(this.addressService.updateAddress(unsetPayload));
      });

    const unsetAll$: Observable<any> =
      unsetCalls.length > 0 ? forkJoin(unsetCalls) : of(null);

    // STEP 2: After unsets, set billing on the target address
    unsetAll$
      .pipe(
        switchMap(() => {
          const formVal = addressToFormValue(address);
          formVal.is_default_billing = true;
          const setPayload = buildEditPayload(formVal, userCode, address.address_book_id);
          return this.addressService.updateAddress(setPayload);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          // Update local state immediately
          this.addresses.update((list) =>
            list.map((a) => ({
              ...a,
              is_default_billing:
                a.address_book_id === address.address_book_id,
            }))
          );

          this.initCardStates(this.addresses());
          this.updateCardState(address.address_book_id, { isSettingBilling: false });
          this.message.success(`"${address.full_name}" set as default billing 💳`);
        },
        error: () => {
          this.updateCardState(address.address_book_id, { isSettingBilling: false });
          this.message.error('Failed to set default billing');
        },
      });
  }


  // ── Delete ──────────────────────────────────────────────────────
  deleteAddress(address: AddressBook): void {
    this.updateCardState(address.address_book_id, { isDeleting: true });

    this.addressService
      .deleteAddress(address.address_book_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadAddresses();
          this.message.success('Address removed ✅');
        },
        error: () => {
          this.updateCardState(address.address_book_id, { isDeleting: false });
          this.message.error('Failed to delete address');
        },
      });
  }

  // ── Helper checks ───────────────────────────────────────────────
  isDeleting(id: number): boolean {
    return this.getCardState(id)?.isDeleting ?? false;
  }
  isSettingShipping(id: number): boolean {
    return this.getCardState(id)?.isSettingShipping ?? false;
  }
  isSettingBilling(id: number): boolean {
    return this.getCardState(id)?.isSettingBilling ?? false;
  }

  // ── Form error helpers ──────────────────────────────────────────
  hasError(field: string, error: string): boolean {
    const ctrl = this.addressForm.get(field);
    return !!(ctrl?.hasError(error) && ctrl.dirty);
  }

  isRequired(field: string): boolean {
    return this.hasError(field, 'required');
  }

  // ── Initials helper for address card avatar ─────────────────────
  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('');
  }

  // ── Avatar colour by index ──────────────────────────────────────
  private avatarColors = ['#009CDE', '#52c41a', '#faad14', '#9c27b0',
    '#1890ff', '#ff4d4f', '#00b96b', '#722ed1'];

  getAvatarColor(index: number): string {
    return this.avatarColors[index % this.avatarColors.length];
  }

  // Track by for address list
  trackByAddress(_: number, a: AddressBook): number {
    return a.address_book_id;
  }

  // ══════════════════════════════════════════════════════════════════════
  // ✅ NEW: Check if address can be removed
  // ══════════════════════════════════════════════════════════════════════

  canRemoveAddress(address: AddressBook): boolean {
    // ❌ Cannot remove if it's default shipping
    if (address.is_default_shipping) return false;

    // ❌ Cannot remove if it's default billing
    if (address.is_default_billing) return false;

    // ❌ Cannot remove if used in current cart (shipping or billing)
    if (this.isUsedInCurrentCart(address.address_book_id)) return false;

    return true;
  }

  // ══════════════════════════════════════════════════════════════════════
  // ✅ NEW: Check if address is used in active cart
  // ══════════════════════════════════════════════════════════════════════

  isUsedInCurrentCart(addressId: number): boolean {
    const shippingAddr = this.checkoutService.shippingAddress();
    const billingAddr = this.checkoutService.billingAddress();

    return (
      shippingAddr?.address_book_id === addressId ||
      billingAddr?.address_book_id === addressId
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // ✅ NEW: Get reason why address cannot be removed (for tooltip)
  // ══════════════════════════════════════════════════════════════════════

  getRemoveBlockedReason(address: AddressBook): string {
    if (address.is_default_shipping && address.is_default_billing) {
      return 'Cannot remove — this is your default shipping & billing address';
    }
    if (address.is_default_shipping) {
      return 'Cannot remove — this is your default shipping address';
    }
    if (address.is_default_billing) {
      return 'Cannot remove — this is your default billing address';
    }
    if (this.isUsedInCurrentCart(address.address_book_id)) {
      return 'Cannot remove — currently used in your active cart';
    }
    return '';
  }
}

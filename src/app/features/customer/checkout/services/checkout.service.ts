// services/checkout.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import {
  Cart,
  AddressBook,
  PlaceOrderRequest,
  PlaceOrderResponse,
  CheckoutState,
  PaymentMethod,
  AppliedCoupon,
  CartCouponPayloadItem,
  CouponValidateRequest,
  CouponValidateResponse,
  DeliveryCostResponse,
  DeliveryCostRequest,
  SaveOrderDeliveryRequest,
} from '../models/checkout.model';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { ResponseEntity } from '../../../../shared/models/response-entity';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { ProductTaxInfo, TaxService } from './tax.service';
import { UserService } from '../../services/user.service';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private apiCall = inject(ApiCallService);
  private taxService = inject(TaxService);
  private userService = inject(UserService);
  private _appliedCoupons = signal<AppliedCoupon[]>([]);
  private _productTaxes = signal<ProductTaxInfo[]>([]);
  readonly productTaxes = this._productTaxes.asReadonly();

  // ⭐ Guard flag to prevent recursive silent-sync (uses plain boolean, NOT signal)
  private _isSyncingSilent = false;
  private _addressLoading = signal<boolean>(false);
  readonly addressLoading = this._addressLoading.asReadonly();
  private _deliveryCost = signal<DeliveryCostResponse | null>(null);
  readonly deliveryCost = this._deliveryCost.asReadonly();

  // ✅ NEW — Loading state for address change recalculation
  private _isRecalculating = signal<boolean>(false);
  readonly isRecalculating = this._isRecalculating.asReadonly();

  // ── Checkout State Signal ────────────────────────────
  private _state = signal<CheckoutState>({
    cart: null,
    shippingAddress: null,
    billingAddress: null,
    paymentMethod: null,
    placedOrder: null,
  });

  private _freshTaxCache = signal<Array<{
    product_code: number;
    tax_amount: number;
    tax_breakdown: any[];
  }>>([]);
  readonly state = this._state.asReadonly();
  readonly cart = computed(() => this._state().cart);
  readonly shippingAddress = computed(() => this._state().shippingAddress);
  readonly billingAddress = computed(() => this._state().billingAddress);
  readonly paymentMethod = computed(() => this._state().paymentMethod);
  readonly placedOrder = computed(() => this._state().placedOrder);

  readonly appliedCoupons = this._appliedCoupons.asReadonly();

  // ✅ SINGLE DEFINITION - Applied coupon codes array for API payload
  readonly appliedCouponCodes = computed(() =>
    this._appliedCoupons().map((c) => c.coupon_code)
  );

  // ✅ Total discount from all applied coupons
  readonly totalCouponDiscount = computed(() => this._appliedCoupons().reduce((sum, c) => sum + (c.discount_applied || 0), 0));

  readonly totalTaxAmount = computed(() => {
    const items = this.cart()?.items ?? [];
    return items.reduce((sum, item) => sum + (Number(item.tax_amount) || 0), 0);
  });

  // Get tax for a specific product
  getProductTax(productCode: number): ProductTaxInfo | undefined {
    return this._productTaxes().find(t => t.product_code === productCode);
  }

  // ✅ NEW — safe getter: returns shipping state OR fallback 'Gujarat'
  private getShippingState(): string {
    return this.shippingAddress()?.state?.trim() || 'Gujarat';
  }

  /**
 * Calculate tax for all cart items
 */
  calculateCartTaxes(): Observable<ProductTaxInfo[]> {
    const cart = this.cart();
    const shippingState = this.getShippingState();

    if (!cart?.items?.length) {
      this._productTaxes.set([]);
      return of([]);
    }

    // Determine transaction type from shipping state
    const transactionType = this.taxService.getTransactionType(shippingState, 'Gujarat');

    const items = cart.items.map(i => ({
      product_code: i.product_code,
      unit_price: i.unit_price,
      qty: i.qty,
      tax_class_id: (i as any).tax_class_id ?? (i as any).tax_id ?? 1
    }));

    return this.taxService.calculateTaxForItems(items, transactionType, false).pipe(
      tap(taxes => this._productTaxes.set(taxes))
    );
  }


  readonly shippingAmount = computed(() =>
    this._deliveryCost()?.final_total ?? 0
  );

  // ✅ Grand total after coupon deductions
  readonly grandTotalAfterCoupons = computed(() => {
    const subtotal = this.cart()?.sub_total ?? 0;
    const fee = this.cart()?.marketplace_fee ?? 0;
    const discount = this.totalCouponDiscount();
    // const tax = this.totalTaxAmount();
    //const shipping = this.cart()?.shipping_amount ?? 0;
    const shipping = this._deliveryCost()?.final_total ?? 0;  //
    return Math.max(0, subtotal + shipping + fee - discount);
  });

  setCart(cart: Cart | null): void {

    if (cart) {
      // ✅ Normalize capital "Items" → lowercase "items" from backend response
      const normalizedCart: Cart = {
        ...cart,
        items: (cart as any).Items ?? (cart as any).items ?? [],
        coupons: (cart as any).Coupons ?? (cart as any).coupons ?? [],
      };

      this.patchState({ cart: normalizedCart });

      if (!normalizedCart.items || normalizedCart.items.length === 0) {
        this._appliedCoupons.set([]);
        return;
      }

      if (normalizedCart.coupons && Array.isArray(normalizedCart.coupons) && normalizedCart.coupons.length > 0) {
        const subTotal = normalizedCart.sub_total ?? 0;
        const validCoupons: AppliedCoupon[] = [];
        const removedCoupons: AppliedCoupon[] = [];

        normalizedCart.coupons.forEach((c) => {
          const minOrder = c.minimum_order_amount ?? 0;
          if (subTotal >= minOrder) {
            validCoupons.push(c);
          } else {
            removedCoupons.push(c);
          }
        });

        this._appliedCoupons.set(validCoupons);

        if (removedCoupons.length > 0 && !this._isSyncingSilent) {
          this.syncCouponsToCartSilent(validCoupons).subscribe();
        }
      } else {
        this._appliedCoupons.set([]);
      }

    } else {
      // null cart
      this.patchState({ cart: null });
      this._appliedCoupons.set([]);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // CART METHODS
  // ══════════════════════════════════════════════════════════════════

  getCart(cartCode: string): Observable<ResponseEntity<Cart>> {
    return this.apiCall
      .get<Cart>('common', API_ENDPOINTS.CUSTOMER.ORDER.GET_CART + `/${cartCode}`)
      .pipe(tap((res) => {
        if (res?.data) this.setCart(res.data);
      }));
  }

  updateCartItemQty(cartCode: string, productCode: number, qty: number): Observable<ResponseEntity<Cart>> {
    const currentCoupons = this._appliedCoupons();
    const currentItem = this.cart()?.items?.find(
      (i) => i.product_code === productCode
    );

    if (!currentItem) {
      return throwError(() => new Error('Item not found in cart'));
    }

    const taxClassId = (currentItem as any).tax_class_id ?? 1;
    const unitPrice = currentItem.unit_price;

    return this.calculateItemTax(productCode, unitPrice, qty, taxClassId).pipe(
      switchMap((taxInfo) => {
        const payload = {
          cart_id: cartCode,
          product_code: productCode,
          qty,
          action_event: 'Update',
          tax_id: taxInfo.tax_id,
          tax_amount: taxInfo.tax_amount,
          tax_breakdown: taxInfo.tax_breakdown,
          ...this.buildCouponPayload(currentCoupons),
        };

        return this.apiCall.post<Cart>('common', API_ENDPOINTS.CUSTOMER.ORDER.ADD_TO_CART, payload);
      }),

      tap((res) => {
        if (res?.data) this.setCart(res.data);
      }),

      switchMap((res) => {
        return this.refreshAllItemTaxes().pipe(map(() => res));
      }),

      switchMap((res) => {
        if (this._appliedCoupons().length > 0) {
          return this.revalidateAllCoupons().pipe(map(() => res));
        }
        return of(res);
      }),
      // ✅ Recalculate delivery after cart total changes
      switchMap((res) => this.calculateDeliveryCost().pipe(map(() => res))),
    );
  }

  removeCartItem(
    cartCode: string,
    productCode: number,
    qty: number
  ): Observable<ResponseEntity<Cart>> {
    const currentCoupons = this._appliedCoupons();

    const payload = {
      cart_id: cartCode,
      product_code: productCode,
      qty,
      action_event: 'Delete',
      ...this.buildCouponPayload(currentCoupons),
    };

    return this.apiCall
      .post<Cart>('common', API_ENDPOINTS.CUSTOMER.ORDER.ADD_TO_CART, payload)
      .pipe(
        // ✅ On delete, safe to call setCart immediately
        // (item is gone, no stale tax to worry about for remaining items)
        tap((res) => {
          if (res?.data) this.setCart(res.data);
        }),

        // ✅ THEN refresh taxes for remaining items
        switchMap((res) => {
          return this.refreshAllItemTaxes().pipe(map(() => res));
        }),

        switchMap((res) => {
          if (this._appliedCoupons().length > 0) {
            return this.revalidateAllCoupons().pipe(map(() => res));
          }
          return of(res);
        }),
        // ✅ Recalculate delivery after item removed
        switchMap((res) => this.calculateDeliveryCost().pipe(map(() => res))),
      );
  }

  changeShippingAddress(addr: AddressBook): Observable<{
    taxes: ProductTaxInfo[];
    delivery: ResponseEntity<DeliveryCostResponse> | null;
  }> {
    const previousState = this.shippingAddress()?.state?.trim()?.toLowerCase();
    const newState = addr.state?.trim()?.toLowerCase();

    console.log(`[CheckoutService] Shipping address changed: "${previousState}" → "${newState}"`);

    this.patchState({ shippingAddress: addr });
    this._isRecalculating.set(true);

    // ✅ Step 1: Tax + Delivery in parallel
    return forkJoin({
      taxes: this.refreshAllItemTaxesPublic(),
      delivery: this.calculateDeliveryCost().pipe(
        catchError((err) => {
          console.error('[CheckoutService] Delivery recalc failed:', err);
          return of(null);
        })
      ),
    }).pipe(

      // ✅ Step 2: Revalidate coupons FIRST (this overwrites cart via patchState)
      switchMap((results) => {
        if (this._appliedCoupons().length > 0 && previousState !== newState) {
          return this.revalidateAllCoupons().pipe(map(() => results));
        }
        return of(results);
      }),

      // ✅ Step 3: Sync taxes to backend LAST
      // After all coupon operations — so nothing overwrites our fresh taxes
      switchMap((results) => {
        return this.syncUpdatedTaxesToCart(results.taxes).pipe(
          map(() => results)
        );
      }),

      tap(() => {
        this._isRecalculating.set(false);
        console.log('[CheckoutService] ✅ Full recalculation complete:', {
          newState,
          taxTotal: this.totalTaxAmount(),
          shippingTotal: this._deliveryCost()?.final_total ?? 0,
        });
      }),

      catchError((err) => {
        this._isRecalculating.set(false);
        console.error('[CheckoutService] ❌ Address change recalculation failed:', err);
        return throwError(() => err);
      })
    );
  }

  // ✅ NEW — Public wrapper for refreshAllItemTaxes
  refreshAllItemTaxesPublic(): Observable<ProductTaxInfo[]> {
    const cart = this.cart();
    if (!cart?.items?.length) return of([]);

    const shippingState = this.getShippingState();
    const transactionType = this.taxService.getTransactionType(shippingState, 'Gujarat');

    console.log('🔍 [refreshAllItemTaxes] shippingState:', shippingState);
    console.log('🔍 [refreshAllItemTaxes] transactionType:', transactionType);

    const items = cart.items.map((i) => ({
      product_code: i.product_code,
      unit_price: i.unit_price,
      qty: i.qty,
      tax_class_id: (i as any).tax_class_id ?? (i as any).tax_id ?? 1,
    }));

    return this.taxService.calculateTaxForItems(items, transactionType, true).pipe(
      tap((taxResults) => {
        // ✅ CHECK 1 — What does calculateTaxForItems return?
        console.log('🔍 [refreshAllItemTaxes] taxResults:', JSON.stringify(taxResults));

        const updatedItems = cart.items.map((item) => {
          const taxInfo = taxResults.find((t) => t.product_code === item.product_code);

          // ✅ CHECK 2 — Does taxInfo have tax_breakdown?
          console.log(`🔍 [refreshAllItemTaxes] product ${item.product_code}:`, {
            taxInfo_keys: taxInfo ? Object.keys(taxInfo) : 'NOT FOUND',
            taxInfo_tax_breakdown: (taxInfo as any)?.tax_breakdown,
            taxInfo_tax_amount: taxInfo?.tax_amount,
          });

          return {
            ...item,
            tax_amount: taxInfo?.tax_amount ?? item.tax_amount ?? 0,
            tax_breakdown: (taxInfo as any)?.tax_breakdown ?? [],
          };
        });

        // ✅ CHECK 3 — What is in updatedItems?
        console.log('🔍 [refreshAllItemTaxes] updatedItems tax_breakdown:',
          updatedItems.map(i => ({
            product_code: i.product_code,
            tax_amount: i.tax_amount,
            tax_breakdown: (i as any).tax_breakdown
          }))
        );

        this.patchState({ cart: { ...cart, items: updatedItems } });
        this._productTaxes.set(taxResults);
      })
    );
  }

  // ══════════════════════════════════════════════════════
  // ⭐ Calculate tax for a single product
  // ══════════════════════════════════════════════════════
  private calculateItemTax(productCode: number, unitPrice: number, qty: number, taxClassId: number): Observable<{ tax_id: number; tax_amount: number; tax_breakdown: any[] }> {
    const shippingAddr = this.shippingAddress();
    const transactionType = this.taxService.getTransactionType(shippingAddr?.state ?? '', 'Gujarat');

    // ✅ Total price → correct total tax from simulator
    const basePrice = unitPrice * qty;

    return this.taxService
      .calculateTax({
        entered_price: basePrice,
        tax_class_id: taxClassId,
        transaction_type: transactionType,
        is_inclusive: true,
      })
      .pipe(
        map((res) => {
          const breakdown = res?.data?.tax_breakdown ?? [];

          return {
            tax_id: taxClassId,

            // ✅ Total tax_amount stays as-is (backend expects total)
            tax_amount: res?.data?.total_tax_amount ?? 0,

            // ✅ FIX: breakdown calculated_amount must be PER UNIT
            tax_breakdown: breakdown.map((b) => ({
              component_name: b.component_name,
              rate: b.rate,
              calculation_type: b.calculation_type,
              calculated_amount: qty > 0 ? parseFloat((b.calculated_amount / qty).toFixed(2)) : b.calculated_amount,
            })),
          };
        }),
        catchError((err) => {
          console.error('[calculateItemTax] ❌ Failed:', err);
          return of({ tax_id: taxClassId, tax_amount: 0, tax_breakdown: [] });
        })
      );
  }

  /**
 * ⭐ Recalculate tax for all items in cart and update cart state
 * Called after qty/remove to ensure totalTaxAmount stays accurate
 */
  private refreshAllItemTaxes(): Observable<void> {
    return this.refreshAllItemTaxesPublic().pipe(map(() => undefined));
  }

  // ── Addresses ────────────────────────────────────────
  getAllAddresses(userCode: number): Observable<ResponseEntity<AddressBook[]>> {
    return this.apiCall.get<AddressBook[]>('common', API_ENDPOINTS.CUSTOMER.ADDRESS_BOOK.GET_ALL_ADDRESS_BY_USER_CODE + `/${userCode}`);
  }

  getDefaultShipping(userCode: number): Observable<ResponseEntity<AddressBook>> {
    this._addressLoading.set(true);   // ✅ mark loading

    return this.apiCall
      .get<AddressBook>('common', API_ENDPOINTS.CUSTOMER.ADDRESS_BOOK.GET_DEFAULT_SHIPPING_ADDRESS_BY_USER_CODE + `/${userCode}`)
      .pipe(
        tap((res) => {
          this.patchState({ shippingAddress: res.data });
          this._addressLoading.set(false);   // ✅ done
        }),
        catchError((err) => {
          this._addressLoading.set(false);   // ✅ done even on error
          console.error('[CheckoutService] Failed to load shipping address:', err);
          return throwError(() => err);
        })
      );
  }

  getDefaultBilling(userCode: number): Observable<ResponseEntity<AddressBook>> {
    return this.apiCall
      .get<AddressBook>('common', API_ENDPOINTS.CUSTOMER.ADDRESS_BOOK.GET_DEFAULT_BILLING_ADDRESS_BY_USER_CODE + `/${userCode}`)
      .pipe(tap((res) => this.patchState({ billingAddress: res.data })));
  }

  setShippingAddress(addr: AddressBook): void {
    this.patchState({ shippingAddress: addr });
  }

  setBillingAddress(addr: AddressBook): void {
    this.patchState({ billingAddress: addr });
  }

  setPaymentMethod(method: PaymentMethod): void {
    this.patchState({ paymentMethod: method });
  }

  // ── Place Order ──────────────────────────────────────
  placeOrder(payload: PlaceOrderRequest): Observable<ResponseEntity<PlaceOrderResponse>> {
    return this.apiCall
      .post<PlaceOrderResponse>('common', API_ENDPOINTS.CUSTOMER.ORDER.PLACE_ORDER, payload)
      .pipe(tap((res) => this.patchState({ placedOrder: res.data })));
  }

  // ── Helpers ──────────────────────────────────────────
  private patchState(patch: Partial<CheckoutState>): void {
    this._state.update((s) => ({ ...s, ...patch }));
  }

  resetCheckout(): void {
    this._state.set({
      cart: null,
      shippingAddress: null,
      billingAddress: null,
      paymentMethod: null,
      placedOrder: null,
    });
    this._appliedCoupons.set([]);
  }


  // ══════════════════════════════════════════════════════════
  // ⭐ PRIVATE: COUPON PAYLOAD BUILDER
  // Accepts explicit list to avoid signal timing issues
  // ══════════════════════════════════════════════════════════
  private buildCouponPayload(coupons: AppliedCoupon[]): { applied_coupons?: CartCouponPayloadItem[] } {
    // If no coupons, return empty object so the field is OMITTED (not sent as [])
    if (!coupons || coupons.length === 0) {
      return {};
    }
    return {
      applied_coupons: coupons.map((c) => ({
        coupon_id: c.coupon_id,
        coupon_code: c.coupon_code,
        discount_amount: c.discount_applied,
      })),
    };
  }

  // ══════════════════════════════════════════════════════════
  // ⭐ PRIVATE: SYNC COUPONS TO CART
  // Sends explicit coupon list to backend — avoids signal timing
  // ══════════════════════════════════════════════════════════

  private syncCouponsToCart(latestCoupons: AppliedCoupon[]): Observable<ResponseEntity<Cart> | null> {
    const cartId = this._state().cart?.cart_id;
    if (!cartId) {
      return of(null);
    }

    const payload = {
      cart_id: cartId,
      action_event: 'ApplyCoupon',
      ...this.buildCouponPayload(latestCoupons),
    };

    return this.apiCall
      .post<Cart>('common', API_ENDPOINTS.CUSTOMER.ORDER.ADD_TO_CART, payload)
      .pipe(
        tap((res) => {
          if (res?.data) {
            const currentCart = this.cart();

            if (currentCart?.items?.length) {
              this.patchState({
                cart: {
                  ...res.data,
                  items: currentCart.items,
                }
              });
            } else {
              this.setCart(res.data);
            }
          }
        }),
        catchError((err) => {
          console.error('[CheckoutService] ❌ syncCouponsToCart failed:', err);
          return of(null as any);
        })
      );
  }

  // ══════════════════════════════════════════════════════════════════
  // ⭐ SILENT SYNC (Auto-cleanup for Issue #4)
  // GUARDED to prevent loops — bypasses setCart() on response
  // ══════════════════════════════════════════════════════════════════
  private syncCouponsToCartSilent(latestCoupons: AppliedCoupon[]): Observable<ResponseEntity<Cart> | null> {
    const cartId = this._state().cart?.cart_id;
    if (!cartId) return of(null);

    // ✅ Guard: Don't fire if already syncing
    if (this._isSyncingSilent) {
      return of(null);
    }

    this._isSyncingSilent = true;

    const payload = {
      cart_id: cartId,
      action_event: 'ApplyCoupon',
      ...this.buildCouponPayload(latestCoupons),
    };

    return this.apiCall
      .post<Cart>('common', API_ENDPOINTS.CUSTOMER.ORDER.ADD_TO_CART, payload)
      .pipe(
        tap((res) => {
          if (res?.data) {
            const currentCart = this.cart();

            if (currentCart?.items?.length) {
              this.patchState({
                cart: {
                  ...res.data,
                  items: currentCart.items,
                }
              });
              console.log('[syncCouponsToCartSilent] ✅ Cart updated, item taxes preserved');
            } else {
              this.patchState({ cart: res.data });
            }
          }
          this._isSyncingSilent = false;
        }),
      );
  }

  // ══════════════════════════════════════════════════════
  // COUPON METHODS
  // ══════════════════════════════════════════════════════

  // ✅ POST /api/coupon/validate
  validateCoupon(couponCode: string): Observable<ResponseEntity<CouponValidateResponse>> {
    const userCode = this.userService.profile()?.user_code;
    if (!userCode) {
      return throwError(() => new Error('User not logged in'));
    }
    const payload: CouponValidateRequest = {
      coupon_code: couponCode,
      order_amount: this.cart()?.sub_total ?? 0,
      current_applied_coupons: this.appliedCouponCodes(),
      user_code: userCode,
    };

    return this.apiCall.post<CouponValidateResponse>('common', API_ENDPOINTS.CUSTOMER.ORDER.APPLY_COUPON, payload);
  }

  // ✅ Add coupon to local state
  addCouponToStateAndSync(coupon: AppliedCoupon): Observable<ResponseEntity<Cart> | null> {
    const exists = this._appliedCoupons().some((c) => c.coupon_code === coupon.coupon_code);
    if (exists) {
      console.warn('[CheckoutService] Coupon already exists:', coupon.coupon_code);
      return of(null);
    }
    const updatedList = [...this._appliedCoupons(), coupon];
    this._appliedCoupons.set(updatedList);
    return this.syncCouponsToCart(updatedList).pipe(
      // ✅ Recalculate delivery after coupon reduces post_discount_cart_total
      switchMap((res) => this.calculateDeliveryCost().pipe(map(() => res))),
    );
  }

  removeCouponFromStateAndSync(code: string): Observable<ResponseEntity<Cart> | null> {
    const updatedList = this._appliedCoupons().filter((c) => c.coupon_code !== code);
    this._appliedCoupons.set(updatedList);
    return this.syncCouponsToCart(updatedList).pipe(
      // ✅ Recalculate delivery after coupon reduces post_discount_cart_total
      switchMap((res) => this.calculateDeliveryCost().pipe(map(() => res))),
    );
  }

  addCouponToState(coupon: AppliedCoupon): void {
    const exists = this._appliedCoupons().some((c) => c.coupon_code === coupon.coupon_code);
    if (!exists) {
      this._appliedCoupons.update((list) => [...list, coupon]);
    }
  }

  // ✅ Remove coupon from local state
  removeCouponFromState(code: string): void {
    this._appliedCoupons.update((list) => list.filter((c) => c.coupon_code !== code));
  }

  // ✅ Clear all coupons
  clearCoupons(): void {
    this._appliedCoupons.set([]);
  }


  // ══════════════════════════════════════════════════════
  // ⭐ Re-validate all applied coupons after cart change
  // ══════════════════════════════════════════════════════
  private revalidateAllCoupons(): Observable<ResponseEntity<Cart> | null> {
    const currentCoupons = this._appliedCoupons();
    const cartId = this._state().cart?.cart_id;

    if (!cartId || currentCoupons.length === 0) {
      return of(null);
    }

    // Re-validate each coupon to get fresh discount based on new subtotal
    const validationCalls = currentCoupons.map((coupon) =>
      this.validateCouponForRecalc(coupon.coupon_code)
    );

    return forkJoin(validationCalls).pipe(
      switchMap((responses) => {
        const validCoupons: AppliedCoupon[] = [];
        const removedCoupons: string[] = [];

        responses.forEach((res, idx) => {
          const originalCoupon = currentCoupons[idx];

          if (res?.statusCode === 200 && res?.data != null) {
            // ✅ Valid → update discount with fresh amount
            validCoupons.push({
              ...originalCoupon,
              discount_applied: res.data.discount_amount,
              discount_value: res.data.discount_amount,
            });
          } else {
            removedCoupons.push(originalCoupon.coupon_code);
            console.warn(`[CheckoutService] ❌ Coupon "${originalCoupon.coupon_code}" no longer valid`);
          }
        });

        // Update local state
        this._appliedCoupons.set(validCoupons);

        // Sync to backend silently to update cart's stored discount
        if (validCoupons.length > 0) {
          return this.syncCouponsToCartSilent(validCoupons);
        }
        return of(null);
      })
    );
  }

  // ⭐ Special validateCoupon for recalc — uses fresh subtotal
  private validateCouponForRecalc(couponCode: string): Observable<ResponseEntity<CouponValidateResponse>> {
    const payload: CouponValidateRequest = {
      coupon_code: couponCode,
      order_amount: this.cart()?.sub_total ?? 0, // ✅ Fresh subtotal
      current_applied_coupons: this.appliedCouponCodes().filter(
        (c) => c !== couponCode),
      user_code: this.userService.profile()?.user_code ?? 0,
    };

    return this.apiCall.post<CouponValidateResponse>(
      'common',
      API_ENDPOINTS.CUSTOMER.ORDER.APPLY_COUPON,
      payload
    );
  }



  // ── Calculate Delivery Cost ───────────────────────────────────────────────
  calculateDeliveryCost(): Observable<ResponseEntity<DeliveryCostResponse>> {

    const cart = this.cart();
    const shippingState = this.getShippingState();
    const couponDiscount = this.totalCouponDiscount();

    const postDiscountTotal = Math.max(0, (cart?.sub_total ?? 0) - couponDiscount);
    const destinationState = shippingState || 'Gujarat';

    const payload: DeliveryCostRequest = {
      post_discount_cart_total: postDiscountTotal,
      destination_state: destinationState,
      delivery_discount_amount: 0, // ✅ Assuming no delivery-specific discounts for now
    };

    return this.apiCall
      .post<DeliveryCostResponse>('common', API_ENDPOINTS.CUSTOMER.DELIVERY.CALCULATE_COST, payload)
      .pipe(
        tap((res) => {
          const data = (res as any)?.Data ?? (res as any)?.data ?? 0;
          if (data) {
            this._deliveryCost.set(data);
          }
        }),
        catchError((err) => {
          // console.error('[CheckoutService] ❌ Delivery cost failed:', err);
          this._deliveryCost.set('0' as any); // ✅ Fallback to zero to avoid blocking checkout
          return throwError(() => err);
        })
      );
  }

  // ✅ Reset delivery cost (call on cart clear / logout)
  resetDeliveryCost(): void {
    this._deliveryCost.set(null);
  }

  // ── Save Order Delivery Calculation ──────────────────────────────────────────
  saveOrderDeliveryCalculation(orderId: number, orderNo: string): Observable<ResponseEntity<null>> {

    const delivery = this._deliveryCost();
    // ✅ Guard — if delivery cost was never calculated, skip silently
    if (!delivery) {
      console.warn('[CheckoutService] saveOrderDeliveryCalculation — no delivery cost available');
      return of({ statusCode: 200, message: 'skipped', data: null } as any);
    }

    const payload: SaveOrderDeliveryRequest = {
      order_id: orderId,
      order_no: orderNo,
      delivery_policy_id: delivery.policy_id_applied,
      delivery_base_fee: delivery.base_fee,
      delivery_tax_amount: delivery.tax_amount,
      delivery_tax_type: delivery.tax_type,
      delivery_discount_amount: delivery.discount_amount,
      delivery_final_total: delivery.final_total,
      calculation_snapshot_obj: delivery.calculation_snapshot,
    };

    console.log('[CheckoutService] saveOrderDeliveryCalculation payload:', payload);
    return this.apiCall
      .post<null>('common', API_ENDPOINTS.CUSTOMER.DELIVERY.SAVE_ORDER_DELIVERY, payload)
      .pipe(
        tap(() => {
          console.log('[CheckoutService] ✅ Delivery calculation saved for order:', orderNo);
        }),
        catchError((err) => {
          // ✅ Non-critical — log but don't break order success flow
          console.error('[CheckoutService] ❌ Failed to save delivery calculation:', err);
          return of({ statusCode: 200, message: 'skipped', data: null } as any);
        })
      );
  }

  private syncUpdatedTaxesToCart(freshTaxResults: ProductTaxInfo[]): Observable<void> {
    const cart = this.cart();
    if (!cart?.items?.length || !freshTaxResults?.length) return of(undefined);

    const cartId = cart.cart_id;
    const currentCoupons = this._appliedCoupons();

    // ✅ Get current shipping address ID to send to backend
    const shippingAddressId = this.shippingAddress()?.address_book_id ?? 0;

    console.log('[syncUpdatedTaxesToCart] shippingAddressId:', shippingAddressId);
    console.log('[syncUpdatedTaxesToCart] freshTaxResults:', JSON.stringify(freshTaxResults));

    const syncCalls = cart.items.map((item) => {
      const freshTax = freshTaxResults.find(
        (t) => t.product_code === item.product_code
      );

      if (!freshTax) {
        console.warn(`[syncUpdatedTaxesToCart] No fresh tax for product ${item.product_code}`);
        return of(null);
      }

      const payload = {
        cart_id: cartId,
        product_code: item.product_code,
        qty: item.qty,
        action_event: 'Update',
        tax_id: item.tax_class_id ?? 1,
        tax_amount: freshTax.tax_amount,                      // ✅ Fresh CGST+SGST
        tax_breakdown: freshTax.tax_breakdown ?? [],           // ✅ Fresh breakdown
        shipping_address_id: shippingAddressId,                // ✅ Tell backend which state
        ...this.buildCouponPayload(currentCoupons),
      };

      console.log(`[syncUpdatedTaxesToCart] Payload for product ${item.product_code}:`, {
        tax_amount: payload.tax_amount,
        tax_breakdown: payload.tax_breakdown,
        shipping_address_id: payload.shipping_address_id,
      });

      return this.apiCall
        .post<Cart>('common', API_ENDPOINTS.CUSTOMER.ORDER.ADD_TO_CART, payload)
        .pipe(
          catchError((err) => {
            console.error(`[syncUpdatedTaxesToCart] ❌ Failed product ${item.product_code}:`, err);
            return of(null);
          })
        );
    });

    return forkJoin(syncCalls).pipe(
      tap((responses) => {
        console.log('[syncUpdatedTaxesToCart] Backend responses received');

        // ✅ FIX — Do NOT update local state from backend response
        // Backend returns stale tax (shipping_address_id may not be stored yet)
        // Our local cart state already has correct fresh taxes from refreshAllItemTaxesPublic()
        // Just update cart-level fields (totals, coupon etc) but KEEP our item taxes

        const lastValidRes = [...responses]
          .reverse()
          .find((r) => r !== null && r?.data != null);

        if (lastValidRes?.data) {
          const backendCart = lastValidRes.data as any;
          const currentCart = this.cart();

          if (currentCart) {
            this.patchState({
              cart: {
                // ✅ Take cart-level fields from backend (totals, status etc)
                ...backendCart,
                // ✅ KEEP local items with fresh taxes — ignore backend item taxes
                items: currentCart.items,
              }
            });
            console.log('[syncUpdatedTaxesToCart] ✅ Cart-level updated, item taxes preserved');
            console.log('[syncUpdatedTaxesToCart] Current items tax_breakdown:',
              currentCart.items.map(i => ({
                product_code: i.product_code,
                tax_amount: i.tax_amount,
                tax_breakdown: i.tax_breakdown
              }))
            );
          }
        }
      }),
      map(() => undefined)
    );
  }
}
import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap, catchError, throwError, of, switchMap, map } from 'rxjs';

import { ApiCallService } from '../../../core/infrastructure/api-call.service';
import { ResponseEntity } from '../../../shared/models/response-entity';
import { API_ENDPOINTS } from '../../../core/global-api-endpoints/api-endpoints';
import { SessionService } from '../../../core/infrastructure/session.service'; // ✅
import { TaxService } from '../../customer/checkout/services/tax.service';
import { CheckoutService } from '../../customer/checkout/services/checkout.service';
import { TaxBreakdownItem } from '../../customer/checkout/models/checkout.model';
import { AddToCartPayload, Cart, CartState } from '../models/cart.model';

interface OpenCartResponse { current_cart_id: string; }

function resolveTaxClassId(item: any, fallback: number = 1): number {
    return item?.tax_class_id ?? item?.tax_id ?? fallback;
}

@Injectable({ providedIn: 'root' })
export class CartService {
    private apiCall = inject(ApiCallService);
    private sessionService = inject(SessionService);
    private taxService = inject(TaxService);
    private checkoutService = inject(CheckoutService);

    // ── State ──────────────────────────────────────────────────────────
    private _state = signal<CartState>({
        cart: null,
        isLoading: false,
        error: null,
    });

    private _cartId = signal<string>('0');

    readonly state = this._state.asReadonly();
    readonly cart = computed(() => this._state().cart);
    readonly isLoading = computed(() => this._state().isLoading);
    readonly error = computed(() => this._state().error);
    readonly cartId = this._cartId.asReadonly();

    readonly cartItemCount = computed(() => {
        const c = this._state().cart;
        return c?.items?.length ?? 0;
    });

    readonly uniqueProductsCount = computed(() => {
        return this._state().cart?.items?.length ?? 0;
    });

    isProductInCart(productCode: number): boolean {
        const items = this._state().cart?.items ?? [];
        return items.some((i) => i.product_code === productCode);
    }

    getProductQty(productCode: number): number {
        const item = this._state().cart?.items?.find((i) => i.product_code === productCode);
        return item?.qty ?? 0;
    }

    getProductTaxClassId(productCode: number): number {
        const item = this._state().cart?.items?.find((i) => i.product_code === productCode);
        return resolveTaxClassId(item);
    }

    private getCartId(): string {
        return this._cartId() || '0';
    }

    private setCartId(cartId: string): void {
        if (cartId && cartId !== '0') { this._cartId.set(cartId); }
    }

    private clearCartId(): void {
        this._cartId.set('0');
    }

    // ══════════════════════════════════════════════════════════════════
    // ✅ GUARDS - Only CUSTOMER can call cart APIs
    // ══════════════════════════════════════════════════════════════════

    /**
     * 🔒 Check if cart APIs can be called (logged-in CUSTOMER only)
     */
    private canFetchOpenCart(): boolean {
        const isAuth = this.sessionService.isAuthenticated();
        const userType = this.sessionService.getUserType();
        return isAuth && userType === 'CUSTOMER';
    }

    // ══════════════════════════════════════════════════════════════════
    // FETCH OPEN CART
    // ══════════════════════════════════════════════════════════════════

    getOpenCartId(): Observable<ResponseEntity<OpenCartResponse>> {
        if (!this.canFetchOpenCart()) {
            const error = new Error('Open cart API can only be called for logged-in CUSTOMER users.');
            console.warn('🚫 Blocked open cart API call:', error.message);
            return throwError(() => error);
        }

        return this.apiCall
            .get<OpenCartResponse>('common', API_ENDPOINTS.CUSTOMER.CART.GET_OPEN_CART)
            .pipe(tap((res) => {
                if (res?.data?.current_cart_id) { this.setCartId(res.data.current_cart_id); }
            }),
                catchError((error) => {
                    console.error('❌ Failed to get open cart ID:', error);
                    return throwError(() => error);
                })
            );
    }

    getCartById(cartId: string): Observable<ResponseEntity<Cart>> {
        if (!cartId || cartId === '0') { return throwError(() => new Error('Invalid cart ID')); }
        this.patchState({ isLoading: true, error: null });
        return this.apiCall
            .get<Cart>('common', `${API_ENDPOINTS.CUSTOMER.CART.GET_CART}/${cartId}`)
            .pipe(
                tap((res) => {
                    if (res.data) {
                        const existingItems = this._state().cart?.items ?? [];

                        const mergedItems = (res.data.items ?? []).map((incomingItem) => {
                            const existingItem = existingItems.find((e) => e.product_code === incomingItem.product_code);
                            const tax_class_id = resolveTaxClassId(incomingItem) !== 1 ? resolveTaxClassId(incomingItem) : resolveTaxClassId(existingItem);
                            return { ...incomingItem, tax_class_id };
                        });

                        this.patchState({
                            cart: { ...res.data, items: mergedItems },
                            isLoading: false,
                        });
                        this.setCartId(res.data.cart_id);
                    } else {
                        this.patchState({ cart: null, isLoading: false });
                    }
                }),
                catchError((error) => {
                    this.patchState({ error: error?.error?.message || 'Failed to load cart', isLoading: false });
                    return throwError(() => error);
                })
            );
    }

    /**
     * ✅ MAIN: Fetch open cart ID then full cart (CUSTOMER only)
     */
    loadOpenCart(): Observable<ResponseEntity<Cart> | null> {
        if (!this.canFetchOpenCart()) {
            console.warn('🚫 loadOpenCart blocked - user is not a logged-in CUSTOMER');
            return of(null);
        }

        this.patchState({ isLoading: true, error: null });

        return this.getOpenCartId().pipe(
            switchMap((res) => {
                const cartId = res?.data?.current_cart_id;

                if (!cartId) {
                    this.patchState({ cart: null, isLoading: false });
                    this.clearCartId();
                    return of(null);
                }

                return this.getCartById(cartId);
            }),
            catchError((error) => {
                console.error('❌ loadOpenCart failed:', error);
                this.patchState({
                    cart: null,
                    isLoading: false,
                    error: error?.error?.message || 'Failed to load cart'
                });
                return of(null);
            })
        );
    }

    /**
     * Initialize cart (called only after successful CUSTOMER login)
     */
    initializeCart(): Observable<ResponseEntity<Cart> | null> {
        return this.loadOpenCart();
    }

    // ══════════════════════════════════════════════════════════════════
    // CART OPERATIONS
    // ══════════════════════════════════════════════════════════════════

    addToCart(productCode: number, qty: number = 1, unitPrice: number, taxClassId: number = 1): Observable<ResponseEntity<Cart>> {
        if (!this.canFetchOpenCart()) {
            return throwError(() => new Error('Please login as customer to add items to cart'));
        }
        return this.calculateTaxForProduct(unitPrice, qty, taxClassId).pipe(
            switchMap((taxInfo) =>
                this.callCartApi({
                    cart_id: this.getCartId(),
                    product_code: productCode,
                    qty,
                    action_event: '',
                    tax_id: taxInfo.tax_id,
                    tax_class_id: taxClassId,
                    tax_amount: taxInfo.tax_amount,
                    tax_breakdown: taxInfo.tax_breakdown,
                }, { productCode, taxClassId })
            )
        );
    }

    updateCartItem(productCode: number, qty: number, unitPrice: number, taxClassId: number = 1): Observable<ResponseEntity<Cart>> {
        return this.calculateTaxForProduct(unitPrice, qty, taxClassId).pipe(
            switchMap((taxInfo) =>
                this.callCartApi({
                    cart_id: this.getCartId(),
                    product_code: productCode,
                    qty,
                    action_event: 'Update',
                    tax_id: taxInfo.tax_id,
                    tax_class_id: taxClassId,
                    tax_amount: taxInfo.tax_amount,
                    tax_breakdown: taxInfo.tax_breakdown,
                }, { productCode, taxClassId })
            )
        );
    }

    // ⭐ Tax calculation helper
    private calculateTaxForProduct(unitPrice: number, qty: number, taxClassId: number): Observable<{ tax_id: number; tax_amount: number, tax_breakdown: TaxBreakdownItem[] }> {
        const address = this.checkoutService.shippingAddress();
        if (!address) { console.warn('[calculateTaxForProduct] - shippingAddress is null — using Gujarat fallback'); }
        const shippingState = address?.state?.trim() || 'Gujarat';
        const transactionType = this.taxService.getTransactionType(shippingState, 'Gujarat');

        return this.taxService
            .calculateTax({
                entered_price: unitPrice * qty,
                tax_class_id: taxClassId,
                transaction_type: transactionType,
                is_inclusive: true, // Assuming prices are tax-inclusive; adjust if needed
            })
            .pipe(
                map((res) => ({
                    tax_id: taxClassId,
                    tax_amount: res?.data?.total_tax_amount ?? 0,
                    tax_breakdown: (res?.data?.tax_breakdown ?? []).map((b) => ({
                        component_name: b.component_name,
                        rate: b.rate,
                        calculation_type: b.calculation_type,
                        calculated_amount: b.calculated_amount,
                    })),
                })),
                catchError((err) => {
                    console.error('[CartService] ❌ Tax calculation failed:', err);
                    return of({ tax_id: taxClassId, tax_amount: 0, tax_breakdown: [] });
                })
            );
    }

    removeFromCart(productCode: number, qty: number = 1): Observable<ResponseEntity<Cart>> {
        return this.callCartApi({
            cart_id: this.getCartId(),
            product_code: productCode,
            qty,
            action_event: 'Delete',
        });
    }

    getCart(cartId?: string): Observable<ResponseEntity<Cart>> {
        const id = cartId || this.getCartId();
        return this.getCartById(id);
    }

    refreshCart(): Observable<ResponseEntity<Cart> | null> {
        return this.loadOpenCart();
    }

    /**
     * ✅ Reset cart on logout
     */
    resetCart(): void {
        this._state.set({ cart: null, isLoading: false, error: null });
        this.clearCartId();
    }

    /**
 * ✅ Public setter — used by other services (like CheckoutService)
 * to keep CartService in sync after cart mutations.
 */
    setCart(cart: Cart | null): void {
        const current = this._state().cart;
        if (current === cart) return;

        if (cart) {
            const existingItems = this._state().cart?.items ?? [];
            const normalizedItems = (cart.items ?? []).map((incomingItem) => {
                const existingItem = existingItems.find((e) => e.product_code === incomingItem.product_code);
                const tax_class_id = resolveTaxClassId(incomingItem) !== 1 ? resolveTaxClassId(incomingItem) : resolveTaxClassId(existingItem);
                return { ...incomingItem, tax_class_id };
            });

            const normalized: Cart = { ...cart, items: normalizedItems };
            this.patchState({ cart: normalized, isLoading: false, error: null });
            if (cart.cart_id) { this.setCartId(cart.cart_id); }
        } else {
            this.patchState({ cart: null, isLoading: false, error: null });
            this.clearCartId();
        }
    }

    private callCartApi(payload: AddToCartPayload, stampInfo?: { productCode: number; taxClassId: number }): Observable<ResponseEntity<Cart>> {
        this.patchState({ isLoading: true, error: null });

        return this.apiCall
            .post<Cart>('common', API_ENDPOINTS.CUSTOMER.CART.ADD_TO_CART, payload)
            .pipe(
                tap((res) => {
                    if (res?.data) {
                        const existingItems = this._state().cart?.items ?? [];

                        const normalizedItems = (res.data.items ?? []).map(
                            (incomingItem) => {
                                const existingItem = existingItems.find((e) => e.product_code === incomingItem.product_code);
                                const tax_class_id = (stampInfo?.productCode === incomingItem.product_code ? stampInfo.taxClassId : undefined) ?? resolveTaxClassId(incomingItem) ?? resolveTaxClassId(existingItem) ?? 1;
                                return { ...incomingItem, tax_class_id };
                            }
                        );

                        const normalizedCart: Cart = {
                            ...res.data,
                            items: normalizedItems,
                        };
                        this.patchState({ cart: normalizedCart, isLoading: false });
                        this.setCartId(res.data.cart_id);
                    } else {
                        this.patchState({ isLoading: false });
                    }
                }),
                catchError((error) => {
                    this.patchState({ error: error.message, isLoading: false });
                    return throwError(() => error);
                })
            );
    }

    private patchState(patch: Partial<CartState>): void {
        this._state.update((s) => ({ ...s, ...patch }));
    }

    quickAddToCart(productCode: number, unitPrice: number, taxClassId: number = 1): Observable<ResponseEntity<Cart>> {
        const isInCart = this.isProductInCart(productCode);
        const resolvedTaxClassId = isInCart ? (taxClassId !== 1 ? taxClassId : this.getProductTaxClassId(productCode)) : taxClassId;

        console.log(`[CartService] quickAddToCart → product: ${productCode}, ` + `isInCart: ${isInCart}, passed: ${taxClassId}, resolved: ${resolvedTaxClassId}`);

        if (isInCart) {
            const currentQty = this.getProductQty(productCode);
            return this.updateCartItem(
                productCode,
                currentQty + 1,
                unitPrice,
                resolvedTaxClassId
            );
        } else {
            return this.addToCart(productCode, 1, unitPrice, resolvedTaxClassId);
        }
    }
}
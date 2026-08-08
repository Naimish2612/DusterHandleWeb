import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';

import { ApiCallService } from '../../../core/infrastructure/api-call.service';
import { ResponseEntity } from '../../../shared/models/response-entity';
import { API_ENDPOINTS } from '../../../core/global-api-endpoints/api-endpoints';
import { Order, OrderState } from '../models/user.common.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private apiCall = inject(ApiCallService);

  // ── State ──────────────────────────────────────────────────────────
  private _state = signal<OrderState>({
    orders: [],
    selectedOrder: null,
    isLoading: false,
    error: null,
  });

  readonly state = this._state.asReadonly();
  readonly orders = computed(() => this._state().orders);
  readonly selectedOrder = computed(() => this._state().selectedOrder);
  readonly isLoading = computed(() => this._state().isLoading);
  readonly error = computed(() => this._state().error);

  // ── Active orders count ────────────────────────────────────────────
  readonly activeOrdersCount = computed(() => {
    const activeStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery'];
    return this._state().orders.filter((o) =>
      activeStatuses.includes(o.order_status?.toLowerCase())
    ).length;
  });

  // ══════════════════════════════════════════════════════════════════
  // PUBLIC METHODS
  // ══════════════════════════════════════════════════════════════════

  /**
   * Get all orders for current user
   */
  getMyOrders(): Observable<ResponseEntity<Order[]>> {
    this.patchState({ isLoading: true, error: null });

    return this.apiCall
      .get<Order[]>('common', API_ENDPOINTS.CUSTOMER.ORDER.GET_MY_ORDERS)
      .pipe(
        tap((res) => {
          this.patchState({
            orders: res.data ?? [],
            isLoading: false,
          });
        }),
        catchError((error) => {
          this.patchState({ error: error.message, isLoading: false });
          return throwError(() => error);
        })
      );
  }

  /**
   * Set selected order (for detail drawer)
   */
  setSelectedOrder(order: Order | null): void {
    this.patchState({ selectedOrder: order });
  }

  /**
   * Reset orders state
   */
  resetOrders(): void {
    this._state.set({
      orders: [],
      selectedOrder: null,
      isLoading: false,
      error: null,
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────
  private patchState(patch: Partial<OrderState>): void {
    this._state.update((s) => ({ ...s, ...patch }));
  }
}
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import {
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusConfig,
} from '../models/user.common.model';
import { OrderService } from '../services/order.service';
import { ReviewModalComponent, ReviewSubmittedEvent } from '../checkout/product-review/review-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';

// ── Status Config ─────────────────────────────────────────────────────
export const ORDER_STATUS_CONFIG: Record<string, OrderStatusConfig> = {
  pending: { label: 'Pending', color: 'warning', icon: 'clock-circle', step: 0 },
  confirmed: { label: 'Confirmed', color: 'processing', icon: 'check-circle', step: 0 },
  processing: { label: 'Processing', color: 'processing', icon: 'sync', step: 0 },
  shipped: { label: 'Shipped', color: 'blue', icon: 'car', step: 1 },
  out_for_delivery: { label: 'Out for Delivery', color: 'cyan', icon: 'environment', step: 2 },
  delivered: { label: 'Delivered', color: 'success', icon: 'check-circle', step: 3 },
  cancelled: { label: 'Cancelled', color: 'error', icon: 'close-circle', step: -1 },
  return_requested: { label: 'Return Requested', color: 'orange', icon: 'undo', step: -1 },
  returned: { label: 'Returned', color: 'default', icon: 'rollback', step: -1 },
};

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzIconModule,
    NzTagModule,
    NzButtonModule,
    NzTableModule,
    NzTabsModule,
    NzInputModule,
    NzSelectModule,
    NzStepsModule,
    NzDividerModule,
    NzSkeletonModule,
    NzEmptyModule,
    NzBadgeModule,
    NzDrawerModule,
    NzTimelineModule,
    NzToolTipModule,
    ReviewModalComponent,
  ],
  templateUrl: './my-orders.html',
  styleUrl: './my-orders.scss',
})
export class MyOrders implements OnInit {
  private orderService = inject(OrderService);
  private message = inject(NzMessageService);
  private destroyRef = inject(DestroyRef);
  private modal = inject(NzModalService);
  private router = inject(Router);

  // ── Service state ─────────────────────────────────────────────────
  isLoading = this.orderService.isLoading;
  orders = this.orderService.orders;

  // ── UI state ──────────────────────────────────────────────────────
  selectedOrder = signal<Order | null>(null);
  drawerOpen = signal(false);
  searchText = signal('');
  selectedStatus = signal<string>('all');

  // ── Review modal state ────────────────────────────────────────────
  reviewModalVisible = signal(false);
  reviewTargetProduct = signal<OrderItem | null>(null);

  private _orders = signal<Order[]>([]);
  reviewedProductCodes = signal<Set<number>>(new Set());

  statusConfig = ORDER_STATUS_CONFIG;

  filterOptions = [
    { label: 'All Orders', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Returned', value: 'returned' },
  ];

  // ── Computed ──────────────────────────────────────────────────────
  filteredOrders = computed(() => {
    let list = this.orders();
    const search = this.searchText().toLowerCase().trim();
    const status = this.selectedStatus();

    if (search) {
      list = list.filter(
        (o) =>
          o.order_no.toLowerCase().includes(search) ||
          o.orderItems.some((i) => i.product_name.toLowerCase().includes(search))
      );
    }

    if (status === 'active') {
      list = list.filter((o) =>
        ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery']
          .includes(this.normalizeStatus(o.order_status))
      );
    } else if (status !== 'all') {
      list = list.filter((o) => this.normalizeStatus(o.order_status) === status);
    }

    return list;
  });

  get activeCount(): number {
    return this.orderService.activeOrdersCount();
  }

  ngOnInit(): void {
    this.loadOrders();
  }

  // ── Load orders ───────────────────────────────────────────────────
  private loadOrders(): void {
    this.orderService
      .getMyOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // ✅ Sync service orders into local writable signal
          this._orders.set(this.orderService.orders());
        },
        error: (err) => {
          console.error('Failed to load orders:', err);
          this.message.error(err?.error?.message || 'Failed to load orders');
        },
      });
  }

  // ── Review helpers ────────────────────────────────────────────────

  /**
   * Returns true if this product has been reviewed.
   * Checks BOTH:
   *  1. Server flag (item.is_reviewed) — persisted across sessions
   *  2. Local session signal — immediate UI update after submission
   */
  isProductReviewed(item: OrderItem): boolean {
    if (item.is_reviewed) return true;
    return this.reviewedProductCodes().has(item.product_code);
  }

  /**
   * Open review modal for a specific product
   */
  openReviewModal(event: Event, item: OrderItem): void {
    event.stopPropagation();
    this.reviewTargetProduct.set(item);
    this.reviewModalVisible.set(true);
  }

  /**
   * Called when review modal emits success.
   * Immediately marks the product as reviewed in the local signal
   * AND mutates the item.is_reviewed flag on the orders signal
   * so BOTH list view and drawer reflect the change instantly.
   */
  onReviewSubmitted(result: ReviewSubmittedEvent): void {
    if (!result.success) return;

    const productCode = result.product_code;

    // ── 1. Update local session set ──
    this.reviewedProductCodes.update((prev: Set<number>) => {
      const next = new Set(prev);
      next.add(productCode);
      return next;
    });

    // ── 2. Mutate local writable orders signal ──
    this._orders.update((orderList: Order[]) =>
      orderList.map((order: Order) => ({
        ...order,
        orderItems: order.orderItems.map((item: OrderItem) => item.product_code === productCode ? { ...item, is_reviewed: true } : item),
      }))
    );

    // ── 3. If drawer is open, refresh selectedOrder too ──
    const current = this.selectedOrder();
    if (current) {
      this.selectedOrder.update((order: Order | null) => {
        if (!order) return order;
        return {
          ...order,
          orderItems: order.orderItems.map((item: OrderItem) => item.product_code === productCode ? { ...item, is_reviewed: true } : item),
        };
      });
    }
  }

  // ── Status helpers ────────────────────────────────────────────────
  normalizeStatus(status: string): string {
    return (status || '').toLowerCase().replace(/\s+/g, '_');
  }

  getStatusConfig(status: string): OrderStatusConfig {
    const normalized = this.normalizeStatus(status);
    return ORDER_STATUS_CONFIG[normalized] || ORDER_STATUS_CONFIG['pending'];
  }

  getDeliveryStep(order: Order): number {
    if (!order) return 0;
    return this.getStatusConfig(order.order_status).step;
  }

  isActiveOrder(status: string): boolean {
    return ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery']
      .includes(this.normalizeStatus(status));
  }

  normalizePaymentStatus(status: string): string {
    return (status || '').toLowerCase();
  }

  getPaymentColor(status: string): string {
    const n = this.normalizePaymentStatus(status);
    if (n === 'paid') return 'green';
    if (n === 'refunded') return 'purple';
    if (n === 'failed') return 'red';
    return 'orange';
  }

  // ── Drawer ────────────────────────────────────────────────────────
  openOrderDetail(order: Order): void {
    this.selectedOrder.set(order);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    setTimeout(() => this.selectedOrder.set(null), 300);
  }

  // ── Actions ───────────────────────────────────────────────────────
  trackOrder(order: Order): void {
    // ✅ If a tracking URL exists, open it directly in a new tab
    if (order.shipment_tracking_url) {
      window.open(order.shipment_tracking_url, '_blank', 'noopener,noreferrer');
      return;
    }
    this.message.info(`Tracking order: ${order.order_no}`);
  }

  cancelOrder(order: Order): void {
    this.message.info('Cancel order functionality coming soon...');
    this.closeDrawer();
  }

  // ── Formatters ────────────────────────────────────────────────────
  formatPrice(price: number): string {
    return '₹' + (price ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  getItemImage(item: OrderItem): string {
    return item.image_url || this.placeholderImage;
  }

  getOrderSubtotal(order: Order): number {
    return order.orderItems.reduce((sum, item) => sum + item.total_amount, 0);
  }

  getTotalItems(order: Order): number {
    return order.orderItems.reduce((sum, item) => sum + item.qty, 0);
  }

  /**
 * Wrapper to stop card click and handle invoice safely
 */
  onInvoiceClick(event: MouseEvent, order: Order): void {
    event.stopPropagation();   // ✅ Prevent card open
    this.viewInvoice(order);
  }

  viewInvoice(order: Order): void {
    const invoicePath = order.invoice_file_path;
    console.log('Invoice path value:', invoicePath);

    // ✅ Check for ALL invalid cases
    if (!invoicePath || invoicePath === 'NULL' || invoicePath === 'null' || invoicePath === 'undefined' || invoicePath.trim() === '') {
      this.modal.info({
        nzTitle: 'Invoice Not Available',
        nzContent: `
        <p>Currently, the invoice is not available.</p>
        <p>Our team is working on uploading it as soon as possible.</p>
        <p>Once the invoice is uploaded, you will also receive an update via email.</p>`,
        nzOkText: 'Understood',
        nzCentered: true,
        nzWidth: 500
      });

      return;
    }

    // ✅ Open only if truly valid
    window.open(invoicePath, '_blank');
  }

  /**
 * Open order-level support page
 */
  openOrderSupport(event: Event, order: Order): void {
    event.stopPropagation();
    this.router.navigate(['/customer/support'], { state: { order: order, orderId: order.order_id } });
  }

  /**
   * Open product-specific support (if needed for individual products)
   */
  openProductSupport(event: Event, item: OrderItem, order: Order): void {
    event.stopPropagation();
    this.router.navigate(['/customer/support'], { state: { product: item, order: order, orderId: order.order_id } });
  }

  /**
 * Sums tax_amount from all orderItems for an order
 * API has tax at item level, not order level
 */
  getOrderTotalTax(order: Order): number {
    return order.orderItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
  }

  /**
   * Returns true if order has any tax
   */
  hasTax(order: Order): boolean {
    return this.getOrderTotalTax(order) > 0;
  }

  // ── Placeholder ───────────────────────────────────────────────────
  readonly placeholderImage: string = (() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <rect width="120" height="120" fill="#F8FAFC"/>
      <rect x="40" y="35" width="40" height="35" rx="4" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="1.5"/>
      <circle cx="50" cy="46" r="5" fill="#CBD5E1"/>
      <polygon points="40,70 56,55 68,63 80,55 80,70" fill="#CBD5E1"/>
      <text x="60" y="92" text-anchor="middle" font-family="Arial,sans-serif"
            font-size="9" fill="#94A3B8">No Image</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  })();
}
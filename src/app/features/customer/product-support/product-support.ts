import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { FAQ, FaqService } from '../services/faq.service';
import { SupportTicketService } from '../services/support-ticket.service';
import { Order } from '../models/user.common.model';

interface ProductFAQs {
    productCode: number;
    productName: string;
    productImage: string;
    faqs: FAQ[];
    isLoading: boolean;
    error: string | null;
    expanded: boolean;
}

@Component({
    selector: 'app-product-support',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NzButtonModule,
        NzCardModule,
        NzCollapseModule,
        NzDividerModule,
        NzIconModule,
        NzSkeletonModule,
        NzEmptyModule,
        NzAlertModule,
        NzTagModule,
        NzBreadCrumbModule,
        NzSpinModule,
    ],
    templateUrl: './product-support.html',
    styleUrl: './product-support.scss'
})
export class ProductSupport implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private faqService = inject(FaqService);
    private ticketService = inject(SupportTicketService);
    private message = inject(NzMessageService);
    private destroyRef = inject(DestroyRef);

    // State
    order = signal<Order | null>(null);
    orderId = signal<number | null>(null);
    productFAQsList = signal<ProductFAQs[]>([]);
    isLoadingAllFAQs = signal(false);
    expandedFAQItems = signal<Set<string>>(new Set());

    // Computed
    orderNumber = computed(() => this.order()?.order_no || '');
    orderTotal = computed(() => this.order()?.net_amount || 0);
    orderDate = computed(() => this.order()?.order_date || '');
    orderStatus = computed(() => this.order()?.order_status || '');
    orderItems = computed(() => this.order()?.orderItems || []);

    hasFAQs = computed(() => {
        return this.productFAQsList().some(p => p.faqs.length > 0);
    });

    ngOnInit(): void {
        const navigation = this.router.getCurrentNavigation();
        const state = navigation?.extras?.state || history.state;

        if (state?.['orderId'] && state?.['order']) {
            this.orderId.set(state['orderId']);
            this.order.set(state['order']);
            this.loadAllProductFAQs();
        } else {
            this.message.error('Order information not found');
            this.router.navigate(['/customer/my/orders']);
        }
    }

    private loadAllProductFAQs(): void {
        const orderData = this.order();
        if (!orderData || !orderData.orderItems.length) return;

        this.isLoadingAllFAQs.set(true);

        // Initialize product FAQ list
        const productFAQsInit: ProductFAQs[] = orderData.orderItems.map(item => ({
            productCode: item.product_code,
            productName: item.product_name,
            productImage: item.image_url || '',
            faqs: [],
            isLoading: true,
            error: null,
            expanded: false
        }));

        this.productFAQsList.set(productFAQsInit);

        // Load FAQs for each product
        const faqRequests = orderData.orderItems.map((item, index) =>
            this.faqService.getProductFAQs(item.product_code).pipe(
                map(response => ({
                    index,
                    success: response.statusCode === 200,
                    faqs: response.data || [],
                    error: response.statusCode !== 200 ? response.message : null
                })),
                catchError(error => of({
                    index,
                    success: false,
                    faqs: [],
                    error: error?.error?.message || 'No FAQs available'
                }))
            )
        );

        forkJoin(faqRequests)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (results) => {
                    this.productFAQsList.update(list => {
                        return list.map((item, idx) => {
                            const result = results[idx];
                            return {
                                ...item,
                                faqs: result.faqs,
                                isLoading: false,
                                error: result.error
                            };
                        });
                    });
                    this.isLoadingAllFAQs.set(false);
                },
                error: () => {
                    this.isLoadingAllFAQs.set(false);
                    this.message.error('No FAQs available');
                }
            });
    }

    toggleProductFAQs(productCode: number): void {
        this.productFAQsList.update(list => {
            return list.map(item => {
                if (item.productCode === productCode) {
                    return { ...item, expanded: !item.expanded };
                }
                return item;
            });
        });
    }

    toggleFAQItem(productCode: number, faqId: number): void {
        const key = `${productCode}-${faqId}`;
        this.expandedFAQItems.update(set => {
            const newSet = new Set(set);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    }

    isFAQItemExpanded(productCode: number, faqId: number): boolean {
        return this.expandedFAQItems().has(`${productCode}-${faqId}`);
    }

    isProductExpanded(productCode: number): boolean {
        const product = this.productFAQsList().find(p => p.productCode === productCode);
        return product?.expanded || false;
    }

    openSupportChat(productCode?: number): void {
        const orderId = this.orderId();
        const orderData = this.order();

        if (!orderId || !orderData) {
            this.message.error('Missing order information');
            return;
        }

        // Build navigation state
        const navigationState: any = {
            orderId: orderId,
            orderCode: orderData.order_no,  // ✅ Order code for support reference
            order: orderData,
            supportType: productCode ? 'product' : 'order'  // ✅ Type of support
        };

        // If specific product is selected for support
        if (productCode) {
            const product = orderData.orderItems.find(item => item.product_code === productCode);
            if (product) {
                navigationState.product = product;
                navigationState.productCode = productCode;
            }
        }

        // Navigate to support chat view with order code in URL
        this.router.navigate(
            ['/customer/support-chat', orderData.order_no],
            {
                state: navigationState,
                queryParams: productCode ? { productCode } : {}
            }
        );
    }

    goBack(): void {
        this.router.navigate(['/customer/my/orders']);
    }

    formatPrice(price: number): string {
        return '₹' + (price ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    getStatusColor(status: string): string {
        const statusColors: Record<string, string> = {
            'pending': 'orange',
            'confirmed': 'blue',
            'processing': 'cyan',
            'shipped': 'geekblue',
            'out_for_delivery': 'purple',
            'delivered': 'green',
            'cancelled': 'red',
            'returned': 'default'
        };
        const normalized = (status || '').toLowerCase().replace(/\s+/g, '_');
        return statusColors[normalized] || 'default';
    }

    getPaymentColor(status: string): string {
        const normalized = (status || '').toLowerCase();
        if (normalized === 'paid') return 'green';
        if (normalized === 'refunded') return 'purple';
        if (normalized === 'failed') return 'red';
        return 'orange';
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
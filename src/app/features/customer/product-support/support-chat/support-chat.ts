import {
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    OnInit,
    signal,
    ViewChild,
    AfterViewChecked
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import {
    SupportTicketService,
    TicketThreadMessage
} from '../../services/support-ticket.service';
import { Order, OrderItem } from '../../models/user.common.model';

@Component({
    selector: 'app-support-chat',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NzButtonModule,
        NzCardModule,
        NzIconModule,
        NzInputModule,
        NzSpinModule,
        NzEmptyModule,
        NzTagModule,
        NzBreadCrumbModule,
        NzAvatarModule,
        NzSelectModule,
        NzToolTipModule
    ],
    templateUrl: './support-chat.html',
    styleUrl: './support-chat.scss'
})
export class SupportChat implements OnInit, AfterViewChecked {
    @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;
    @ViewChild('initialFileInput') initialFileInput?: ElementRef<HTMLInputElement>;
    @ViewChild('replyFileInput') replyFileInput?: ElementRef<HTMLInputElement>;

    private router = inject(Router);
    private supportService = inject(SupportTicketService);
    private message = inject(NzMessageService);
    private destroyRef = inject(DestroyRef);

    /* ========================= STATE ========================= */
    ticketId = signal<number | null>(null);
    order = signal<Order | null>(null);
    product = signal<OrderItem | null>(null);

    category = signal('');
    otherCategory = signal('');
    initialMessage = signal('');
    selectedFiles = signal<File[]>([]);

    replyText = signal('');
    replyAttachment = signal<File | null>(null);

    isCreatingTicket = signal(false);
    isSendingMessage = signal(false);
    isLoadingThread = signal(false);
    ticketStatus = signal('Open');
    private shouldScroll = false;

    /* ========================= COMPUTED ========================= */
    messages = computed(() => this.supportService.ticketThread());
    hasTicket = computed(() => this.ticketId() !== null);

    supportType = computed<'order' | 'product'>(() =>
        this.product() ? 'product' : 'order'
    );

    contextTitle = computed(() => {
        if (this.product()) return this.product()!.product_name;
        return `Order #${this.order()?.order_no ?? ''}`;
    });

    /* ========================= CATEGORIES ========================= */
    categories = [
        'Order Issue',
        'Product Inquiry',
        'Payment Problem',
        'Damaged Product',
        'Wrong Item',
        'Installation Help',
        'Other'
    ];

    /* ========================= INIT ========================= */
    ngOnInit(): void {
        const state = history.state;

        if (state?.ticketId) {
            this.ticketId.set(state.ticketId);
            if (state.order) this.order.set(state.order);
            if (state.product) this.product.set(state.product);
            this.loadThread(state.ticketId);
        } else if (state?.order) {
            this.order.set(state.order);
            if (state.product) this.product.set(state.product);
        } else {
            this.message.error('Support context not found');
            this.router.navigate(['/customer/my/orders']);
        }
    }

    ngAfterViewChecked(): void {
        if (this.shouldScroll) {
            this.scrollToBottom();
            this.shouldScroll = false;
        }
    }

    /* ========================= LOAD THREAD ========================= */
    private loadThread(ticketId: number): void {
        this.isLoadingThread.set(true);

        this.supportService.getTicketThread(ticketId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res: any) => {

                    this.isLoadingThread.set(false);
                    this.shouldScroll = true;

                    const messages = res?.data || [];

                    // ✅ Detect ticket status from System_Bot message
                    const latestStatusMessage = messages
                        .filter((m: any) => m.sender_type === 'System_Bot')
                        .pop();

                    if (latestStatusMessage) {

                        if (latestStatusMessage.message_text.toLowerCase().includes('closed')) {
                            this.ticketStatus.set('Closed');
                        }
                        else if (latestStatusMessage.message_text.toLowerCase().includes('resolved')) {
                            this.ticketStatus.set('Resolved');
                        }
                    }

                },
                error: () => {
                    this.isLoadingThread.set(false);
                    this.message.error('Failed to load conversation');
                }
            });
    }

    /* ========================= RAISE TICKET ========================= */
    raiseTicket(): void {
        const order = this.order();
        const product = this.product();

        if (!order) {
            this.message.warning('Order not found');
            return;
        }

        const finalCategory =
            this.category() === 'Other' ? this.otherCategory().trim() : this.category();

        if (!finalCategory) {
            this.message.warning('Please select or enter a category');
            return;
        }

        if (!this.initialMessage().trim()) {
            this.message.warning('Please describe your issue');
            return;
        }

        // Build initial context message
        let autoMessage = '';
        if (product) {
            autoMessage =
                `Product: ${product.product_name} | Qty: ${product.qty} | Amount: ₹${product.total_amount}`;
        } else {
            autoMessage = `Order No: ${order.order_no}`;
        }

        const finalInitialMessage = `${autoMessage}\n\nCustomer Message: ${this.initialMessage().trim()}`;

        const request = {
            order_no: order.order_no,
            product_code: product?.product_code ?? 0,
            category: finalCategory,
            initial_message: finalInitialMessage
        };

        this.isCreatingTicket.set(true);

        this.supportService
            .raiseTicket(request, this.selectedFiles())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response: any) => {
                    this.isCreatingTicket.set(false);
                    this.message.success('Ticket raised successfully');

                    // ✅ REDIRECT TO MY TICKETS
                    setTimeout(() => {
                        this.router.navigate(['/customer/my-tickets'], {
                            state: { ticketCreated: true }
                        });
                    }, 500);

                    // Switch to chat view
                    const newTicketId = response?.data?.ticket_id || response?.ticket_id;
                    if (newTicketId) {
                        this.ticketId.set(newTicketId);
                        this.loadThread(newTicketId);
                    }

                    this.initialMessage.set('');
                    this.selectedFiles.set([]);
                    this.category.set('');
                    this.otherCategory.set('');
                },
                error: () => {
                    this.isCreatingTicket.set(false);
                    this.message.error('Failed to raise ticket');
                }
            });
    }

    /* ========================= SEND REPLY ========================= */
    sendReply(): void {
        const ticketId = this.ticketId();
        const text = this.replyText().trim();

        if (!ticketId || (!text && !this.replyAttachment())) return;

        this.isSendingMessage.set(true);

        this.supportService
            .replyToTicket(
                { ticket_id: ticketId, message_text: text },
                this.replyAttachment() ? [this.replyAttachment()!] : []
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.isSendingMessage.set(false);
                    this.replyText.set('');
                    this.replyAttachment.set(null);
                    this.shouldScroll = true;
                },
                error: () => {
                    this.isSendingMessage.set(false);
                    this.message.error('Failed to send reply');
                }
            });
    }

    /* ========================= FILE HANDLING ========================= */
    triggerInitialFileInput(): void {
        this.initialFileInput?.nativeElement.click();
    }

    triggerReplyFileInput(): void {
        this.replyFileInput?.nativeElement.click();
    }

    onInitialFilesSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        const files = Array.from(input.files);
        const maxSize = 5 * 1024 * 1024; // 5MB
        const valid = files.filter(f => {
            if (f.size > maxSize) {
                this.message.warning(`${f.name} exceeds 5MB limit`);
                return false;
            }
            return true;
        });

        this.selectedFiles.update(curr => [...curr, ...valid].slice(0, 5));
        input.value = '';
    }

    onReplyFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        const file = input.files[0];
        if (file.size > 5 * 1024 * 1024) {
            this.message.warning('File exceeds 5MB limit');
            return;
        }

        this.replyAttachment.set(file);
        input.value = '';
    }

    removeSelectedFile(index: number): void {
        this.selectedFiles.update(files => files.filter((_, i) => i !== index));
    }

    removeReplyAttachment(): void {
        this.replyAttachment.set(null);
    }

    previewImageUrl = signal<string | null>(null);

    isImageUrl(url: string): boolean {
        return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    }

    openImagePreview(url: string): void {
        this.previewImageUrl.set(url);
    }

    closeImagePreview(): void {
        this.previewImageUrl.set(null);
    }

    /* ========================= HELPERS ========================= */
    isCustomer(msg: TicketThreadMessage): boolean {
        return msg.sender_type === 'Customer';
    }

    formatTime(dateStr: string): string {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    isImageFile(file: File): boolean {
        return file.type.startsWith('image/');
    }

    getFilePreview(file: File): string {
        return this.isImageFile(file) ? URL.createObjectURL(file) : '';
    }

    scrollToBottom(): void {
        if (this.messagesContainer) {
            const el = this.messagesContainer.nativeElement;
            el.scrollTop = el.scrollHeight;
        }
    }

    onEnterSend(event: Event): void {
        const ke = event as KeyboardEvent;
        if (!ke.shiftKey) {
            event.preventDefault();
            this.sendReply();
        }
    }

    goBack(): void {
        this.router.navigate(['customer/my-tickets']);
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
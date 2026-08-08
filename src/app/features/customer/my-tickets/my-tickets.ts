import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzMessageService } from 'ng-zorro-antd/message';

import { MyTicket, SupportTicketService } from '../services/support-ticket.service';

@Component({
    selector: 'app-my-tickets',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NzButtonModule,
        NzCardModule,
        NzIconModule,
        NzTagModule,
        NzEmptyModule,
        NzSpinModule,
        NzInputModule,
        NzSelectModule,
        NzBreadCrumbModule
    ],
    templateUrl: './my-tickets.html',
    styleUrl: './my-tickets.scss'
})
export class MyTickets implements OnInit {
    private router = inject(Router);
    private ticketService = inject(SupportTicketService);
    private message = inject(NzMessageService);
    private destroyRef = inject(DestroyRef);

    /* ========================= STATE ========================= */
    searchText = signal('');
    statusFilter = signal<string>('all');

    /* ========================= COMPUTED ========================= */
    // ✅ Use signals directly from service
    tickets = this.ticketService.myTickets;
    isLoading = this.ticketService.isLoadingTickets;
    allTickets = computed(() => this.ticketService.myTickets());

    /* ========================= FILTER ========================= */
    filteredTickets = computed(() => {
        const search = this.searchText().toLowerCase().trim();
        const status = this.statusFilter();

        return this.allTickets().filter(ticket => {

            const matchesSearch = !search ||
                ticket.order_no.toLowerCase().includes(search) ||
                ticket.category.toLowerCase().includes(search) ||
                String(ticket.ticket_id).includes(search);

            let matchesStatus = true;

            if (status === 'resolved-closed') {
                matchesStatus =
                    ticket.status === 'Resolved' ||
                    ticket.status === 'Closed';
            }
            else if (status !== 'all') {
                matchesStatus =
                    ticket.status.toLowerCase() === status.toLowerCase();
            }

            return matchesSearch && matchesStatus;
        });
    });

    /* ========================= STATS ========================= */
    ticketStats = computed(() => {
        const tickets = this.allTickets();
        return {
            total: tickets.length,
            open: tickets.filter(t => t.status === 'Open').length,
            inProgress: tickets.filter(t => t.status === 'In Progress').length,
            resolved: tickets.filter(t => t.status === 'Resolved').length,
            closed: tickets.filter(t => t.status === 'Closed').length
        };
    });

    /* ========================= STAT CLICK ========================= */
    filterByStatus(status: string): void {
        this.statusFilter.set(status);
    }

    statusOptions = [
        { label: 'All Status', value: 'all' },
        { label: 'Open', value: 'Open' },
        { label: 'In Progress', value: 'In Progress' },
        { label: 'Resolved', value: 'Resolved' },
        { label: 'Closed', value: 'Closed' }
    ];

    /* ========================= INIT ========================= */
    ngOnInit(): void {
        const state = history.state;

        // if (state?.ticketCreated) {
        //     this.message.success('Your ticket was created successfully');
        // }

        this.loadTickets();
    }

    loadTickets(): void {
        this.ticketService.getMyTickets()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    // ✅ Optional: Show info message when no tickets
                    if (!res?.data || res.data.length === 0) {
                        console.log('No tickets found for this user');
                    }
                },
                error: () => {
                    this.message.error('Failed to load tickets');
                }
            });
    }

    /* ========================= ACTIONS ========================= */
    openTicket(ticket: MyTicket): void {
        this.router.navigate(
            ['/customer/support-chat', ticket.order_no],
            {
                state: {
                    ticketId: ticket.ticket_id,
                    orderCode: ticket.order_no,
                    fromMyTickets: true
                }
            }
        );
    }

    goBack(): void {
        this.router.navigate(['/customer/dashboard']);
    }

    refresh(): void {
        this.loadTickets();
    }

    /* ========================= HELPERS ========================= */
    getStatusColor(status: string): string {
        const map: Record<string, string> = {
            'open': 'blue',
            'in progress': 'orange',
            'resolved': 'green',
            'closed': 'default'
        };
        return map[status?.toLowerCase()] || 'default';
    }

    getStatusIcon(status: string): string {
        const map: Record<string, string> = {
            'open': 'unlock',
            'in progress': 'sync',
            'resolved': 'check-circle',
            'closed': 'lock'
        };
        return map[status?.toLowerCase()] || 'question-circle';
    }

    getPriorityColor(priority: string): string {
        const map: Record<string, string> = {
            'low': 'green',
            'medium': 'blue',
            'high': 'orange',
            'urgent': 'red'
        };
        return map[priority?.toLowerCase()] || 'default';
    }

    getCategoryIcon(category: string): string {
        const cat = category?.toLowerCase() || '';
        if (cat.includes('damage')) return 'warning';
        if (cat.includes('refund')) return 'rollback';
        if (cat.includes('delivery')) return 'car';
        if (cat.includes('payment')) return 'credit-card';
        if (cat.includes('product')) return 'shopping';
        return 'question-circle';
    }


}
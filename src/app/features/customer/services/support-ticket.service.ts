import { Injectable, signal } from '@angular/core';
import { catchError, map, Observable, tap } from 'rxjs';
import { ApiCallService } from '../../../core/infrastructure/api-call.service';
import { ResponseEntity } from '../../../shared/models/response-entity';
import { API_ENDPOINTS } from '../../../core/global-api-endpoints/api-endpoints';

/* ============================================================
   INTERFACES
============================================================ */

export interface TicketThreadMessage {
    message_id: number;
    ticket_id: number;
    sender_type: 'Customer' | 'Support_Agent' | 'System_Bot';
    sender_id: string;
    message_text: string;
    created_at: string;
    attachments?: TicketAttachment[];
    upload_attachments: string[];
}

export interface TicketAttachment {
    file_url: string;
    file_name?: string;
}

export interface RaiseTicketRequest {
    order_no: string;
    product_code: number;
    category: string;
    initial_message: string;
}

export interface TicketReplyRequest {
    ticket_id: number;
    message_text: string;
}

export interface MyTicket {
    ticket_id: number;
    ticket_no: string; 
    order_no: string;
    product_code: number;
    product_name: string;
    user_id: string;
    category: string;
    status: 'Open' | 'In Progress' | 'Resolved' | 'Closed' | string;
    priority: 'Low' | 'Medium' | 'High' | 'Urgent' | string;
    initial_message: string | null;
    upload_attachments: string | null;
    name: string | null;
}

/* ============================================================
   SERVICE
============================================================ */

@Injectable({ providedIn: 'root' })
export class SupportTicketService {

    /* ---------- Signals ---------- */
    private _ticketThread = signal<TicketThreadMessage[]>([]);
    ticketThread = this._ticketThread.asReadonly();

    private _myTickets = signal<MyTicket[]>([]);
    myTickets = this._myTickets.asReadonly();

    private _isLoadingTickets = signal<boolean>(false);
    isLoadingTickets = this._isLoadingTickets.asReadonly();

    constructor(private apiCall: ApiCallService) { }

    /* ============================================================
       RAISE TICKET
    ============================================================ */
    raiseTicket(
        request: RaiseTicketRequest,
        files?: File[]
    ): Observable<ResponseEntity<string>> {

        const formData = new FormData();
        formData.append('data', JSON.stringify(request));

        files?.forEach((file, i) => {
            formData.append(`image${i + 1}`, file);
        });

        return this.apiCall.post<string>(
            'common',
            API_ENDPOINTS.CUSTOMER.SUPPORT.RAISE_TICKET,
            formData
        );
    }

    /* ============================================================
       GET TICKET THREAD (Conversation)
    ============================================================ */
    getTicketThread(
        ticketId: number
    ): Observable<ResponseEntity<TicketThreadMessage[]>> {

        return this.apiCall
            .get<TicketThreadMessage[]>(
                'common',
                `${API_ENDPOINTS.CUSTOMER.SUPPORT.GET_TICKET_THREAD}/${ticketId}`
            )
            .pipe(
                tap(res => this._ticketThread.set(res.data ?? []))
            );
    }

    /* ============================================================
       REPLY TO TICKET
    ============================================================ */
    replyToTicket(
        request: TicketReplyRequest,
        files?: File[]
    ): Observable<ResponseEntity<null>> {

        const formData = new FormData();
        formData.append('data', JSON.stringify(request));

        files?.forEach((file, i) => {
            formData.append(`image${i + 1}`, file);
        });

        return this.apiCall.post<null>(
            'common',
            API_ENDPOINTS.CUSTOMER.SUPPORT.TICKET_REPLY,
            formData
        ).pipe(
            tap(() => this.getTicketThread(request.ticket_id).subscribe())
        );
    }

    /* ============================================================
       GET MY TICKETS (List all tickets of current user)
    ============================================================ */
    getMyTickets(): Observable<ResponseEntity<MyTicket[]>> {
        this._isLoadingTickets.set(true);

        return this.apiCall
            .get<MyTicket[]>(
                'common',
                API_ENDPOINTS.CUSTOMER.SUPPORT.MY_TICKETS
            )
            .pipe(
                map((res: any) => {
                    // ✅ FIX: Handle string response (no tickets case)
                    if (typeof res?.data === 'string' || !Array.isArray(res?.data)) {
                        console.log('[SupportTicketService] No tickets found:', res?.data);
                        this._myTickets.set([]);
                        return { ...res, data: [] } as ResponseEntity<MyTicket[]>;
                    }

                    // ✅ Normal array response
                    this._myTickets.set(res.data);
                    return res as ResponseEntity<MyTicket[]>;
                }),
                tap(() => {
                    this._isLoadingTickets.set(false);   // ✅ Always stop loading
                }),
                catchError((err) => {
                    console.error('[SupportTicketService] getMyTickets error:', err);
                    this._isLoadingTickets.set(false);   // ✅ Stop loading on error
                    this._myTickets.set([]);
                    throw err;
                })
            );
    }

    /* ============================================================
       CLEAR STATE (Optional helper)
    ============================================================ */
    clearTicketThread(): void {
        this._ticketThread.set([]);
    }

    clearMyTickets(): void {
        this._myTickets.set([]);
    }
}
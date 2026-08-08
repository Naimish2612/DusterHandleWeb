import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiCallService } from '../../../core/infrastructure/api-call.service';
import { ResponseEntity } from '../../../shared/models/response-entity';
import { API_ENDPOINTS } from '../../../core/global-api-endpoints/api-endpoints';

export interface FAQ {
    faq_id: number;
    question: string;
    answer: string;
    is_active: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class FaqService {

    private _faqs = signal<FAQ[]>([]);
    faqs = this._faqs.asReadonly();

    constructor(private apiCall: ApiCallService) { }

    // ✅ Get FAQs by product code
    getProductFAQs(productCode: number): Observable<ResponseEntity<FAQ[]>> {
        return this.apiCall
            .get<FAQ[]>('common', `${API_ENDPOINTS.CUSTOMER.SUPPORT.GET_FAQ}?productCode=${productCode}`)
            .pipe(
                tap((res) => {
                    this._faqs.set(res.data ?? []);
                })
            );
    }

    // ✅ Clear cached FAQs
    clearFAQs(): void {
        this._faqs.set([]);
    }
}
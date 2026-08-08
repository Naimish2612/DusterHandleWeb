import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { ApiCallService } from '../../../core/infrastructure/api-call.service';
import { API_ENDPOINTS } from '../../../core/global-api-endpoints/api-endpoints';
import { ReviewPayload } from '../checkout/product-review/review-modal.component';

// ── API response shape ────────────────────────────────────────────────
export interface AddReviewResponse {
    statusCode: number;
    message: string;
    data: any;
    requestId: string;
    timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {

    constructor(private apiCall: ApiCallService) { }

    /**
     * POST product/review/add
     */
    addReview(payload: ReviewPayload): Observable<AddReviewResponse> {
        return this.apiCall.post<AddReviewResponse>('common', API_ENDPOINTS.CUSTOMER.CATALOG.ADD_PRODUCT_REVIEW, payload
        ).pipe(map(response => response.data as AddReviewResponse));
    }
}
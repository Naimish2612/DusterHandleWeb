import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiCallService } from '../../../core/infrastructure/api-call.service';
import { ResponseEntity } from '../../../shared/models/response-entity';
import { API_ENDPOINTS } from '../../../core/global-api-endpoints/api-endpoints';

export interface PolicyResponse {
    key: string;
    title: string;
    data: string;
    lastUpdated?: string;
    version?: string;
}

@Injectable({ providedIn: 'root' })
export class PolicyService {

    private apiCall = inject(ApiCallService);

    constructor(private http: HttpClient) { }

    /**
     * Fetch policy by key
     * @param key - 'privacy_policy' | 'terms_of_service' | 'cookie_policy'
     */
    getPolicyByKey(key: string): Observable<ResponseEntity<PolicyResponse>> {
        return this.apiCall.get<PolicyResponse>('common', `${API_ENDPOINTS.PRIMARY_DOCUMENTS.GET_BY_NAME}${key}`)
    }
}
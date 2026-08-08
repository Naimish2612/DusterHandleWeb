import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiCallService } from '../../../core/infrastructure/api-call.service';
import { API_ENDPOINTS } from '../../../core/global-api-endpoints/api-endpoints';
import { ResponseEntity } from '../../../shared/models/response-entity';

export interface BannerItem {
    banner_id: number;
    banner_title: string;
    description: string;
    image_url: string;
    redirect_url: string;
    platform: string;
    state_id: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
    is_default: boolean;
    display_order: number;
    image_public_id: string;
}


@Injectable({ providedIn: 'root' })

export class BannerService {

    private _banners = signal<BannerItem[]>([]);
    banners = this._banners.asReadonly();

    constructor(private apiCall: ApiCallService) { }

    getBanners(stateid: number, platform: string): Observable<ResponseEntity<BannerItem[]>> {
        return this.apiCall
            .get<BannerItem[]>('common', `${API_ENDPOINTS.CUSTOMER.BANNER.BANNER_LIST}/${stateid}/${platform}`)
            .pipe(
                tap((res) => {
                    const banners = (res.data ?? []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
                    this._banners.set(banners);
                })
            );
    }
}
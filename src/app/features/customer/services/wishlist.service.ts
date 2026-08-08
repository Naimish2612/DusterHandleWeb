import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { WishlistProduct } from '../models/user.common.model';
import { ApiCallService } from '../../../core/infrastructure/api-call.service';
import { API_ENDPOINTS } from '../../../core/global-api-endpoints/api-endpoints';

@Injectable({
    providedIn: 'root'
})
export class WishlistService {

    private _wishlist = signal<WishlistProduct[]>([]);
    wishlist = this._wishlist.asReadonly();

    constructor(private apiCall: ApiCallService) { }

    getWishlist() {
        return this.apiCall
            .get<any>('common', API_ENDPOINTS.CUSTOMER.WISHLIST.LIST)
            .pipe(
                tap((res) => {

                    const mapped: WishlistProduct[] = (res.data ?? []).map((item: any) => ({
                        id: item.product_wishlist_id, 
                        product_code: item.product_code,
                        name: item.name,
                        slug: item.slug,
                        price: item.base_price,
                        actual_price: item.actual_price,
                        rating: Number(item.rating ?? 0),
                        review_count: item.total_review ?? 0,
                        image: item.product_images?.[0]?.image_url ?? '',
                        in_stock: item.in_stock,
                        category: item.category ?? '',
                        added_at: new Date().toISOString()
                    }));

                    this._wishlist.set(mapped);
                })
            );
    }

    // ✅ Add to wishlist
    addToWishlist(productCode: number) {
        return this.apiCall.post('common', API_ENDPOINTS.CUSTOMER.WISHLIST.ADD, { product_code: productCode }
        );
    }

    // ✅ Remove from wishlist
    removeFromWishlist(productCode: number) {
        return this.apiCall.post('common', API_ENDPOINTS.CUSTOMER.WISHLIST.REMOVE, { product_code: productCode });
    }

    // ✅ Local remove (optional for optimistic UI)
    removeLocal(productCode: number) {
        this._wishlist.update(list => list.filter(p => p.product_code !== productCode));
    }
}
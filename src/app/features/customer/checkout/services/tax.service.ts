import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, catchError, map } from 'rxjs';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { ResponseEntity } from '../../../../shared/models/response-entity';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';

export interface TaxSimulatorPayload {
    entered_price: number;
    tax_class_id: number;
    transaction_type: 'Intra-State' | 'Inter-State';
    is_inclusive: boolean | true; // Assuming prices are tax-inclusive; adjust if needed
}

export interface TaxBreakdownItem {
    component_name: string;
    rate: number;
    calculation_type: string;
    calculated_amount: number;
}

export interface TaxSimulatorResponse {
    entered_price: number;
    net_base_price: number;
    total_tax_amount: number;
    final_customer_price: number;
    tax_breakdown: TaxBreakdownItem[];
}

export interface ProductTaxInfo {
    product_code: number;
    tax_amount: number;
    final_price: number;
    tax_class_id: number;
    tax_breakdown: TaxBreakdownItem[];
}

@Injectable({ providedIn: 'root' })
export class TaxService {
    private apiCall = inject(ApiCallService);

    calculateTax(payload: TaxSimulatorPayload): Observable<ResponseEntity<TaxSimulatorResponse>> {
        return this.apiCall.post<TaxSimulatorResponse>('common', API_ENDPOINTS.CUSTOMER.CART.TAX_SIMULATOR, payload);
    }

    calculateTaxForItems(
        items: Array<{ product_code: number; unit_price: number; qty: number; tax_class_id: number }>,
        transactionType: 'Intra-State' | 'Inter-State',
        includeBreakdown: boolean = false
    ): Observable<ProductTaxInfo[]> {
        if (!items?.length) return of([]);

        // ✅ Create ONE API call PER ITEM with its OWN tax_class_id
        const calls = items.map((item) => {
            const enteredPrice = item.unit_price * item.qty;

            return this.calculateTax({
                entered_price: enteredPrice,
                tax_class_id: item.tax_class_id,
                transaction_type: transactionType,
                is_inclusive: true,
            }).pipe(
                map((res): ProductTaxInfo => ({          // ✅ Explicit return type
                    product_code: item.product_code,
                    tax_class_id: item.tax_class_id,
                    tax_amount: res?.data?.total_tax_amount ?? 0,
                    final_price: res?.data?.final_customer_price ?? enteredPrice,   // ✅ ADD THIS
                    tax_breakdown: includeBreakdown
                        ? (res?.data?.tax_breakdown ?? []).map((b: any) => ({
                            component_name: b.component_name,
                            rate: b.rate,
                            calculation_type: b.calculation_type,
                            calculated_amount: item.qty > 0
                                ? parseFloat((b.calculated_amount / item.qty).toFixed(2))
                                : b.calculated_amount,
                        }))
                        : [],
                })),
                catchError((err) => {
                    console.error(`[calculateTaxForItems] ❌ Failed product ${item.product_code}:`, err);
                    return of<ProductTaxInfo>({              // ✅ Explicit type
                        product_code: item.product_code,
                        tax_class_id: item.tax_class_id,
                        tax_amount: 0,
                        final_price: enteredPrice,             // ✅ ADD THIS
                        tax_breakdown: [],
                    });
                })
            );
        });
        return forkJoin(calls);
    }

    getTransactionType(shippingState: string, businessState: string = 'Gujarat'): 'Intra-State' | 'Inter-State' {
        if (!shippingState || !businessState) return 'Inter-State';
        return shippingState.trim().toLowerCase() === businessState.trim().toLowerCase() ? 'Intra-State' : 'Inter-State';
    }
}
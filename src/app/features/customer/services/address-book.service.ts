import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AddressBook } from '../models/address-book.model';
import { ApiCallService } from '../../../core/infrastructure/api-call.service';
import { ResponseEntity } from '../../../shared/models/response-entity';
import { API_ENDPOINTS } from '../../../core/global-api-endpoints/api-endpoints';

@Injectable({
    providedIn: 'root',
})
export class AddressBookService {

    private _addresses = signal<AddressBook[]>([]);
    addresses = this._addresses.asReadonly();

    constructor(private apiCall: ApiCallService) { }

    // ✅ Get all addresses by user
    getAddresses(user_code: number): Observable<ResponseEntity<AddressBook[]>> {
        return this.apiCall
            .get<AddressBook[]>('common', `${API_ENDPOINTS.CUSTOMER.ADDRESS_BOOK.GET_ALL_ADDRESS_BY_USER_CODE}/${user_code}`)
            .pipe(
                tap((res) => {
                    this._addresses.set(res.data ?? []);
                })
            );
    }

    // ✅ Add address
    addAddress(payload: any): Observable<ResponseEntity<AddressBook>> {
        return this.apiCall
            .post<AddressBook>('common', API_ENDPOINTS.CUSTOMER.ADDRESS_BOOK.ADD_ADDRESS, payload)
            .pipe(
                tap((res) => {
                    if (res.data) {
                        this._addresses.update(list => [...list, res.data!]);
                    }
                })
            );
    }

    // ✅ Update address
    updateAddress(payload: any): Observable<ResponseEntity<AddressBook>> {
        return this.apiCall
            .post<AddressBook>('common', API_ENDPOINTS.CUSTOMER.ADDRESS_BOOK.EDIT_ADDRESS, payload)
            .pipe(
                tap((res) => {
                    if (res.data) {
                        this._addresses.update(list => list.map(a => a.address_book_id === res.data!.address_book_id ? res.data! : a));
                    }
                })
            );
    }

    // ✅ Set default shipping
    setDefaultShipping(address_book_id: number, user_code: number) {
        return this.apiCall.get<any>('common',
            `${API_ENDPOINTS.CUSTOMER.ADDRESS_BOOK.SET_DEFAULT_SHIPPING_ADDRESS}/${address_book_id}/${user_code}`);
    }

    // ✅ Set default billing
    setDefaultBilling(address_book_id: number, user_code: number) {
        return this.apiCall.get<any>('common',
            `${API_ENDPOINTS.CUSTOMER.ADDRESS_BOOK.SET_DEFAULT_BILLING_ADDRESS}/${address_book_id}/${user_code}`);
    }

    // ✅ Delete address
    deleteAddress(address_book_id: number) {
        return this.apiCall.get<any>('common', `${API_ENDPOINTS.CUSTOMER.ADDRESS_BOOK.DELETE_ADDRESS}/${address_book_id}`, {});
    }
}
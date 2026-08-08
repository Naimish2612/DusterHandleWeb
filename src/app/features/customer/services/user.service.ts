// services/user.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';

import { ApiCallService } from '../../../core/infrastructure/api-call.service';
import { ResponseEntity } from '../../../shared/models/response-entity';
import { API_ENDPOINTS } from '../../../core/global-api-endpoints/api-endpoints';

import {
    UserProfile,
    ProfileUpdatePayload,
    ChangePasswordPayload,
    UserState,
    UserAddress,
    AddAddressPayload,
    UpdateAddressPayload,
} from '../models/user.common.model';

@Injectable({ providedIn: 'root' })
export class UserService {
    private apiCall = inject(ApiCallService);

    // ── User State Signal ────────────────────────────────
    private _state = signal<UserState>({
        profile: null,
        addresses: [],
        isLoading: false,
        error: null,
    });

    readonly state = this._state.asReadonly();
    readonly profile = computed(() => this._state().profile);
    readonly addresses = computed(() => this._state().addresses);
    readonly isLoading = computed(() => this._state().isLoading);
    readonly error = computed(() => this._state().error);
    readonly userInitials = computed(() => {
        const p = this._state().profile;
        if (!p || !p.user_name) return 'U';
        return (p.user_name[0] + p.user_name[1]).toUpperCase();
    });
    readonly memberSince = computed(() => {
        const p = this._state().profile;
        if (!p || !p.created_at) return '';
        return new Date(p.created_at).toLocaleDateString('en-IN', {
            month: 'long',
            year: 'numeric',
        });
    });

    // ── Profile Management ───────────────────────────────

    /**
     * Get current user profile
     */
    getUserProfile(): Observable<ResponseEntity<UserProfile>> {
        this.patchState({ isLoading: true, error: null });

        return this.apiCall
            .get<UserProfile>('common', API_ENDPOINTS.CUSTOMER.USER.GET_USER)
            .pipe(
                tap((res) => {
                    if (res.data) {
                        // Map API response to UserProfile model
                        const userProfile: UserProfile = {
                            user_code: res.data.user_code,
                            user_name: res.data.user_name || '',
                            full_name: res.data.full_name || '',
                            email_id: res.data.email_id || '',
                            mobile_no: res.data.mobile_no || '',
                            phone_code: res.data.phone_code || '+91',
                            gender: res.data.gender || null,
                            birthdate: res.data.birthdate || null,
                            created_at: res.data.created_at || new Date().toISOString(),
                            is_email_verified: res.data.is_email_verified ?? false,
                            is_phone_verified: res.data.is_phone_verified ?? false,
                            profile_photo_url: res.data.profile_photo_url || null,
                        };
                        this.patchState({ profile: userProfile, isLoading: false });
                    }
                }),
                catchError((error) => {
                    this.patchState({ error: error.message, isLoading: false });
                    return throwError(() => error);
                })
            );
    }

    /**
     * Update user profile
     */
    updateUserProfile(payload: ProfileUpdatePayload): Observable<ResponseEntity<UserProfile>> {
        this.patchState({ isLoading: true, error: null });

        // ✅ Debug log
        console.log('📤 Sending update payload:', payload);

        return this.apiCall
            .post<UserProfile>('common', API_ENDPOINTS.CUSTOMER.USER.UPDATE_USER, payload)
            .pipe(
                tap((res: any) => {
                    console.log('✅ Update response:', res);

                    // ✅ Check if backend returned a new token
                    if (res?.data?.token || res?.token) {
                        const newToken = res.data?.token || res.token;
                        localStorage.setItem('auth_token', newToken);
                        console.log('🔑 New token saved');
                    }

                    const currentProfile = this._state().profile;
                    if (currentProfile) {
                        // ✅ Server response takes priority over payload
                        const updatedProfile: UserProfile = {
                            ...currentProfile,
                            ...payload,
                            ...(res?.data || {}),  // Override with fresh server data
                        };
                        this.patchState({ profile: updatedProfile, isLoading: false });
                    } else {
                        this.patchState({ isLoading: false });
                    }
                }),
                catchError((error) => {
                    console.error('❌ updateUserProfile error:', error);
                    this.patchState({
                        error: error?.error?.message || error.message,
                        isLoading: false
                    });
                    return throwError(() => error);
                })
            );
    }

    /**
     * Update profile field locally (optimistic update)
     */
    updateProfileField(field: Partial<UserProfile>): void {
        const currentProfile = this._state().profile;
        if (currentProfile) {
            this.patchState({ profile: { ...currentProfile, ...field } });
        }
    }

    // ── Password Management ──────────────────────────────

    /**
     * Change user password
     */
    changePassword(payload: ChangePasswordPayload): Observable<ResponseEntity<any>> {
        this.patchState({ isLoading: true, error: null });

        // Get current user's user_code from profile state
        const currentProfile = this.profile();
        if (!currentProfile?.user_code) {
            this.patchState({ isLoading: false, error: 'User profile not found' });
            return throwError(() => new Error('User profile not found'));
        }

        // Map ChangePasswordPayload → API expected payload
        const apiPayload = {
            user_code: currentProfile.user_code,
            password: payload.password,
            new_password: payload.new_password
        };

        return this.apiCall
            .post<any>('common', API_ENDPOINTS.CUSTOMER.USER.CHANGE_PASSWORD, apiPayload)
            .pipe(
                tap(() => {
                    this.patchState({ isLoading: false });
                }),
                catchError((error) => {
                    this.patchState({ error: error.message, isLoading: false });
                    return throwError(() => error);
                })
            );
    }

    // ── Address Management ───────────────────────────────

    /**
     * Get all addresses for user
     */
    getUserAddresses(userCode: number): Observable<ResponseEntity<UserAddress[]>> {
        this.patchState({ isLoading: true, error: null });

        return this.apiCall
            .get<UserAddress[]>(
                'common',
                API_ENDPOINTS.CUSTOMER.ADDRESS_BOOK.GET_ALL_ADDRESS_BY_USER_CODE + `/${userCode}`
            )
            .pipe(
                tap((res) => {
                    this.patchState({ addresses: res.data || [], isLoading: false });
                }),
                catchError((error) => {
                    this.patchState({ error: error.message, isLoading: false });
                    return throwError(() => error);
                })
            );
    }

    /**
     * Get address by ID
     */
    getAddressById(addressId: number): Observable<ResponseEntity<UserAddress>> {
        return this.apiCall.get<UserAddress>(
            'common',
            API_ENDPOINTS.CUSTOMER.ADDRESS_BOOK.GET_ADDRESS_BY_ID + `/${addressId}`
        );
    }

    /**
     * Add new address
     */
    addAddress(payload: AddAddressPayload): Observable<ResponseEntity<UserAddress>> {
        this.patchState({ isLoading: true, error: null });

        return this.apiCall
            .post<UserAddress>('common', API_ENDPOINTS.CUSTOMER.ADDRESS_BOOK.ADD_ADDRESS, payload)
            .pipe(
                tap((res) => {
                    if (res.data) {
                        const currentAddresses = this._state().addresses;
                        this.patchState({
                            addresses: [...currentAddresses, res.data],
                            isLoading: false
                        });
                    }
                }),
                catchError((error) => {
                    this.patchState({ error: error.message, isLoading: false });
                    return throwError(() => error);
                })
            );
    }

    /**
     * Update existing address
     */
    updateAddress(
        addressId: number,
        payload: UpdateAddressPayload
    ): Observable<ResponseEntity<UserAddress>> {
        this.patchState({ isLoading: true, error: null });

        return this.apiCall
            .put<UserAddress>(
                'common',
                API_ENDPOINTS.CUSTOMER.ADDRESS_BOOK.EDIT_ADDRESS + `/${addressId}`,
                payload
            )
            .pipe(
                tap((res) => {
                    if (res.data) {
                        const currentAddresses = this._state().addresses;
                        const updatedAddresses = currentAddresses.map((addr) =>
                            addr.id === addressId ? res.data! : addr
                        );
                        this.patchState({
                            addresses: updatedAddresses,
                            isLoading: false
                        });
                    }
                }),
                catchError((error) => {
                    this.patchState({ error: error.message, isLoading: false });
                    return throwError(() => error);
                })
            );
    }

    /**
     * Delete address
     */
    deleteAddress(addressId: number): Observable<ResponseEntity<void>> {
        this.patchState({ isLoading: true, error: null });

        return this.apiCall
            .delete<void>(
                'common',
                API_ENDPOINTS.CUSTOMER.ADDRESS_BOOK.EDIT_ADDRESS + `/${addressId}`
            )
            .pipe(
                tap(() => {
                    const currentAddresses = this._state().addresses;
                    const filteredAddresses = currentAddresses.filter((addr) => addr.id !== addressId);
                    this.patchState({
                        addresses: filteredAddresses,
                        isLoading: false
                    });
                }),
                catchError((error) => {
                    this.patchState({ error: error.message, isLoading: false });
                    return throwError(() => error);
                })
            );
    }

    /**
     * Set default shipping address
     */
    setDefaultShippingAddress(addressId: number): Observable<ResponseEntity<UserAddress>> {
        return this.apiCall
            .put<UserAddress>(
                'common',
                API_ENDPOINTS.CUSTOMER.ADDRESS_BOOK.SET_DEFAULT_SHIPPING_ADDRESS + `/${addressId}`,
                {}
            )
            .pipe(
                tap((res) => {
                    const currentAddresses = this._state().addresses;
                    const updatedAddresses = currentAddresses.map((addr) => ({
                        ...addr,
                        is_default_shipping: addr.id === addressId,
                    }));
                    this.patchState({ addresses: updatedAddresses });
                })
            );
    }

    /**
     * Set default billing address
     */
    setDefaultBillingAddress(addressId: number): Observable<ResponseEntity<UserAddress>> {
        return this.apiCall
            .put<UserAddress>(
                'common',
                API_ENDPOINTS.CUSTOMER.ADDRESS_BOOK.SET_DEFAULT_BILLING_ADDRESS + `/${addressId}`,
                {}
            )
            .pipe(
                tap((res) => {
                    const currentAddresses = this._state().addresses;
                    const updatedAddresses = currentAddresses.map((addr) => ({
                        ...addr,
                        is_default_billing: addr.id === addressId,
                    }));
                    this.patchState({ addresses: updatedAddresses });
                })
            );
    }

    // ── Email/Phone Verification ─────────────────────────

    /**
     * Send email verification
     */
    sendEmailVerification(): Observable<ResponseEntity<any>> {
        return this.apiCall.post<any>(
            'common',
            API_ENDPOINTS.CUSTOMER.USER.SEND_EMAIL_VERIFICATION,
            {}
        );
    }

    /**
     * Verify email with OTP
     */
    verifyEmail(otp: string): Observable<ResponseEntity<any>> {
        return this.apiCall
            .post<any>('common', API_ENDPOINTS.CUSTOMER.USER.VERIFY_EMAIL, { otp })
            .pipe(
                tap(() => {
                    const currentProfile = this._state().profile;
                    if (currentProfile) {
                        this.patchState({
                            profile: { ...currentProfile, is_email_verified: true },
                        });
                    }
                })
            );
    }

    /**
     * Send phone verification
     */
    sendPhoneVerification(): Observable<ResponseEntity<any>> {
        return this.apiCall.post<any>(
            'common',
            API_ENDPOINTS.CUSTOMER.USER.SEND_PHONE_VERIFICATION,
            {}
        );
    }

    /**
     * Verify phone with OTP
     */
    verifyPhone(otp: string): Observable<ResponseEntity<any>> {
        return this.apiCall
            .post<any>('common', API_ENDPOINTS.CUSTOMER.USER.VERIFY_PHONE, { otp })
            .pipe(
                tap(() => {
                    const currentProfile = this._state().profile;
                    if (currentProfile) {
                        this.patchState({
                            profile: { ...currentProfile, is_phone_verified: true },
                        });
                    }
                })
            );
    }


    /**
     * Upload profile picture
     */
    uploadProfilePic(file: File): Observable<ResponseEntity<any>> {
        this.patchState({ isLoading: true, error: null });

        const currentProfile = this.profile();
        if (!currentProfile?.user_code) {
            this.patchState({ isLoading: false, error: 'User profile not found' });
            return throwError(() => new Error('User profile not found'));
        }

        // Match backend pattern: 'data' (JSON) + 'files' (file)
        const formData = new FormData();
        formData.append('data', JSON.stringify({ user_code: currentProfile.user_code }));
        formData.append('files', file);

        return this.apiCall
            .post<any>('common', API_ENDPOINTS.CUSTOMER.USER.UPLOAD_PROFILE_PIC, formData)
            .pipe(
                tap((response: any) => {
                    if (response?.data?.profile_photo_url) {
                        const updatedProfile = {
                            ...currentProfile,
                            profile_photo_url: response.data.profile_photo_url,
                        };
                        this.patchState({ profile: updatedProfile, isLoading: false });
                    } else {
                        this.patchState({ isLoading: false });
                    }
                }),
                catchError((error) => {
                    this.patchState({ error: error.message, isLoading: false });
                    return throwError(() => error);
                })
            );
    }

    /**
     * Remove profile picture
     */
    removeProfilePic(): Observable<ResponseEntity<any>> {
        this.patchState({ isLoading: true, error: null });

        const currentProfile = this.profile();
        if (!currentProfile?.user_code) {
            this.patchState({ isLoading: false, error: 'User profile not found' });
            return throwError(() => new Error('User profile not found'));
        }

        return this.apiCall
            .post<any>('common', API_ENDPOINTS.CUSTOMER.USER.REMOVE_PROFILE_PIC, {
                user_code: currentProfile.user_code,
            })
            .pipe(
                tap(() => {
                    const updatedProfile = {
                        ...currentProfile,
                        profile_photo_url: null,
                    };
                    this.patchState({ profile: updatedProfile, isLoading: false });
                }),
                catchError((error) => {
                    this.patchState({ error: error.message, isLoading: false });
                    return throwError(() => error);
                })
            );
    }

    // ── Helpers ──────────────────────────────────────────

    /**
     * Patch state with partial update
     */
    private patchState(patch: Partial<UserState>): void {
        this._state.update((s) => ({ ...s, ...patch }));
    }

    /**
     * Reset user state
     */
    resetUserState(): void {
        this._state.set({
            profile: null,
            addresses: [],
            isLoading: false,
            error: null,
        });
    }

    /**
     * Clear error
     */
    clearError(): void {
        this.patchState({ error: null });
    }

    /**
     * Set loading state
     */
    setLoading(isLoading: boolean): void {
        this.patchState({ isLoading });
    }
}
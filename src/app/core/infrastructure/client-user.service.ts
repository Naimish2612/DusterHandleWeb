import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { API_ENDPOINTS } from '../global-api-endpoints/api-endpoints';
import { ApiCallService } from './api-call.service';
import { LocalStorageService } from './local-storage.service';

export interface ClientUserApiResponse {
  user_code: number;
  user_name: string;
  full_name: string | null;
  mobile_no: string;
  email_id: string;
  gender: string | null;
  birthdate: string | null;
  profession: string | null;
  city: string | null;
  state: string | null;
  company_name: string | null;
  profile_bio: string | null;
  user_type: string;
  is_active: boolean;
  is_block: boolean;
  allow_app_login: boolean;
  allow_web_login: boolean;
  allow_multi_login: boolean;
  password: string | null;
  password_hash: string | null;
  password_salt: string | null;
  profile_photo_url: string | null;
  user_roles: string[] | null;
  is_delete: boolean;
  referral_code: string | null;
  references_referral_code: string | null;
  member_since: string | null;
  email_verify?: boolean;
  phone_verify?: boolean;
}

export interface ClientNavbarUser {
  code: number;
  name: string;
  fullName: string;
  email: string;
  mobileNo: string;
  avatar: string;
  initials: string;
  plan: string;
  walletBalance: number;
  userType: string;
  gender: string;
  birthdate: string;
  profession: string;
  city: string;
  state: string;
  companyName: string;
  profileBio: string;
  profilePhotoUrl: string | null;
  referralCode: string | null;
  member_since: string | null;
  emailVerify?: boolean;
  phoneVerify?: boolean;
}

export interface ClientUserProfileUpdatePayload {
  user_code: number;
  city: string;
  state: string;
  gender: string;
  birthdate: string;
  profession: string;
  company_name: string;
  profile_bio: string;
  full_name: string;
}

export interface ClientUserPasswordUpdatePayload {
  user_code: number;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class ClientUserService {
  private readonly storageKey = 'CLIENT_USER';
  private readonly api = inject(ApiCallService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly userSubject =
    new BehaviorSubject<ClientNavbarUser | null>(this.getStoredUser());

  readonly user$ = this.userSubject.asObservable();

  get currentUser(): ClientNavbarUser | null {
    return this.userSubject.value;
  }

  getStoredUser(): ClientNavbarUser | null {
    return this.localStorageService.getDecryptItem<ClientNavbarUser>(
      this.storageKey,
    );
  }

  hydrateFromStorage(): ClientNavbarUser | null {
    const user = this.getStoredUser();
    this.userSubject.next(user);
    return user;
  }

  loadUser(forceRefresh = false): Observable<ClientNavbarUser | null> {
    const cachedUser = this.currentUser ?? this.getStoredUser();

    if (cachedUser && !forceRefresh) {
      this.userSubject.next(cachedUser);
      return of(cachedUser);
    }

    return this.api
      .get<ClientUserApiResponse>(
        'common',
        API_ENDPOINTS.USER.GET_USER_FROM_CACHE,
      )
      .pipe(
        map((response) => this.mapApiUserToNavbarUser(response.data ?? null)),
        tap((user) => {
          if (user) {
            this.localStorageService.setEncryptItem(this.storageKey, user);
          } else {
            this.localStorageService.removeItem(this.storageKey);
          }
          this.userSubject.next(user);
        }),
      );
  }

  clearUser(): void {
    this.userSubject.next(null);
    this.localStorageService.removeItem(this.storageKey);
  }

  updateProfile(
    payload: any,
  ): Observable<ClientNavbarUser | null> {
    return this.api
      .post<unknown>('common', API_ENDPOINTS.USER.USER_EDIT, payload)
      .pipe(switchMap(() => this.loadUser(true)));
  }

  updatePassword(payload: ClientUserPasswordUpdatePayload): Observable<void> {
    return this.api
      .post<unknown>('common', API_ENDPOINTS.USER.USER_CHANGE_PASSWORD, payload)
      .pipe(map(() => void 0));
  }

  sendEmailVerification(emailId: string): Observable<any> {
    return this.api.get<any>(
      'common',
      API_ENDPOINTS.USER.USER_MOBILE_OTP_VERIFICATION_BY_EMAIL + `?email=${emailId}`
    );
  }

  verifyEmail(userCode: number, otp: string): Observable<any> {
    return this.api.get<any>('common', `api/user/email/verification?user_code=${userCode}&otp=${otp}`, { user_code: userCode, otp });
  }

  private mapApiUserToNavbarUser(
    user: ClientUserApiResponse | null,
  ): ClientNavbarUser | null {
    if (!user) {
      return null;
    }

    const resolvedFullName = user.full_name?.trim() || user.user_name?.trim() || 'Guest User';

    return {
      code: user.user_code,
      name: resolvedFullName,
      fullName: resolvedFullName,
      email: user.email_id?.trim() || '',
      mobileNo: user.mobile_no?.trim() || '',
      avatar: user.profile_photo_url?.trim() || '',
      initials: this.buildInitials(resolvedFullName),
      plan: user.user_type?.trim() || 'Member',
      walletBalance: 0,
      userType: user.user_type?.trim() || '',
      gender: user.gender?.trim() || '',
      birthdate: user.birthdate?.trim() || '',
      profession: user.profession?.trim() || '',
      city: user.city?.trim() || '',
      state: user.state?.trim() || '',
      companyName: user.company_name?.trim() || '',
      profileBio: user.profile_bio?.trim() || '',
      profilePhotoUrl: user.profile_photo_url,
      referralCode: user.referral_code,
      member_since: user.member_since || '2026',
      emailVerify: user.email_verify ?? false,
      phoneVerify: user.phone_verify ?? false,
    };
  }

  private buildInitials(name: string | null | undefined): string {
    const parts = (name ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (!parts.length) {
      return 'ZU';
    }

    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
  }
}

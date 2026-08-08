import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { ApiCallService } from './api-call.service';
import { API_ENDPOINTS } from '../global-api-endpoints/api-endpoints';
import { LocalStorageService } from './local-storage.service';
import { MenuService } from './menu.service';

interface UserSession {
  token: string;
  expiresAt?: string;
  userType?: string;
}

/**
 * SessionService — access token + role in memory and localStorage.
 * Never perform navigation from token reads (interceptor runs on many requests).
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private router = inject(Router);
  private api = inject(ApiCallService);
  private _session: UserSession | null = null;
  private readonly STORAGE_KEY = 'ATOKEN';
  private ls = inject(LocalStorageService);
  private menu = inject(MenuService);

  private restoreSession(): UserSession | null {
    const raw = this.ls.getItem(this.STORAGE_KEY);
    if (!raw) return null;

    if (!raw.trim().startsWith('{')) {
      const session = { token: raw } as UserSession;
      this._session = session;
      return session;
    }

    try {
      const parsed = JSON.parse(raw) as UserSession;
      if (parsed?.token) {
        this._session = parsed;
        return parsed;
      }
    } catch {
      // ignore
    }

    return null;
  }

  /**
   * Token for outbound requests — no navigation side effects.
   */
  peekAccessToken(): string | null {
    if (this._session?.token) {
      return this._session.token;
    }
    const restored = this.restoreSession();
    return restored?.token ?? null;
  }

  /**
   * @deprecated Prefer peekAccessToken(). Does not redirect.
   */
  get token(): string | null {
    return this.peekAccessToken();
  }

  setSession(data: UserSession): void {
    this._session = data;
    this.ls.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  clearSession(): void {
    this._session = null;
    this.ls.removeItem(this.STORAGE_KEY);
    this.ls.removeItem('CLIENT_USER_PROFILE');
    this.menu.resetMenu();
    this.router.navigate(['/auth/login']);
  }

  async refreshToken(): Promise<string | null> {
    try {
      const res = await firstValueFrom(
        this.api.get<Record<string, unknown>>('common', API_ENDPOINTS.AUTH.REFRESH_TOKEN),
      );

      if (!res.data || typeof res.data !== 'object') {
        this.clearSession();
        return null;
      }

      const body = res.data as Record<string, unknown>;
      const newToken = this.pickString(body, ['token', 'Token', 'accessToken', 'AccessToken']);
      if (!newToken) {
        this.clearSession();
        return null;
      }

      const expiresAt = this.pickString(body, ['expiresAt', 'ExpiresAt', 'expires_at']);
      const prior = this._session ?? this.restoreSession();

      this.setSession({
        token: newToken,
        expiresAt: expiresAt ?? prior?.expiresAt,
        userType: prior?.userType,
      });
      return newToken;
    } catch {
      this.clearSession();
      return null;
    }
  }

  isAuthenticated(): boolean {
    const session = this._session ?? this.restoreSession();
    if (!session?.token) {
      return false;
    }

    const raw = session.expiresAt?.trim();
    if (!raw) {
      return true;
    }

    const ms = new Date(raw).getTime();
    if (!Number.isFinite(ms)) {
      // Bad or culture-specific date from API — do not treat as logged out
      return true;
    }

    return ms > Date.now();
  }

  getUserType(): string | null {
    const session = this._session ?? this.restoreSession();
    return this.normalizeUserType(session?.userType);
  }

  getDefaultRouteByUserType(userType?: string | null): string {
    switch (this.normalizeUserType(userType)) {
      case 'CUSTOMER':
        return '/customer/home';
      case 'ADMIN':
        return '/admin/home';
      default:
        return '/auth/login';
    }
  }

  /**
   * Safe post-login target: optional returnUrl only if path matches role.
   */
  resolvePostLoginRedirect(
    returnUrl: string | null | undefined,
    normalizedUserType: string,
  ): string {
    const defaultRoute = this.getDefaultRouteByUserType(normalizedUserType);
    const path = this.sanitizeInternalReturnPath(returnUrl);
    if (!path || path.startsWith('/auth/')) {
      return defaultRoute;
    }
    if (this.isRouteAllowedForUserType(path, normalizedUserType)) {
      return path;
    }
    return defaultRoute;
  }

  normalizeUserType(userType?: string | null): string | null {
    if (userType == null) {
      return null;
    }
    const raw = String(userType).trim();
    if (!raw) {
      return null;
    }

    let s = raw.toUpperCase().replace(/[\s-]+/g, '_');
    s = s.replace(/_+/g, '_');
    const compact = s.replace(/_/g, '');

    if (compact === 'CUSTOMER' || compact === 'USER' || compact === 'CLIENT') {
      return 'CUSTOMER';
    }

    if (compact === 'ADMIN' || compact === 'ADMINISTRATOR') {
      return 'ADMIN';
    }

    if (s === 'CUSTOMER' || s === 'ADMIN') {
      return s;
    }

    return null;
  }

  private pickString(o: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const v = o[key];
      if (typeof v === 'string' && v.trim().length > 0) {
        return v;
      }
    }
    return undefined;
  }

  private sanitizeInternalReturnPath(raw: string | null | undefined): string | null {
    if (!raw?.trim()) {
      return null;
    }
    let s = raw.trim();
    if (s.includes('://')) {
      return null;
    }
    if (!s.startsWith('/')) {
      s = `/${s}`;
    }
    s = s.replace(/\/{2,}/g, '/');
    const pathOnly = s.split('?')[0].split('#')[0];
    if (!pathOnly || pathOnly === '/') {
      return null;
    }
    return pathOnly;
  }

  private isRouteAllowedForUserType(path: string, userType: string): boolean {
    const p = path.toLowerCase();
    if (p === '/' || p.startsWith('/site')) {
      return true;
    }
    if (p.startsWith('/customer')) {
      return userType === 'CUSTOMER';
    }

    if (p.startsWith('/admin')) {
      return userType === 'ADMIN';
    }
    return false;
  }
}

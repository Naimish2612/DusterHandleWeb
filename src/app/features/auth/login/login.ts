import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectorRef, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { finalize } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/global-api-endpoints/api-endpoints';
import { ApiCallService } from '../../../core/infrastructure/api-call.service';
import { SessionService } from '../../../core/infrastructure/session.service';
import { CartService } from '../../public/services/cart.service';

// ─── Storage Keys for Remember Me ────────────────
const REMEMBER_ME_KEY = 'auth.rememberMe';
const REMEMBERED_EMAIL_KEY = 'auth.rememberedEmail';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCheckboxModule,
    NzIconModule,
    NzDividerModule,
    NzSpinModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit, AfterViewInit {
  loginForm!: FormGroup;
  isLoading = false;
  passwordVisible = false;
  showForgotPassword = false;
  forgotEmail = '';
  isForgotLoading = false;
  forgotSent = false;

  @ViewChild('passwordInput') passwordInput?: ElementRef<HTMLInputElement>;

  constructor(private fb: FormBuilder) { }

  private message = inject(NzMessageService);
  private api = inject(ApiCallService);
  private sessionService = inject(SessionService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private cartService = inject(CartService);

  // ─────────────────────────────────────────────────
  //  Lifecycle
  // ─────────────────────────────────────────────────
  ngOnInit(): void {
    // ✅ Read previously saved Remember Me state
    const rememberSaved = this.readRememberFlag();
    const savedEmail = rememberSaved ? this.readSavedEmail() : '';

    this.loginForm = this.fb.group({
      user_name: [savedEmail, [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [rememberSaved], // ✅ checkbox reflects saved choice
    });
  }


  ngAfterViewInit(): void {
    // ✅ If email was pre-filled, auto-focus the password field for better UX
    if (this.loginForm.get('user_name')?.value && this.passwordInput) {
      setTimeout(() => this.passwordInput?.nativeElement?.focus(), 0);
    }
  }

  // ─────────────────────────────────────────────────
  //  Remember Me — Storage Helpers (safe wrappers)
  // ─────────────────────────────────────────────────
  private readRememberFlag(): boolean {
    try {
      return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private readSavedEmail(): string {
    try {
      return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? '';
    } catch {
      return '';
    }
  }

  private persistRememberedEmail(email: string): void {
    try {
      localStorage.setItem(REMEMBER_ME_KEY, 'true');
      localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    } catch {
      /* storage disabled / quota exceeded — silently ignore */
    }
  }

  private clearRememberedEmail(): void {
    try {
      localStorage.removeItem(REMEMBER_ME_KEY);
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } catch {
      /* ignore */
    }
  }

  // ─────────────────────────────────────────────────
  //  Response parsing helpers
  // ─────────────────────────────────────────────────
  private firstNonEmptyString(o: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const v = o[key];
      if (typeof v === 'string' && v.trim().length > 0) {
        return v;
      }
    }
    return undefined;
  }

  /**
   * Public APIs often use PascalCase JSON; local dev may use camelCase.
   */
  private extractLoginPayload(data: unknown): {
    token: string;
    userType?: string;
    expiresAt?: string;
  } | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    const o = data as Record<string, unknown>;
    const token = this.firstNonEmptyString(o, ['token', 'Token']);
    if (!token) {
      return null;
    }
    const userType = this.firstNonEmptyString(o, ['userType', 'UserType']);
    const expiresAt = this.firstNonEmptyString(o, ['expiresAt', 'ExpiresAt', 'expires_at']);
    return { token, userType, expiresAt };
  }



  onLogin(): void {
    Object.values(this.loginForm.controls).forEach((c) => {
      c.markAsDirty();
      c.updateValueAndValidity();
    });

    if (this.loginForm.invalid) return;

    this.isLoading = true;

    const rawValue = this.loginForm.value;
    const normalizedEmail = String(rawValue.user_name ?? '').trim().toLowerCase();
    const rememberMe = !!rawValue.remember;

    const payload = {
      user_name: normalizedEmail,
      password: rawValue.password,
      remember: rememberMe,
    };

    this.api
      .post<any>('common', API_ENDPOINTS.AUTH.LOGIN, payload) // ✅ send normalized
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          const payloadRes = this.extractLoginPayload(res.data);
          if (!payloadRes) {
            this.message.error(res.message || 'Login failed: invalid response from server.');
            return;
          }
          const normalizedType = this.sessionService.normalizeUserType(payloadRes.userType);
          if (!normalizedType) {
            this.message.error(
              'Login succeeded but user role is missing or not recognized. Please contact support.',
            );
            return;
          }

          // ✅ Persist or clear Remember Me data based on checkbox state
          if (rememberMe) {
            this.persistRememberedEmail(normalizedEmail);
          } else {
            this.clearRememberedEmail();
          }

          this.sessionService.setSession({
            token: payloadRes.token,
            expiresAt: payloadRes.expiresAt,
            userType: normalizedType,
          });

          // ✅ Initialize cart only for CUSTOMER users
          this.handlePostLogin(normalizedType, res.message);
        },
        error: (err) => {
          this.message.error(err.message || 'Login failed. Please try again.');
        },
      });
  }

  private handlePostLogin(userType: string, successMessage?: string): void {
    const returnUrl = this.activatedRoute.snapshot.queryParamMap.get('returnUrl');
    const target = this.sessionService.resolvePostLoginRedirect(returnUrl, userType);

    // ✅ Only load cart for CUSTOMER
    if (userType === 'CUSTOMER') {
      this.cartService.initializeCart().subscribe({
        next: () => this.completeLogin(target, successMessage),
        error: () => this.completeLogin(target, successMessage),
      });
    } else {
      this.completeLogin(target, successMessage);
    }
  }

  private completeLogin(target: string, successMessage?: string): void {
    this.message.success(successMessage || 'Welcome back.');
    void this.router.navigateByUrl(target, { replaceUrl: true });
  }


  loginWithGoogle(): void {
    this.message.info('Coming Soon...!');
  }

  loginWithLinkedIn(): void {
    this.message.info('Coming Soon...!');
  }

  toggleForgotPassword(): void {
    void this.router.navigate(['/auth/forgot/password']);
  }

  onForgotSubmit(): void {
    if (!this.forgotEmail) return;
    this.isForgotLoading = true;
    setTimeout(() => {
      this.isForgotLoading = false;
      this.forgotSent = true;
    }, 1500);
  }
}

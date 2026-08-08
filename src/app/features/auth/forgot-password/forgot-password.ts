import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { finalize, Subscription, interval } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/global-api-endpoints/api-endpoints';
import { ApiCallService } from '../../../core/infrastructure/api-call.service';

interface PasswordRule {
  label: string;
  test: (value: string) => boolean;
  met: boolean;
}

interface PasswordStrength {
  score: number;        // 0-100
  label: string;        // 'Weak', 'Fair', 'Good', 'Strong'
  color: string;        // Hex color
  status: 'success' | 'exception' | 'active' | 'normal';
}

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzStepsModule,
    NzResultModule,
    NzProgressModule,
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword implements OnDestroy {
  currentStep = 0;
  email_id = '';
  otp = ['', '', '', '', '', ''];
  newPassword = '';
  confirmPassword = '';
  isLoading = false;
  isResending = false;
  passwordVisible = false;
  confirmPasswordVisible = false;
  user_code = 0;

  // ✅ NEW: Resend cooldown management
  resendCooldown = 0;
  readonly RESEND_COOLDOWN_SECONDS = 30;
  readonly OTP_EXPIRY_SECONDS = 300;
  otpExpiryCountdown = 0;

  private cooldownSub?: Subscription;
  private expirySub?: Subscription;

  passwordRules: PasswordRule[] = [
    {
      label: 'At least 8 characters',
      test: (v) => v.length >= 8,
      met: false,
    },
    {
      label: 'One uppercase letter (A-Z)',
      test: (v) => /[A-Z]/.test(v),
      met: false,
    },
    {
      label: 'One lowercase letter (a-z)',
      test: (v) => /[a-z]/.test(v),
      met: false,
    },
    {
      label: 'One number (0-9)',
      test: (v) => /\d/.test(v),
      met: false,
    },
    {
      label: 'One special character (!@#$%^&*)',
      test: (v) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(v),
      met: false,
    },
  ];

  // ✅ NEW: Password strength state
  passwordStrength: PasswordStrength = {
    score: 0,
    label: '',
    color: '#ff4d4f',
    status: 'exception',
  };

  private api = inject(ApiCallService);
  private message = inject(NzMessageService);
  cdr = inject(ChangeDetectorRef);

  ngOnDestroy(): void {
    this.clearTimers();
  }

  onPasswordChange(): void {
    this.evaluatePasswordStrength();
  }

  private evaluatePasswordStrength(): void {
    const value = this.newPassword || '';
 
    this.passwordRules = this.passwordRules.map((rule) => ({
      ...rule,
      met: rule.test(value),
    }));

    // Count met rules
    const metCount = this.passwordRules.filter((r) => r.met).length;
    const totalRules = this.passwordRules.length;
    const score = Math.round((metCount / totalRules) * 100);

    // Determine label, color, and status
    let label = '';
    let color = '#ff4d4f';
    let status: 'success' | 'exception' | 'active' | 'normal' = 'exception';

    if (value.length === 0) {
      label = '';
      score === 0;
    } else if (metCount <= 1) {
      label = 'Very Weak';
      color = '#ff4d4f';  // error-500
      status = 'exception';
    } else if (metCount === 2) {
      label = 'Weak';
      color = '#faad14';  // warning-500
      status = 'exception';
    } else if (metCount === 3) {
      label = 'Fair';
      color = '#faad14';  // warning-500
      status = 'active';
    } else if (metCount === 4) {
      label = 'Good';
      color = '#1890ff';  // info-500
      status = 'active';
    } else if (metCount === 5) {
      label = 'Strong';
      color = '#52c41a';  // success-500
      status = 'success';
    }

    this.passwordStrength = { score, label, color, status };
  }

  // ✅ NEW: Check if password meets minimum requirements
  get isPasswordValid(): boolean {
    return this.passwordRules.every((rule) => rule.met);
  }

  get passwordsMatch(): boolean {
    return !!this.newPassword && this.newPassword === this.confirmPassword;
  }

  onSubmitEmail(): void {
    if (!this.email_id) return;

    this.isLoading = true;

    this.api
      .get<any>(
        'common',
        API_ENDPOINTS.USER.USER_MOBILE_OTP_VERIFICATION_BY_EMAIL + `?email=${this.email_id}`,
      )
      .pipe(
        finalize(() => {
          // this runs only after API completes or errors
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (res) => {
          console.log(res);
          this.message.success(res.message || 'OTP sent successfully to your email.');
          this.currentStep = 1;
          this.startResendCooldown();
          this.startOtpExpiryCountdown();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.message.error(err.message || 'OTP Sending failed. Please try again.');
        },
      });
  }

  // ════════════════════════════════════════
  // ✅ NEW: Resend OTP — separate handler
  // ════════════════════════════════════════
  onResendOtp(): void {
    if (this.resendCooldown > 0 || this.isResending) return;

    this.isResending = true;

    this.api
      .get<any>(
        'common',
        API_ENDPOINTS.USER.USER_MOBILE_OTP_VERIFICATION_BY_EMAIL + `?email=${this.email_id}`,
      )
      .pipe(finalize(() => (this.isResending = false)))
      .subscribe({
        next: (res) => {
          // ✅ CRITICAL: Clear old OTP from UI
          this.clearOtpInputs();

          this.message.success(
            res.message || 'A new OTP has been sent. Please use the latest code.'
          );

          // ✅ Restart timers
          this.startResendCooldown();
          this.startOtpExpiryCountdown();
          this.focusFirstOtpInput();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.message.error(err.message || 'Failed to resend OTP. Please try again.');
        },
      });
  }

  // ════════════════════════════════════════
  // STEP 1 — Verify OTP
  // ════════════════════════════════════════
  onVerifyOtp(): void {
    const code = this.otp.join('');
    if (code.length < 6) return;

    // ✅ Check if OTP has expired client-side
    if (this.otpExpiryCountdown <= 0) {
      this.message.error('OTP has expired. Please request a new one.');
      return;
    }

    this.isLoading = true;

    this.api
      .get<any>(
        'common',
        API_ENDPOINTS.USER.USER_PASSWORD_RESET_OTP_VERIFICATION +
        `?email=${this.email_id}&otp=${code}`,
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (res) => {
          this.message.success(res.message || 'OTP verified successfully.');
          this.currentStep = 2;
          this.user_code = res.data?.user_code || 0;
          this.clearTimers();  // ✅ Stop timers when moving forward
          this.cdr.detectChanges();
        },
        error: (err) => {
          // ✅ Clear OTP on failure to encourage re-entry
          this.clearOtpInputs();
          this.focusFirstOtpInput();
          this.message.error(err.message || 'OTP verification failed. Please try again.');
        },
      });
  }

  onResetPassword(): void {
    if (!this.newPassword) {
      this.message.error('Please enter a new password.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.message.error('Passwords do not match.');
      return;
    }

    if (!this.user_code) {
      this.message.error('User verification is missing. Please verify OTP again.');
      return;
    }

    this.isLoading = true;

    this.api
      .post<any>('common', API_ENDPOINTS.USER.USER_CHANGE_PASSWORD, {
        user_code: this.user_code,
        new_password: this.newPassword,
      })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (res) => {
          this.message.success(res.message || 'Password changed successfully.');
          this.currentStep = 3;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.message.error(err.message || 'Failed to change password. Please try again.');
        },
      });
  }

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;

    const numericValue = input.value.replace(/\D/g, '');
    if (input.value !== numericValue) {
      input.value = numericValue;
      this.otp[index] = numericValue;
    }

    if (numericValue.length === 1 && index < 5) {
      const next = input.parentElement?.querySelectorAll('input')[index + 1];
      (next as HTMLInputElement)?.focus();
    }
  }

  onOtpKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.otp[index] && index > 0) {
      const prev = (event.target as HTMLElement).parentElement?.querySelectorAll('input')[
        index - 1
      ];
      (prev as HTMLInputElement)?.focus();
    }
  }

  // ✅ NEW: Handle paste of full OTP
  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text').trim() || '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);

    if (digits.length === 6) {
      this.otp = digits.split('');
      this.cdr.detectChanges();
      // Focus last input
      setTimeout(() => {
        const inputs = document.querySelectorAll('.forgot-form__otp-input');
        (inputs[5] as HTMLInputElement)?.focus();
      });
    }
  }

  // ════════════════════════════════════════
  // ✅ NEW: Timer Management
  // ════════════════════════════════════════
  private startResendCooldown(): void {
    this.cooldownSub?.unsubscribe();
    this.resendCooldown = this.RESEND_COOLDOWN_SECONDS;

    this.cooldownSub = interval(1000).subscribe(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        this.cooldownSub?.unsubscribe();
      }
      this.cdr.detectChanges();
    });
  }

  private startOtpExpiryCountdown(): void {
    this.expirySub?.unsubscribe();
    this.otpExpiryCountdown = this.OTP_EXPIRY_SECONDS;

    this.expirySub = interval(1000).subscribe(() => {
      this.otpExpiryCountdown--;
      if (this.otpExpiryCountdown <= 0) {
        this.expirySub?.unsubscribe();
        this.clearOtpInputs();
        this.message.warning('OTP has expired. Please request a new one.');
      }
      this.cdr.detectChanges();
    });
  }

  private clearTimers(): void {
    this.cooldownSub?.unsubscribe();
    this.expirySub?.unsubscribe();
    this.resendCooldown = 0;
    this.otpExpiryCountdown = 0;
  }

  private clearOtpInputs(): void {
    this.otp = ['', '', '', '', '', ''];
  }

  private focusFirstOtpInput(): void {
    setTimeout(() => {
      const firstInput = document.querySelector('.forgot-form__otp-input') as HTMLInputElement;
      firstInput?.focus();
    });
  }

  get maskedEmail(): string {
    const [user, domain] = this.email_id.split('@');
    if (!user || !domain) return this.email_id;
    return `${user.substring(0, 2)}***@${domain}`;
  }

  get formattedExpiryTime(): string {
    const mins = Math.floor(this.otpExpiryCountdown / 60);
    const secs = this.otpExpiryCountdown % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  get canResend(): boolean {
    return this.resendCooldown <= 0 && !this.isResending;
  }
}
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { finalize } from 'rxjs/operators';
import { ChangePasswordPayload } from '../../../features/customer/models/user.common.model';
import { UserService } from '../../../features/customer/services/user.service';
import { ClientUserService } from '../../../core/infrastructure/client-user.service';
import { Router } from '@angular/router';
import { SessionService } from '../../../core/infrastructure/session.service';
import { CartService } from '../../../features/public/services/cart.service';

// Password complexity validator
function passwordComplexityValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v: string = ctrl.value || '';
  const missing: string[] = [];
  if (v.length < 8) missing.push('minLength');
  if (!/[A-Z]/.test(v)) missing.push('uppercase');
  if (!/[a-z]/.test(v)) missing.push('lowercase');
  if (!/[0-9]/.test(v)) missing.push('number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v)) missing.push('special');
  return missing.length ? { complexity: missing } : null;
}

// Cross-field confirm validator
function confirmPasswordValidator(group: AbstractControl): ValidationErrors | null {
  const np = group.get('new_password')?.value;
  const cp = group.get('confirm_password')?.value;
  if (cp && np !== cp) {
    group.get('confirm_password')?.setErrors({ mismatch: true });
    return { mismatch: true };
  } else {
    if (group.get('confirm_password')?.hasError('mismatch')) {
      group.get('confirm_password')?.setErrors(null);
    }
    return null;
  }
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzProgressModule,
    NzAlertModule,
  ],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss',
})
export class ChangePassword {
  /** Pass user role so title/context can differ: 'customer' | 'admin' | 'vendor' */
  @Input() userRole: 'customer' | 'admin' | 'vendor' = 'customer';

  /** Emits on successful password change */
  @Output() passwordChanged = new EventEmitter<void>();

  /** Emits on cancel */
  @Output() cancelled = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private message = inject(NzMessageService);
  private userService = inject(UserService);
  private clientUserService = inject(ClientUserService);
  router = inject(Router);
  session = inject(SessionService)
  cartService = inject(CartService)

  isLoading = signal(false);
  showCurrentPwd = signal(false);
  showNewPwd = signal(false);
  showConfirmPwd = signal(false);

  form: FormGroup = this.fb.group(
    {
      current_password: [null, [Validators.required]],
      new_password: [null, [Validators.required, passwordComplexityValidator]],
      confirm_password: [null, [Validators.required]],
    },
    { validators: confirmPasswordValidator },
  );

  get passwordStrength(): {
    score: number;
    label: string;
    color: string;
    status: 'exception' | 'normal' | 'active' | 'success';
  } {
    const v: string = this.form.get('new_password')?.value || '';
    let score = 0;
    if (v.length >= 8) score += 20;
    if (v.length >= 12) score += 10;
    if (/[A-Z]/.test(v)) score += 20;
    if (/[a-z]/.test(v)) score += 15;
    if (/[0-9]/.test(v)) score += 20;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v)) score += 15;
    if (score <= 20) return { score, label: 'Very Weak', color: '#ff4d4f', status: 'exception' };
    if (score <= 40) return { score, label: 'Weak', color: '#ff7a45', status: 'exception' };
    if (score <= 60) return { score, label: 'Fair', color: '#faad14', status: 'normal' };
    if (score <= 80) return { score, label: 'Strong', color: '#52c41a', status: 'active' };
    return { score, label: 'Very Strong', color: '#009CDE', status: 'success' };
  }

  get passwordRules() {
    const v: string = this.form.get('new_password')?.value || '';
    return [
      { label: 'At least 8 characters', met: v.length >= 8 },
      { label: 'One uppercase letter', met: /[A-Z]/.test(v) },
      { label: 'One lowercase letter', met: /[a-z]/.test(v) },
      { label: 'One number', met: /[0-9]/.test(v) },
      { label: 'One special character', met: /[!@#$%^&*()\-_=+]/.test(v) },
    ];
  }

  /**
   * Submit handler — calls UserService.changePassword API
   */
  submit(): void {
    if (this.form.value.current_password == this.form.value.new_password) {
      this.message.warning('Your new and exisiting password can not be same.');
      return;
    }
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      this.message.warning('Please fill all required fields correctly.');
      return;
    }

    // Handle Admin user password change
    if (this.userRole === 'admin') {
      const storedUser = this.clientUserService.currentUser;
      if (!storedUser?.code) {
        this.message.error('User profile not found. Please refresh and try again.');
        return;
      }

      this.isLoading.set(true);
      const payload = {
        user_code: storedUser.code,
        password: this.form.value.current_password,
        new_password: this.form.value.new_password,
      };

      this.clientUserService
        .updatePassword(payload)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.message.success('Password updated successfully.');
            this.router.navigate(['/auth/login']);
            this.form.reset();
            this.passwordChanged.emit();
          },
          error: (error) => {
            console.error('Change password error:', error);
            this.message.error(
              error.error?.message ||
                error.message ||
                'Failed to change password. Please try again.',
            );
          },
        });
      return;
    }

    // Verify user profile exists (needed for user_code) for customer/other roles
    const profile = this.userService.profile();
    if (!profile?.user_code) {
      this.message.error('User profile not found. Please refresh and try again.');
      return;
    }

    this.isLoading.set(true);

    const payload = {
      user_code: profile.user_code,
      password: this.form.value.current_password,
      new_password: this.form.value.new_password,
    };

    this.userService
      .changePassword(payload)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          // Adjust based on your ResponseEntity structure
          if (response?.status !== false) {
            this.message.success('Password updated successfully.');
            this.form.reset();
            this.session.clearSession();
            this.clientUserService.clearUser();
            this.cartService.resetCart();
            setTimeout(() => {
              window.location.href = '/home';
            }, 600);
            this.passwordChanged.emit();
          } else {
            this.message.error(response?.message || 'Failed to change password.');
          }
        },
        error: (error) => {
          console.error('Change password error:', error);
          if (error.status === 401) {
            this.message.error('Session expired. Please login again.');
          } else if (error.status === 400) {
            this.message.error(error.error?.message || 'Invalid password data.');
          } else if (error.status === 422) {
            this.message.error('Validation failed. Please check your inputs.');
          } else {
            this.message.error(
              error.error?.message ||
                error.message ||
                'Failed to change password. Please try again.',
            );
          }
        },
      });
  }

  cancel(): void {
    this.form.reset();
    this.cancelled.emit();
  }
}

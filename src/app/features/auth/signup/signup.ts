import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { finalize } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/global-api-endpoints/api-endpoints';
import { ApiCallService } from '../../../core/infrastructure/api-call.service';
import { NotificationService } from '../../../core/infrastructure/notification.service';
import { PolicyModalComponent } from "../../../shared/ui/policy-modal/policy-modal";

interface SignupRequestPayload {
  user_name: string;
  email_id: string;
  password: string;
  mobile_no: string;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzDividerModule,
    NzProgressModule,
    NzCheckboxModule,
    NzSelectModule,
    NzInputNumberModule,
    PolicyModalComponent
  ],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup implements OnInit {
  signupForm!: FormGroup;
  isLoading = false;
  passwordVisible = false;
  confirmPasswordVisible = false;
  isPolicyModalOpen = false;
  activePolicyKey = ''

  private message = inject(NzMessageService);
  private api = inject(ApiCallService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.signupForm = this.fb.group(
      {
        user_name: ['', [Validators.required, Validators.minLength(2), this.noWhitespaceValidator]],
        email_id: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        mobile_no: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
        confirmPassword: ['', [Validators.required]],
        agreeTerms: [false, [Validators.requiredTrue]],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const trimmed = typeof value === 'string' ? value.trim() : '';
    return trimmed.length < 2 ? { whitespace: true } : null;
  }



  get passwordRules() {
    const v: string = this.signupForm.get('password')?.value || '';
    return [
      { label: 'At least 8 characters', met: v.length >= 8 },
      { label: 'One uppercase letter', met: /[A-Z]/.test(v) },
      { label: 'One lowercase letter', met: /[a-z]/.test(v) },
      { label: 'One number', met: /[0-9]/.test(v) },
      { label: 'One special character', met: /[!@#$%^&*()\-_=+]/.test(v) },
    ];
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirm = control.get('confirmPassword');
    if (password && confirm && password.value !== confirm.value) {
      confirm?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  get passwordStrength(): {
    score: number; label: string; color: string; status: 'exception' | 'normal' | 'active' | 'success';
  } {
    const v: string = this.signupForm.get('password')?.value || '';
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

  onSignup(): void {
    Object.values(this.signupForm.controls).forEach((c) => {
      c.markAsDirty();
      c.updateValueAndValidity();
    });

    if (this.signupForm.invalid) {
      this.message.error('Please fix the errors before continuing.');
      return;
    }

    this.isLoading = true;
    const payload = this.buildSignupPayload();

    this.api
      .post<unknown>('common', API_ENDPOINTS.USER.USER_CREATE, payload)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (res) => {
          this.notification.Success({
            title: '',
            message: res.message || 'Signup successfully.',
          });
          this.signupForm.reset({
            user_name: '',
            email_id: '',
            password: '',
            mobile_no: '',
            confirmPassword: '',
            agreeTerms: false,
          });
          this.router.navigate(['/auth/login']);
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message: err.message || 'Signup failed. Please try again.',
          });
        },
      });
  }

  private buildSignupPayload(): SignupRequestPayload {
    const rawValue = this.signupForm.getRawValue();

    return {
      user_name: String(rawValue.user_name ?? '').trim(),
      email_id: String(rawValue.email_id ?? '').trim(),
      password: String(rawValue.password ?? ''),
      mobile_no: String(rawValue.mobile_no ?? '').trim(),
    };
  }

  signupWithGoogle(): void {
    this.message.info('Comming Soon...!');
  }

  /**
  * Open policy modal without toggling the checkbox
  * event.preventDefault() → stops checkbox toggle
  * event.stopPropagation() → stops label click bubbling
  */
  openPolicy(key: string, event: MouseEvent): void {
    event.preventDefault();    // ← prevent checkbox from toggling
    event.stopPropagation();   // ← prevent label click bubbling
    this.activePolicyKey = key;
    this.isPolicyModalOpen = true;
  }

  closePolicy(): void {
    this.isPolicyModalOpen = false;
    this.activePolicyKey = '';
  }

}

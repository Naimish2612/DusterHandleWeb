import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// Ant Design Modules
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

// Infrastructure Services
import { ClientUserService, ClientNavbarUser } from '../../../../core/infrastructure/client-user.service';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { finalize } from 'rxjs/operators';
import { NzCardModule } from 'ng-zorro-antd/card';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NzAvatarModule,
    NzButtonModule,
    NzDatePickerModule,
    NzDividerModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    NzSkeletonModule,
    NzModalModule,
    NzCardModule,
    NzTabsModule,
    NzTagModule,
    NzToolTipModule
  ],
  templateUrl: './admin-profile.html',
  styleUrl: './admin-profile.scss',
})
export class AdminProfile implements OnInit {
  private fb = inject(FormBuilder);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);
  private cdr = inject(ChangeDetectorRef);
  private clientUserService = inject(ClientUserService);
  private api = inject(ApiCallService);

  // Local signals
  isSaving = signal(false);
  isUploadingPic = signal(false);
  isLoading = signal(true);
  user = signal<ClientNavbarUser | null>(null);

  genderOptions = [
    { label: 'FEMALE', value: 'FEMALE' },
    { label: 'MALE', value: 'MALE' },
    { label: 'OTHERS', value: 'OTHERS' },
    { label: 'PREFER NOT TO SAY', value: 'PREFER NOT TO SAY' },
  ];

  profileForm: FormGroup = this.fb.group({
    full_name: [null, [Validators.required, Validators.minLength(2)]],
    email_id: [null, [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
    mobile_no: [{ value: null, disabled: true }],
    gender: [null],
    birthdate: [null],
  });

  // Getter methods for template
  get userInitials(): string {
    const u = this.user();
    if (!u || !u.fullName) return 'A';
    const parts = u.fullName.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || '').join('');
  }

  get memberSince(): string {
    const u = this.user();
    if (!u || !u.member_since) return '2026';
    try {
      const d = new Date(u.member_since);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      }
    } catch (e) { }
    return u.member_since;
  }

  isFormUnchanged(): boolean {
    const u = this.user();
    if (!u) return true;

    const formValue = this.profileForm.getRawValue();

    // Compare name
    const formName = (formValue.full_name || '').trim();
    const userName = (u.fullName || '').trim();
    if (formName !== userName) return false;

    // Compare email
    const formEmail = (formValue.email_id || '').trim();
    const userEmail = (u.email || '').trim();
    if (formEmail !== userEmail) return false;

    // Compare mobile
    const formMobile = (formValue.mobile_no || '').trim();
    const userMobile = (u.mobileNo || '').trim();
    if (formMobile !== userMobile) return false;

    // Compare gender
    const formGender = formValue.gender || '';
    const userGender = u.gender || '';
    if (formGender !== userGender) return false;

    // Compare birthdate (format as YYYY-MM-DD for comparison)
    let formDateStr = '';
    if (formValue.birthdate) {
      try {
        const d = new Date(formValue.birthdate);
        if (!isNaN(d.getTime())) {
          formDateStr = d.toISOString().split('T')[0];
        }
      } catch (e) {}
    }

    let userDateStr = '';
    if (u.birthdate) {
      try {
        const d = new Date(u.birthdate);
        if (!isNaN(d.getTime())) {
          userDateStr = d.toISOString().split('T')[0];
        }
      } catch (e) {}
    }

    return formDateStr === userDateStr;
  }

  ngOnInit(): void {
    this.clientUserService.user$.subscribe((u) => {
      this.user.set(u);
      if (u) {
        this.patchFormValues(u);
      }
    });

    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.isLoading.set(true);
    this.clientUserService.loadUser(true)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (u) => {
          if (u) {
            this.user.set(u);
            this.patchFormValues(u);
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error('Error loading profile:', error);
          this.message.error('Failed to load profile details. Please try again.');
        },
      });
  }

  private patchFormValues(user: ClientNavbarUser): void {
    this.profileForm.patchValue({
      full_name: user.fullName,
      email_id: user.email,
      mobile_no: user.mobileNo,
      gender: user.gender,
      birthdate: user.birthdate ? new Date(user.birthdate) : null,
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      Object.values(this.profileForm.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      this.message.warning('Please fill all required fields correctly.');
      return;
    }

    const u = this.user();
    if (!u) {
      this.message.error('User session not found.');
      return;
    }

    this.isSaving.set(true);
    const formValue = this.profileForm.getRawValue();
    console.log(formValue)
    const payload = {
      user_code: u.code,
      gender: formValue.gender || '',
      birthdate: formValue.birthdate ? new Date(formValue.birthdate).toISOString().split('T')[0] : '',
      full_name: formValue.full_name,
      mobile_no: formValue.mobile_no,
      email_id: formValue.email_id
    };
    console.log(payload)

    this.clientUserService
      .updateProfile(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.message.success('Profile updated successfully.');
          this.loadUserProfile();
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          this.message.error(error?.error?.message || 'Failed to update profile. Please try again.');
        },
      });
  }

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.message.error('Image size must be less than 5MB');
      input.value = '';
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.message.error('Only JPEG, PNG, and WEBP images are allowed');
      input.value = '';
      return;
    }

    this.uploadProfilePic(file);
    input.value = '';
  }

  private uploadProfilePic(file: File): void {
    const u = this.user();
    if (!u) return;

    this.isUploadingPic.set(true);
    const formData = new FormData();
    formData.append('data', JSON.stringify({ user_code: u.code }));
    formData.append('files', file);

    this.api.post<any>('common', API_ENDPOINTS.CUSTOMER.USER.UPLOAD_PROFILE_PIC, formData)
      .pipe(finalize(() => this.isUploadingPic.set(false)))
      .subscribe({
        next: () => {
          this.message.success('Profile picture updated successfully.');
          this.clientUserService.loadUser(true).subscribe({
            next: (updatedUser) => {
              if (updatedUser) {
                this.user.set(updatedUser);
                this.patchFormValues(updatedUser);
                this.cdr.detectChanges();
              }
            }
          });
        },
        error: (error) => {
          console.error('Upload error:', error);
          this.message.error(error?.error?.message || 'Failed to upload profile picture.');
        },
      });
  }

  removeProfilePic(): void {
    const u = this.user();
    if (!u) return;

    this.modal.confirm({
      nzTitle: 'Remove Profile Picture?',
      nzContent: 'Are you sure you want to remove your profile picture?',
      nzOkText: 'Remove',
      nzOkDanger: true,
      nzCancelText: 'Cancel',
      nzOnOk: () => {
        this.isUploadingPic.set(true);

        this.api.post<any>('common', API_ENDPOINTS.CUSTOMER.USER.REMOVE_PROFILE_PIC, { user_code: u.code })
          .pipe(finalize(() => this.isUploadingPic.set(false)))
          .subscribe({
            next: () => {
              this.message.success('Profile picture removed.');
              this.clientUserService.loadUser(true).subscribe({
                next: (updatedUser) => {
                  if (updatedUser) {
                    this.user.set(updatedUser);
                    this.patchFormValues(updatedUser);
                    this.cdr.detectChanges();
                  }
                }
              });
            },
            error: (error) => {
              console.error(error);
              this.message.error(error?.error?.message || 'Failed to remove profile picture.');
            },
          });
      },
    });
  }

  // Email verification modal properties & handlers
  isOtpModalVisible = false;
  isSendingOtp = false;
  isVerifyingOtp = false;
  otpCode = '';

  openVerificationModal(): void {
    const u = this.user();
    if (!u) {
      this.message.error('User session not found.');
      return;
    }

    this.isOtpModalVisible = true;
    this.otpCode = '';
    this.sendOtp();
  }

  sendOtp(): void {
    const u = this.user();
    if (!u) return;

    this.isSendingOtp = true;
    this.clientUserService.sendEmailVerification(u.email)
      .pipe(finalize(() => this.isSendingOtp = false))
      .subscribe({
        next: (res) => {
          this.message.success('Verification OTP sent to your email address.');
        },
        error: (err) => {
          console.error(err);
          this.message.error(err?.error?.message || 'Failed to send verification OTP.');
        }
      });
  }

  closeOtpModal(): void {
    this.isOtpModalVisible = false;
    this.otpCode = '';
  }

  submitOtp(): void {
    const u = this.user();
    if (!u || this.otpCode.length !== 6) return;

    this.isVerifyingOtp = true;
    this.clientUserService.verifyEmail(u.code, this.otpCode)
      .pipe(finalize(() => this.isVerifyingOtp = false))
      .subscribe({
        next: (res) => {
          this.message.success('Email verified successfully! 🎉');
          this.isOtpModalVisible = false;
          this.loadUserProfile();
        },
        error: (err) => {
          console.error(err);
          this.message.error(err?.error?.message || 'Invalid OTP code. Please try again.');
          this.isOtpModalVisible = false;
        }
      });
  }
}

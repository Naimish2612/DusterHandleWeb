import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { ProfileUpdatePayload, UserProfile } from '../models/user.common.model';
import { CommonModule } from '@angular/common';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { ChangePassword } from '../../../shared/ui/change-password/change-password';
import { UserService } from '../services/user.service';
import { finalize } from 'rxjs/operators';
 
@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzAvatarModule,
    NzTagModule,
    NzTabsModule,
    NzSelectModule,
    NzDatePickerModule,
    NzDividerModule,
    NzBadgeModule,
    NzSkeletonModule,
    NzUploadModule,
    NzModalModule,
    ChangePassword
  ],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.scss',
})
export class MyProfile implements OnInit {
  private fb = inject(FormBuilder);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);
  private cdr = inject(ChangeDetectorRef);
  private userService = inject(UserService);

  // Local signals
  isSaving = signal(false);
  isUploadingPic = signal(false);
  activeTab = 0;

  // Service signals (computed from service state)
  isLoading = this.userService.isLoading;
  profile = this.userService.profile;

  phonePrefixes = ['+91', '+1', '+44', '+61', '+971', '+65'];
  genderOptions = [
    { label: 'FEMALE', value: 'FEMALE' },
    { label: 'MALE', value: 'MALE' },
    { label: 'OTHERS', value: 'OTHERS' },
    { label: 'PREFER NOT TO SAY', value: 'PREFER NOT TO SAY' },
  ];

  profileForm: FormGroup = this.fb.group({
    full_name: [null, [Validators.required, Validators.minLength(2)]],
    email_id: [{ value: null, disabled: true }, [Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
    phone_code: ['+91'],
    mobile_no: [null, [Validators.required, Validators.pattern(/^\d{10,12}$/)]],
    gender: [null],
    birthdate: [null],
  });

  // Getter methods for template
  get userInitials(): string {
    return this.userService.userInitials();
  }

  get memberSince(): string {
    return this.userService.memberSince();
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  /**
   * Load user profile from API
   */
  loadUserProfile(): void {
    this.userService.getUserProfile().subscribe({
      next: (response) => {
        const p = this.profile();
        if (p) {
          this.patchFormValues(p);
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error loading profile:', error);

        if (error?.error?.message === 'User not found' || error.status === 500) {
          this.message.error('Session expired. Please login again.');
          localStorage.removeItem('ATOKEN');
        } else {
          this.message.error('Failed to load profile. Please try again.');
        }
      },
    });
  }

  /**
   * Patch form with user profile data
   */
  private patchFormValues(profile: UserProfile): void {
    this.profileForm.patchValue({
      full_name: profile.full_name,
      email_id: profile.email_id,
      phone_code: profile.phone_code,
      mobile_no: profile.mobile_no,
      gender: profile.gender,
      birthdate: profile.birthdate ? new Date(profile.birthdate) : null,
    });
  }

  /**
   * Save profile changes
   */
  saveProfile(): void {
    // Validate form
    if (this.profileForm.invalid) {
      Object.values(this.profileForm.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      this.message.warning('Please fill all required fields correctly.');
      return;
    }

    const formValue = this.profileForm.getRawValue();
    const currentProfile = this.userService.profile();

    if (!currentProfile?.user_code) {
      this.message.error('User profile not found. Please refresh and try again.');
      return;
    }

    this.isSaving.set(true);

    const payload: ProfileUpdatePayload = {
      user_code: currentProfile.user_code,
      user_name: currentProfile.user_name,
      email_id: currentProfile.email_id,
      full_name: formValue.full_name,
      mobile_no: formValue.mobile_no,
      phone_code: formValue.phone_code,
      gender: formValue.gender,
      birthdate: formValue.birthdate ? new Date(formValue.birthdate).toISOString().split('T')[0] : null,
    };

    // Call API
    this.userService
      .updateUserProfile(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (response) => {
          this.message.success('Profile updated successfully! ✅');

          setTimeout(() => {
            this.loadUserProfile();
          }, 200);

        },
        error: (error) => {
          console.error('Error updating profile:', error);

          // Handle specific error messages
          if (error.status === 401) {
            this.message.error('Session expired. Please login again.');
          } else if (error.status === 400) {
            this.message.error(error.error?.message || 'Invalid data. Please check your inputs.');
          } else if (error.status === 422) {
            this.message.error('Validation failed. Please check your inputs.');
          } else {
            this.message.error('Failed to update profile. Please try again.');
          }
        },
      });
  }

  /**
   * Handle profile picture file selection
   */
  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    // Validate file size (5MB)
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

    // Reset input so same file can be re-selected
    input.value = '';
  }

  /**
   * Upload profile picture to API
   */
  private uploadProfilePic(file: File): void {
    this.isUploadingPic.set(true);

    this.userService
      .uploadProfilePic(file)
      .pipe(finalize(() => this.isUploadingPic.set(false)))
      .subscribe({
        next: (response: any) => {
          this.message.success('Profile picture updated successfully! 📷');
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Upload error:', error);
          this.message.error(
            error.error?.message || 'Failed to upload profile picture'
          );
        },
      });
  }

  /**
   * Remove profile picture (with confirmation)
   */
  removeProfilePic(): void {
    this.modal.confirm({
      nzTitle: 'Remove Profile Picture?',
      nzContent: 'Are you sure you want to remove your profile picture?',
      nzOkText: 'Remove',
      nzOkDanger: true,
      nzCancelText: 'Cancel',
      nzOnOk: () => {
        this.isUploadingPic.set(true);

        this.userService
          .removeProfilePic()
          .pipe(finalize(() => this.isUploadingPic.set(false)))
          .subscribe({
            next: () => {
              this.message.success('Profile picture removed');
              this.cdr.detectChanges();
            },
            error: (error) => {
              this.message.error(
                error.error?.message || 'Failed to remove profile picture'
              );
            },
          });
      },
    });
  }

  /**
   * Handle password change event
   */
  onPasswordChanged(): void {
    this.activeTab = 0;
    this.message.success('Password changed! Please log in again with your new password.');

    // Optionally redirect to login or logout user
    // setTimeout(() => {
    //   this.authService.logout();
    //   this.router.navigate(['/login']);
    // }, 2000);
  }

  /**
   * Refresh profile data
   */
  refreshProfile(): void {
    this.userService.clearError();
    this.loadUserProfile();
  }
}
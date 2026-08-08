import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormControlDirective,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { CommonModule, DatePipe } from '@angular/common';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { PermissionService } from '../../../../core/infrastructure/permission.service';

interface UserPayload {
  user_code?: number;
  user_name: string;
  mobile_no: string;
  email_id: string;
  password?: string;
  user_type: string;
  gender?: string;
  birthdate?: string;
  user_roles?: number[];
}

@Component({
  selector: 'app-adduser',
  imports: [
    NzCardModule,
    FormsModule,
    ReactiveFormsModule,
    NzFormModule,
    NzIconModule,
    NzTypographyModule,
    NzButtonModule,
    NzSelectModule,
    NzInputModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCheckboxModule,
    NzIconModule,
    NzDividerModule,
    NzSpinModule,
    NzDatePickerModule,
  ],
  templateUrl: './adduser.html',
  styleUrl: './adduser.scss',
})
export class Adduser implements OnInit {
  fb = inject(FormBuilder);
  form!: FormGroup;
  api = inject(ApiCallService);
  router = inject(Router);
  editUser = false;
  loader = inject(LoadingService);
  message = inject(NzMessageService);
  cdr = inject(ChangeDetectorRef);
  permission = inject(PermissionService)
  _id = 0;
  ngOnInit(): void {
    this.initForm();
    const editData = history.state.data;
    if (editData) {
      this.loader.showGlobal('Loading User Data..');
      this._id = history.state.data.user_code;
      this.editUser = true;
      setTimeout(() => {
        this.fillFormForEdit(editData);
      }, 100)
    }
    this.roleDropdown();
  }
  // age validation for future enhancement
  // eighteenYearsAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 18));

  // disabledDate = (current: Date): boolean => {
  //   return current > this.eighteenYearsAgo;
  // };

  initForm(): void {
    if (!this.editUser) {
      this.form = this.fb.group({
        user_name: ['', [Validators.required, Validators.minLength(3)]],
        mobile_no: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
        email_id: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
        password: [''],
        user_type: ['', [Validators.required]],
        gender: [''],
        birthdate: [''],
        user_roles: [[],  [Validators.required]], 
      });
    } else {
      this.form = this.fb.group({
        user_name: ['', [Validators.required, Validators.minLength(3)]],
        mobile_no: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
        email_id: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(5)]],
        user_type: ['', [Validators.required]],
        gender: [''],
        birthdate: [''],
        user_roles: [[], [Validators.required]], 
      });
    }
  }
  fillFormForEdit(data: UserPayload) {
    let formattedBirthdate: string | undefined = undefined;
    if (data.birthdate) {
      const d = new Date(data.birthdate);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        formattedBirthdate = `${year}-${month}-${day}`;
      }
    }

     const rolesArray = Array.isArray(data.user_roles) 
    ? data.user_roles.map(role => Number(role)) 
    : [];

    this.form.patchValue({
      user_name: data.user_name,
      mobile_no: data.mobile_no,
      email_id: data.email_id,
      user_type: data.user_type,
      gender: data.gender,
      birthdate: formattedBirthdate,
      user_roles: rolesArray,
    });
    this.loader.hideGlobal();
    this.form.get('user_name')?.disable();
    this.cdr.detectChanges();
  }
  reset() {
    this.form.reset();
  }
  submit() {
    this.loader.showGlobal('Creating User..');
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }
    const raw = this.form.value;
    let formattedBirthdate: string | undefined = undefined;
    if (raw.birthdate) {
      const d = new Date(raw.birthdate);

      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        formattedBirthdate = `${year}-${month}-${day}`;
      }
    }

    const payload: UserPayload = {
      user_name: this.form.value.user_name,
      mobile_no: this.form.value.mobile_no,
      email_id: this.form.value.email_id,
      password: this.form.value.password,
      user_type: this.form.value.user_type,
      birthdate: formattedBirthdate,
      gender: this.form.value.gender,
      user_roles: this.form.value.user_roles,
    };

    this.api.post<any>('common', API_ENDPOINTS.USER_ADMIN.CREATE_USER, payload).subscribe({
      next: () => {
        this.reset();
        this.message.success('User Created Successfully');
        this.loader.hideGlobal();
      },
      error: (err) => {
        this.loader.hideGlobal();
        this.message.error('Error in creating user');
        console.error('Create failed', err);
      },
    });
  }

  update() {
    this.loader.showGlobal('Updating User..');
    const passwordControl = this.form.get('password');
    passwordControl?.clearValidators();
    passwordControl?.setValue(null);

    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const raw = this.form.value;
    let formattedBirthdate: string | undefined = undefined;
    if (raw.birthdate) {
      const d = new Date(raw.birthdate);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        formattedBirthdate = `${year}-${month}-${day}`;
      }
    }

    const payload: UserPayload = {
      user_code: this._id,
      user_name: this.form.value.user_name,
      mobile_no: this.form.value.mobile_no,
      email_id: this.form.value.email_id,
      user_type: this.form.value.user_type,
      birthdate: formattedBirthdate,
      gender: this.form.value.gender,
      user_roles: this.form.value.user_roles,
    };

    this.api.post<any>('common', API_ENDPOINTS.USER_ADMIN.UPDATE_USER, payload).subscribe({
      next: () => {
        this.reset();
        this.message.success('User Updated Successfully');
        this.router.navigate(['admin/user/list']);
        this.loader.hideGlobal();
      },
      error: (err) => {
        this.loader.hideGlobal();
        this.message.error('Error in creating user');
        console.error('Create failed', err);
      },
    });
  }
  goBack() {
    this.router.navigate(['admin/user/list']);
  }
  roleList: any[] = [];
  roleDropdown() {
    this.api.get<any>('common', API_ENDPOINTS.RIGHTS_MASTER.ROLE_LIST).subscribe({
      next: (res) => {
        this.roleList = res.data || [];
      },
      error: (err) => {
        console.error('Error fetching role dropdown data:', err);
      },
    });
  }
  get hasAddPermission(): boolean {
    return this.permission.allowedActions$().has('user_masters');
  }
}

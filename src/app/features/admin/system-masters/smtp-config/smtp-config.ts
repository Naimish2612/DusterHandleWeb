import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, map } from 'rxjs';

import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalModule } from 'ng-zorro-antd/modal';

import { NzMessageService } from 'ng-zorro-antd/message';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';

interface SmtpConfigPayload {
  smtp_config_id?: number;
  config_name: string;
  host: string;
  port: number;
  username?: string;
  password_encrypted?: string;
  from_email: string;
  from_name?: string;
  is_active: boolean;
  is_default: boolean;
  smtp_category: string;
}

@Component({
  selector: 'app-smtp-config',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzGridModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzButtonModule,
    NzCardModule,
    NzSwitchModule,
    NzDividerModule,
    NzTagModule,
    NzTableModule,
    NzIconModule,
    NzModalModule,
    UiGridComponent,
  ],
  templateUrl: './smtp-config.html',
  styleUrl: './smtp-config.scss',
})
export class SmtpConfig implements OnInit {
  private permission = inject(PermissionService);
  private fb = inject(FormBuilder);
  private api = inject(ApiCallService);
  private loader = inject(LoadingService);
  private message = inject(NzMessageService);

  form!: FormGroup;
  showUpdateButton: boolean = false;
  smtpConfigGridReload$ = new Subject<void>();
  showAddButton: boolean = true;
  selectedData: any;
  stmpCategory = [
    { label: 'MARKETING', value: 'MARKETING' },
    { label: 'PROMOTION', value: 'PROMOTION' },
    { label: 'WELCOME', value: 'WELCOME' },
  ];

  private selectedId: number | null = null;

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.form = this.fb.group({
      config_name: ['', [Validators.required, Validators.minLength(3)]],
      host: ['', [Validators.required, Validators.minLength(3)]],
      port: [null, [Validators.required, Validators.min(1)]],
      username: ['', [Validators.required]],
      password_encrypted: ['', [Validators.required]],
      from_email: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
        ],
      ],
      from_name: ['', [Validators.required]],
      is_active: [true, [Validators.required]],
      is_default: [false, [Validators.required]],
      smtp_category:[null, [Validators.required]]
    });
  }

  get hasAddPermission(): boolean {
    return this.permission.allowedActions$().has('add_smtp_configuration');
  }

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('update_smtp_configuration');
  }

  get hasViewPermission(): boolean {
    return this.permission.allowedActions$().has('view_smtp_configuration');
  }

  submit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    this.loader.showGlobal('Saving SMTP Configuration...');

    const payload: SmtpConfigPayload = {
      config_name: this.form.value.config_name,
      host: this.form.value.host,
      port: Number(this.form.value.port),
      username: this.form.value.username,
      password_encrypted: this.form.value.password_encrypted,
      from_email: this.form.value.from_email,
      from_name: this.form.value.from_name,
      is_active: !!this.form.value.is_active,
      is_default: !!this.form.value.is_default,
      smtp_category: this.form.value.smtp_category
    };

    this.api.post<any>('common', API_ENDPOINTS.SMTP_CONFIG.CREATE, payload).subscribe({
      next: (res) => {
        this.reset();
        this.smtpConfigGridReload$.next();
        this.message.success('SMTP Configuration saved successfully');
        this.loader.hideGlobal();
      },
      error: (err) => {
        console.error('Create failed', err);
        this.message.error('Failed to save SMTP Configuration');
        this.loader.hideGlobal();
      },
    });
  }

  smtpConfigUpdate(): void {
    if (this.form.invalid || this.selectedId === null) return;

    this.loader.showGlobal('Updating SMTP Configuration...');

    const payload: SmtpConfigPayload = {
      smtp_config_id: this.selectedId,
      config_name: this.form.value.config_name,
      host: this.form.value.host,
      port: Number(this.form.value.port),
      username: this.form.value.username,
      password_encrypted: this.form.value.password_encrypted,
      from_email: this.form.value.from_email,
      from_name: this.form.value.from_name,
      is_active: !!this.form.value.is_active,
      is_default: !!this.form.value.is_default,
      smtp_category: this.form.value.smtp_category
    };

    this.api.post<any>('common', API_ENDPOINTS.SMTP_CONFIG.UPDATE, payload).subscribe({
      next: (res) => {
        this.reset();
        this.smtpConfigGridReload$.next();
        this.message.success('SMTP Configuration updated successfully');
        this.loader.hideGlobal();
      },
      error: (err) => {
        console.error('Update failed', err);
        this.message.error('Failed to update SMTP Configuration');
        this.loader.hideGlobal();
      },
    });
  }

  reset(): void {
    this.form.reset({
      is_active: true,
      is_default: false,
    });
    this.showUpdateButton = false;
    this.showAddButton = true;
    this.selectedId = null;
  }

  selectionChanged($event: any[]): void {
    this.selectedData = JSON.stringify($event);
  }

  onAction($event: { actionKey: string; row: any }): void {
    const { actionKey, row } = $event;

    if (actionKey === 'edit') {
      this.selectedId = row.smtp_config_id;
      this.form.patchValue({
        config_name: row.config_name,
        host: row.host,
        port: row.port,
        username: row.username,
        password_encrypted: row.password_encrypted,
        from_email: row.from_email,
        from_name: row.from_name,
        is_active: row.is_active,
        is_default: row.is_default,
        smtp_category: row.smtp_category
      });
      this.showUpdateButton = true;
      this.showAddButton = false;
    }
  }

  smtpConfigGridDataSource = {
    load: () =>
      this.api
        .get<any>('common', API_ENDPOINTS.SMTP_CONFIG.LIST)
        .pipe(map((res) => res.data ?? [])),
  };
   addItem(inputBtn: HTMLInputElement): void {
    const value = inputBtn.value.trim().toUpperCase();
    
    // Prevent adding empty values
    if (!value) {
      return;
    }

    // Prevent duplicates
    const exists = this.stmpCategory.some(item => item.value === value);
    
    if (!exists) {
      // Add to dropdown list
      this.stmpCategory = [...this.stmpCategory, { label: value, value: value }];
    }

    // Automatically select the newly created item in your reactive form
    this.form.get('smtp_category')?.setValue(value);
    
    // Clear input field for next use
    inputBtn.value = '';
  }

}

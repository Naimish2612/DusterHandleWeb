import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
import { ApiCallService } from '../../../../../core/infrastructure/api-call.service';
import { PermissionService } from '../../../../../core/infrastructure/permission.service';
import { LoadingService } from '../../../../../core/infrastructure/loading.service';
import { API_ENDPOINTS } from '../../../../../core/global-api-endpoints/api-endpoints';


@Component({
  selector: 'app-add-template',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzCardModule,
    NzFormModule,
    NzGridModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzSwitchModule,
    NzSelectModule,
    AngularEditorModule,
  ],
  templateUrl: './add-template.html',
  styleUrl: './add-template.scss',
})
export class AddTemplate implements OnInit {
  form!: FormGroup;
  api = inject(ApiCallService);
  fb = inject(FormBuilder);
  editTemplate = false;
  permission = inject(PermissionService);
  loader = inject(LoadingService);
  message = inject(NzMessageService);
  router = inject(Router);

  commonPlaceholders = ['order_no', 'user_name', 'first_name', 'email_id', 'mobile_no'];
  smtpCategories: any[] = [];
  smtpEmails: any[] = [];
  isRestoring = false;

  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: '350px',
    minHeight: '200px',
    maxHeight: 'auto',
    width: 'auto',
    minWidth: '0',
    translate: 'no',
    enableToolbar: true,
    showToolbar: true,
    placeholder: 'Enter template body HTML here...',
    defaultParagraphSeparator: 'p',
    defaultFontName: 'Arial',
    defaultFontSize: '3',
    sanitize: false,
    toolbarPosition: 'top',
  };

  ngOnInit(): void {
    this.initForm();
    this.loadSmtpCategories();
    const editData = history.state.data;
    if (editData) {
      this.editTemplate = true;
      this.fillFormForEdit(editData);
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      template_id: [0],
      event_code: ['', [Validators.required]],
      subject_template: ['', [Validators.required]],
      body_html: ['', [Validators.required]],
      required_template_fields_obj: [[], [Validators.required]],
      is_active: [true, [Validators.required]],
      smtp_category: [null],
      smtp_config_id: [null],
    });
  }

  formatEventCode(): void {
    const control = this.form.get('event_code');
    if (control && control.value) {
      const formatted = control.value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
      control.setValue(formatted);
    }
  }

  fillFormForEdit(data: any): void {
  let fieldsArray: string[] = [];
  if (data.required_template_fields) {
    try {
      fieldsArray = typeof data.required_template_fields === 'string'
        ? JSON.parse(data.required_template_fields)
        : data.required_template_fields;
    } catch (e) {
      console.error('Failed to parse required_template_fields', e);
    }
  }

  this.isRestoring = true;

  const basePatch = {
    template_id: data.template_id,
    event_code: data.event_code,
    subject_template: data.subject_template,
    body_html: data.body_html,
    required_template_fields_obj: fieldsArray,
    is_active: data.is_active,
    smtp_category: data.smtp_category // Ensure category control gets updated too
  };

  if (data.smtp_category) {
    this.loadSmtpEmails(data.smtp_category, () => {
      this.form.patchValue({
        ...basePatch,
        smtp_config_id: data.smtp_config_id,
      });
      setTimeout(() => this.isRestoring = false, 100); // Small delay to let bindings settle
    });
  } else {
    this.form.patchValue({
      ...basePatch,
      smtp_config_id: null
    });
    this.isRestoring = false;
  }
}


  loadSmtpCategories(): void {
    this.api.get<any>('common', API_ENDPOINTS.SMTP_CONFIG.DROPDOWN_CATEGORY).subscribe({
      next: (res) => {
        this.smtpCategories = res.data ?? [];
      },
      error: (err) => {
        console.error('Failed to load SMTP categories', err);
      }
    });
  }

  onSmtpCategoryChange(category: string): void {
    if (this.isRestoring) {
      return;
    }
    this.form.get('smtp_config_id')?.setValue(null);
    this.smtpEmails = [];
    if (category) {
      this.loadSmtpEmails(category);
    }
  }

  loadSmtpEmails(category: string, callback?: () => void): void {
    this.api.get<any>('common', `${API_ENDPOINTS.SMTP_CONFIG.DROPDOWN_EMAIL}/${category}`).subscribe({
      next: (res) => {
        this.smtpEmails = res.data ?? [];
        if (callback) {
          callback();
        }
      },
      error: (err) => {
        console.error('Failed to load SMTP emails', err);
      }
    });
  }

  get hasAddPermission(): boolean {
    return this.permission.allowedActions$().has('add_template');
  }

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('update_template');
  }

  reset(): void {
    const editData = history.state.data;
    if (editData) {
      this.fillFormForEdit(editData);
    } else {
      this.form.reset({
        template_id: 0,
        event_code: '',
        subject_template: '',
        body_html: '',
        required_template_fields_obj: [],
        is_active: true,
        smtp_config_id: null,
      });
      this.smtpEmails = [];
    }
  }

  submit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    this.loader.showGlobal('Creating Template...');
    const rawValue = this.form.value;
    const payload = {
      ...rawValue,
      required_template_fields: rawValue.required_template_fields_obj && rawValue.required_template_fields_obj.length > 0
        ? JSON.stringify(rawValue.required_template_fields_obj)
        : null
    };

    this.api.post<any>('common', API_ENDPOINTS.TEMPLATE.CREATE, payload).subscribe({
      next: () => {
        this.reset();
        this.message.success('Template created successfully');
        this.loader.hideGlobal();
        this.router.navigate(['admin/template/list']);
      },
      error: (err) => {
        console.error('Create failed', err);
        this.message.error('Failed to create template');
        this.loader.hideGlobal();
      },
    });
  }

  update(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    this.loader.showGlobal('Updating Template...');
    const rawValue = this.form.value;
    const payload = {
      ...rawValue,
      required_template_fields: rawValue.required_template_fields_obj && rawValue.required_template_fields_obj.length > 0
        ? JSON.stringify(rawValue.required_template_fields_obj)
        : null
    };

    this.api.post<any>('common', API_ENDPOINTS.TEMPLATE.UPDATE, payload).subscribe({
      next: () => {
        this.reset();
        this.message.success('Template updated successfully');
        this.loader.hideGlobal();
        this.router.navigate(['admin/template/list']);
      },
      error: (err) => {
        console.error('Update failed', err);
        this.message.error('Failed to update template');
        this.loader.hideGlobal();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['admin/template/list']);
  }
}

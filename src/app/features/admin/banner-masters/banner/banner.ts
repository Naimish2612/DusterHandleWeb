import { Component, inject, OnInit } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzSelectModule } from 'ng-zorro-antd/select';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { INDIAN_STATES } from '../../../customer/models/address-book.model';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { of, Subject } from 'rxjs';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router } from '@angular/router';
import { differenceInCalendarDays } from 'date-fns';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';

export interface Banner {
  banner_title: string;
  description: string;
  redirect_url: string;
  platform: 'Both' | 'Web' | 'App';
  state_id: number;
  start_date: string; // ISO string format 'YYYY-MM-DD'
  end_date: string; // ISO string format 'YYYY-MM-DD'
  is_active: boolean;
  is_default: boolean;
  display_order: number;
}

@Component({
  selector: 'app-banner',
  imports: [
    FormsModule,
    NzIconModule,
    NzCardModule,
    NzFormModule,
    NzDatePickerModule,
    NzInputNumberModule,
    NzSwitchModule,
    NzSelectModule,
    CommonModule,
    ReactiveFormsModule,
    NzGridModule,
    NzInputModule,
    NzButtonModule,
    NzDividerModule,
    NzTagModule,
    NzTableModule,
    NzIconModule,
    UiGridComponent,
    NzModalModule,
  ],
  templateUrl: './banner.html',
  styleUrl: './banner.scss',
})
export class Banner implements OnInit {
  form!: FormGroup;
  api = inject(ApiCallService);
  fb = inject(FormBuilder);
  editBanner = false;
  indianStates = INDIAN_STATES;
  imageList: any[] = [];
  imageReload$ = new Subject<void>();
  imageGridDataSource = {
    load: () => of(this.imageList),
  };
  private nzModalService = inject(NzModalService)
  isImagePreviewVisible = false;
  previewImageUrl = '';
  previewImageName = '';
  permission = inject(PermissionService);
  loader = inject(LoadingService);
  message = inject(NzMessageService);
  router = inject(Router);

  private readonly MAX_FILE_SIZE_MB = 1;

  reset() {
    this.form.reset({
      state_id: 0,
      is_active: true,
      platform: 'Both',
      display_order: 1,
    });
    this.imageList = [];
  }
  submit() {
    this.loader.showGlobal("Creating Banner...");
    const payload: FormData = this.buildPayload();
    this.api.post<any>('common', API_ENDPOINTS.BANNER.CREATE_BANNER, payload).subscribe({
      next: () => {
        this.reset();
        this.message.success('Banner created successfully');
        this.loader.hideGlobal();
      },
      error: (err) => {
        console.error('Create failed', err);
        this.loader.hideGlobal();
      },
    });
  }
  update() {
    this.loader.showGlobal("Updating Banner...");
    const payload: FormData = this.buildUpdatePayload();
    this.api.post<any>('common', API_ENDPOINTS.BANNER.UPDATE_BANNER, payload).subscribe({
      next: () => {
        this.reset();
        this.message.success('Banner updated successfully');
        this.router.navigate(['admin/banner/list']);
        this.loader.hideGlobal();
      },
      error: (err) => {
        console.error('Update failed', err);
        this.loader.hideGlobal();
      },
    });
  }

  ngOnInit(): void {
    this.initForm();
    const editData = history.state.data;
    if (editData) {
      this.editBanner = true;
      this.fillFormForEdit(editData);
    }
  }
  // disabledStartDate = (startValue: Date): boolean => {
  //   if (!startValue || !this.form.value.end_date) {
  //     return false;
  //   }
  //   return differenceInCalendarDays(startValue, this.form.value.end_date) > 0;
  // };

  // disabledEndDate = (endValue: Date): boolean => {
  //   if (!endValue || !this.form.value.start_date) {
  //     return false;
  //   }
  //   return differenceInCalendarDays(endValue, this.form.value.start_date) < 0;
  // };

  dateOrderValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const start = control.get('start_date')?.value;
    const end = control.get('end_date')?.value;
    const endDateControl = control.get('end_date');
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (startDate.getTime() >= endDate.getTime()) {
        const errors = endDateControl?.errors || {};
        endDateControl?.setErrors({ ...errors, dateOrder: true });
        return { dateOrder: true };
      } else {
        if (endDateControl?.errors) {
          const errors = { ...endDateControl.errors };
          delete errors['dateOrder'];
          endDateControl.setErrors(Object.keys(errors).length ? errors : null);
        }
      }
    }
    return null;
  };

  get hasAddPermission(): boolean {
    return this.permission.allowedActions$().has('add_banner');
  }

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('edit_banner');
  }
  urlRegex = /^https:\/\/www\.[a-zA-Z0-9-]+\.[a-z]{2,}(\/)?$/;
  initForm(): void {
    this.form = this.fb.group({
      banner_title: ['', [Validators.required]],
      description: ['', [Validators.required]],
      redirect_url: ['', [Validators.required, Validators.pattern(this.urlRegex)]],
      platform: ['Both', [Validators.required]],
      state_id: [0, [Validators.required]],
      start_date: [null, [Validators.required]],
      end_date: [null, [Validators.required]],
      is_active: [true],
      is_default: [true],
      display_order: [1, [Validators.required, Validators.min(1)]],
    }, { validators: [this.dateOrderValidator] });
  }
  fillFormForEdit(data: any): void {
    this.form.patchValue({
      banner_title: data.banner_title,
      description: data.description,
      redirect_url: data.redirect_url,
      platform: data.platform,
      state_id: data.state_id,
      start_date: data.start_date ? new Date(data.start_date) : null,
      end_date: data.end_date ? new Date(data.end_date) : null,
      is_active: data.is_active,
      is_default: data.is_default,
      display_order: data.display_order,
    });

    if (data.banner_url) {
      this.imageList = [
        {
          id: 1,
          uid: this.generateUid(),
          name: 'current_banner.jpg',
          preview: data.banner_url,
          size: 'N/A',
        },
      ];
      this.imageReload$.next();
    }
  }
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    if (input.files.length > 1) {
      this.message.info('Please select only one image');
      return;
    }

    const file = input.files[0]; // Take only the first file

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      this.message.error(`Invalid file type: ${file.name}`);
      return;
    }

    if (file.size > this.MAX_FILE_SIZE_MB * 1024 * 1024) {
      this.message.error(`File too large: (max ${this.MAX_FILE_SIZE_MB}MB)`);
      return;
    }

    this.loader.showGlobal('Processing image...');
    const reader = new FileReader();

    reader.onload = (e: any) => {
      this.imageList = [
        {
          id: 1,
          uid: this.generateUid(),
          name: file.name,
          size: this.formatFileSize(file.size),
          file: file,
          preview: e.target?.result,
        },
      ];
      this.imageReload$.next();
      this.loader.hideGlobal();
    };

    reader.readAsDataURL(file);
    input.value = '';
  }
  private formatDateString(dateInput: any): string | null {
    if (!dateInput) return null;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
  private buildPayload(): FormData {
    const formData = new FormData();
    const rawData = {
      banner_title: this.form.value.banner_title,
      description: this.form.value.description,
      redirect_url: this.form.value.redirect_url,
      platform: this.form.value.platform,
      state_id: this.form.value.state_id,
      start_date: this.formatDateString(this.form.value.start_date),
      end_date: this.formatDateString(this.form.value.end_date),
      is_active: this.form.value.is_active,
      is_default: this.form.value.is_default,
      display_order: this.form.value.display_order,
    };

    formData.append('data', JSON.stringify(rawData));

    // Append the uploaded image file binary if present
    if (this.imageList.length > 0 && this.imageList[0].file) {
      formData.append('file', this.imageList[0].file);
    }

    return formData;
  }

  private buildUpdatePayload(): FormData {
    const formData = this.buildPayload();
    const data = JSON.parse(formData.get('data') as string);
    data.banner_id = history.state.data.banner_id;
    formData.set('data', JSON.stringify(data));

    return formData;
  }

  onImageAction($event: any) {
    if ($event.actionKey === 'view') {
      this.previewImageUrl = $event.row.preview;
      this.previewImageName = $event.row.name;
      this.isImagePreviewVisible = true;
    } else if ($event.actionKey === 'delete') {
       this.nzModalService.confirm({
      nzTitle: 'Are you sure you want to delete this image?',
      nzOkText: 'Yes',
      nzCancelText: 'No',
      nzOkDanger: true,
      nzOnOk: () => {
        this.imageList = [];
        this.imageReload$.next();
      }
    });
    }
  }

  goBack() {
    this.router.navigate(['admin/banner/list']);
  }
  closeImagePreview() {
    this.isImagePreviewVisible = false;
  }
  private generateUid() {
    return `img_${Date.now()}`;
  }
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

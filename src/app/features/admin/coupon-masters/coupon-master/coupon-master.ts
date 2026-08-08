import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  Form,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router } from '@angular/router';

interface CouponPayload {
  coupon_id?: number;
  coupon_category_id: number;
  coupon_name: string;
  coupon_code: string;
  coupon_description: string;
  discount_type: string;
  discount_value: string;
  start_date: string;
  end_date: string;
  multiple_time_use: boolean;
  max_usages_total: number;
  max_usages_per_user: number;
  minimum_order_amount: number;
  max_discount_amount: number;
  is_active: boolean;
  is_deleted: boolean;
}

@Component({
  selector: 'app-coupon-master',
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
    NzInputNumberModule,
    NzDatePickerModule,
  ],
  templateUrl: './coupon-master.html',
  styleUrl: './coupon-master.scss',
})
export class CouponMaster implements OnInit {
  form!: FormGroup;
  fb = inject(FormBuilder);
  showAddButton: boolean = true;
  showEditButton: boolean = false;
  permission = inject(PermissionService);
  loader = inject(LoadingService);
  message = inject(NzMessageService);
  api = inject(ApiCallService);
  router = inject(Router);
  editCoupon = false;
  isGeneratingCode = false;
  pastDate!: CouponPayload;
  couponCategoryList: any[] = [];

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

  private formatDateTime(value: any): string {
    if (!value) {
      return '';
    }
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      const hours = String(value.getHours()).padStart(2, '0');
      const minutes = String(value.getMinutes()).padStart(2, '0');
      const seconds = String(value.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    return value;
  }
  get hasAddPermission(): boolean {
    return this.permission.allowedActions$().has('coupon_category_create');
  }

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('coupon_category_update');
  }
  ngOnInit(): void {
    this.initForm();
    this.categoryDropdown();
    const editData = history.state.data;
    this.pastDate = editData
    if (editData) {
      this.editCoupon = true;
      this.showEditButton = true;
      this.showAddButton = false;
      setTimeout(() => {
        this.fillFormForEdit(editData);
      }, 500);
    }
    this.form.get('discount_value')?.valueChanges.subscribe((value) => {
      this.discountValueChangeHandler(value);
    });
    // this.form.get('max_discount_amount')?.valueChanges.subscribe((value) => {
    //   this.maxOrder(value);
    // });
  }
  goBack() {
    this.router.navigate(['admin/coupon/list']);
  }

  id = 0;
  fillFormForEdit(data: CouponPayload) {
    this.id = data.coupon_id!;
    this.form.patchValue({
      coupon_category_id: data.coupon_category_id,
      coupon_name: data.coupon_name,
      coupon_code: data.coupon_code,
      coupon_description: data.coupon_description,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      start_date: data.start_date ? new Date(data.start_date) : null,
      end_date: data.end_date ? new Date(data.end_date) : null,
      multiple_time_use: data.multiple_time_use,
      max_usages_total: data.max_usages_total,
      max_usages_per_user: data.max_usages_per_user,
      minimum_order_amount: data.minimum_order_amount,
      max_discount_amount: data.max_discount_amount,
      is_active: data.is_active,
      is_deleted: data.is_deleted,
    });
  this.form.get('coupon_code')?.disable();
  }

  categoryDropdown() {
    this.api.get<any>('common', API_ENDPOINTS.COUPON_MASTER.COUPON_CATEGORY_DROPDOWN).subscribe({
      next: (res) => {
        this.couponCategoryList = res.data || [];
      },
    });
  }
  initForm() {
    this.form = this.fb.group({
      coupon_category_id: [null, [Validators.required]],
      coupon_name: [null, [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      coupon_code: [
        null,
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(10),
          Validators.pattern(/^[A-Z0-9]+$/),
        ],
      ],
      coupon_description: [null, [Validators.required]],
      discount_type: [null, [Validators.required]],
      discount_value: [null, [Validators.required]],
      start_date: [null, [Validators.required]],
      end_date: [null, [Validators.required]],
      multiple_time_use: [false, [Validators.required]],
      max_usages_total: [null],
      max_usages_per_user: [null],
      minimum_order_amount: [null, [Validators.required]],
      max_discount_amount: [null, [Validators.required]],
      is_active: [true, [Validators.required]],
      is_deleted: [false, [Validators.required]],
    }, { validators: [this.dateOrderValidator] });
  }
  discountTypeSelection() {
    this.form.get('max_discount_amount')?.reset();
    this.form.get('minimum_order_amount')?.reset();
    this.form.get('discount_value')?.reset();
    const discountType = this.form.get('discount_type')?.value;
    if (discountType === 'Percentage') {
      this.form
        .get('discount_value')
        ?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
      this.form.get('max_discount_amount')?.enable();
    } else {
      this.form.get('discount_value')?.setValidators([Validators.required, Validators.min(0)]);
      this.form.get('max_discount_amount')?.disable();
    }
  }

  discountValueChangeHandler(value: any): void {
    const formValues = this.form.getRawValue();
    const discountType = formValues.discount_type;
    const currentDiscount = Number(formValues.discount_value);

    if (discountType === 'Value') {
      this.form.get('max_discount_amount')?.setValue(currentDiscount);
    }
  }

  maxOrder(value: any) {
    const formValues = this.form.getRawValue();
    const discountType = formValues.discount_type;
    const currentDiscount = Number(formValues.discount_value);
    const minOrder = Number(formValues.minimum_order_amount);
    const maxOrder = Number(formValues.max_discount_amount);
    const minVal = minOrder * (currentDiscount / 100);
    if (minVal < maxOrder && discountType === 'Percentage') {
      this.message.warning(
        'Warning: Minimum order amount should be greater than the discount value.',
      );
      this.form.get('max_discount_amount')?.reset(0);
      return;
    }
  }
  generateCouponCode() {
    if (this.editCoupon) {
      return;
    }
    this.isGeneratingCode = true;
    this.loader.showGlobal("Generating Coupon..")
    this.api.get<any>('common', API_ENDPOINTS.COUPON_MASTER.GENERATE_COUPON_CODE).subscribe({
      next: (res) => {
        this.form.patchValue({ coupon_code: res.data.coupon_code });
        this.loader.hideGlobal();
        this.isGeneratingCode = false;
      },
      error: (err) => {
        this.loader.hideGlobal();
        this.isGeneratingCode = false;
        console.error('Code Generation failed', err);
      },
    });
  }
  reset() {
    if(this.editCoupon){
      this.fillFormForEdit(this.pastDate)
    }
    else{
      this.form.reset({ is_active: true, is_deleted: false, multiple_time_use: false });
    }
  }
  couponUpdate() {
    const formValues = this.form.getRawValue();
    this.loader.showGlobal('Updating coupon category...');
    if (
      this.form.value.discount_type === 'Value' &&
      this.form.value.minimum_order_amount <= this.form.value.discount_value
    ) {
      this.message.warning(
        'Warning: Minimum order amount should be greater than the discount value.',
      );
      this.loader.hideGlobal();
      return;
    }
    const payload: CouponPayload = {
      coupon_id: this.id,
      coupon_category_id: this.form.value.coupon_category_id,
      coupon_name: this.form.value.coupon_name,
      coupon_code: formValues.coupon_code,
      coupon_description: this.form.value.coupon_description,
      discount_type: this.form.value.discount_type,
      discount_value: this.form.value.discount_value,
      start_date: this.formatDateTime(this.form.value.start_date),
      end_date: this.formatDateTime(this.form.value.end_date),
      multiple_time_use: this.form.value.multiple_time_use,
      max_usages_total: this.form.value.max_usages_total,
      max_usages_per_user: this.form.value.max_usages_per_user,
      minimum_order_amount: this.form.value.minimum_order_amount,
      max_discount_amount: this.form.value.max_discount_amount,
      is_active: this.form.value.is_active,
      is_deleted: this.form.value.is_deleted,
    };

    this.api.post<any>('common', API_ENDPOINTS.COUPON_MASTER.COUPON_UPDATE, payload).subscribe({
      next: () => {
        this.reset();
        this.loader.hideGlobal();
        this.message.success('Coupon updated successfully');
        this.router.navigate(['admin/coupon/list'])
      },
      error: (err) => {
        this.loader.hideGlobal();
        this.message.error('Failed to update coupon');
        console.error('Create failed', err);
      },
    });
  }
  submit() {
    this.loader.showGlobal('Creating coupon...');

    if(this.form.value.max_usages_per_user == null){
      this.form.value.max_usages_per_user = 0;
    }
    if(this.form.value.max_usages_total == null){
      this.form.value.max_usages_total = 0;
    }
    if (
      this.form.value.discount_type === 'Value' &&
      this.form.value.minimum_order_amount <= this.form.value.discount_value
    ) {
      this.message.warning(
        'Warning: Minimum order amount should be greater than the discount value.',
      );
      this.loader.hideGlobal();
      return;
    }
    const payload: CouponPayload = {
      coupon_category_id: this.form.value.coupon_category_id,
      coupon_name: this.form.value.coupon_name,
      coupon_code: this.form.value.coupon_code,
      coupon_description: this.form.value.coupon_description,
      discount_type: this.form.value.discount_type,
      discount_value: this.form.value.discount_value,
      start_date: this.formatDateTime(this.form.value.start_date),
      end_date: this.formatDateTime(this.form.value.end_date),
      multiple_time_use: this.form.value.multiple_time_use,
      max_usages_total: this.form.value.max_usages_total,
      max_usages_per_user: this.form.value.max_usages_per_user,
      minimum_order_amount: this.form.value.minimum_order_amount,
      max_discount_amount: this.form.value.max_discount_amount,
      is_active: this.form.value.is_active,
      is_deleted: this.form.value.is_deleted,
    };

    this.api.post<any>('common', API_ENDPOINTS.COUPON_MASTER.COUPON_CREATE, payload).subscribe({
      next: () => {
        this.reset();
        this.loader.hideGlobal();
        this.message.success('Coupon created successfully');
      },
      error: (err) => {
        this.loader.hideGlobal();
        this.message.error('Failed to create coupon');
        console.error('Create failed', err);
      },
    });
  }
}

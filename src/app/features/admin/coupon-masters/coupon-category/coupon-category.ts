import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { map, Subject } from 'rxjs';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { NzMessageService } from 'ng-zorro-antd/message';
interface CouponCategoryPayload {
  coupon_category_id?: number;
  category_name: string;
  salesperson_id?: number | null;
  is_active: boolean;
  can_be_clubbed: boolean;
}
@Component({
  selector: 'app-coupon-category',
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
    UiGridComponent,
    NzModalModule,
  ],
  templateUrl: './coupon-category.html',
  styleUrl: './coupon-category.scss',
})
export class CouponCategory implements OnInit {
  form!: FormGroup;
  permission = inject(PermissionService);
  couponCategoryGridReload$ = new Subject<void>();
  api = inject(ApiCallService);
  fb = inject(FormBuilder);
  showAddButton: boolean = true;
  showEditButton: boolean = false;
  loader = inject(LoadingService);
  message = inject(NzMessageService);
  nzModalService = inject(NzModalService);
  salespersonList = [
    { id: 1, value: 'john_doe' },
    { id: 2, value: 'jane_smith' },
    { id: 3, value: 'michael_johnson' },
  ];

  couponCategoryGridDataSource = {
    load: () =>
      this.api
        .get<any>('common', API_ENDPOINTS.COUPON_CATEGORY_MASTER.COUPON_CATEGORY_LIST)
        .pipe(map((res) => res.data ?? [])),
  };
  ngOnInit(): void {
    this.initForm();
  }
  initForm(): void {
    this.form = this.fb.group({
      category_name: ['', [Validators.required, Validators.minLength(3)]],
      can_be_clubbed: [false, Validators.required],
      salesperson_id: [null],
      is_active: [true, Validators.required],
    });
  }

  get hasAddPermission(): boolean {
    return this.permission.allowedActions$().has('coupon_category_create');
  }

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('coupon_category_update');
  }
  get hasTogglePermission(): boolean {
    return this.permission.allowedActions$().has('toggle_coupon_category_activation');
  }
  selectedId: number | null = null;
  onAction($event: { actionKey: string; row: any }) {
    const { actionKey, row } = $event;

    this.selectedId = row.coupon_category_id;
    if (actionKey === 'edit') {
      this.form.patchValue({
        coupon_category_id: row.coupon_category_id,
        salesperson_id: row.salesperson_id,
        category_name: row.category_name,
        can_be_clubbed: row.can_be_clubbed,
        is_active: row.is_active,
      });
      this.showAddButton = false;
      this.showEditButton = true;
    }
    if (actionKey === 'toggleActive') {
      this.nzModalService.confirm({
        nzTitle: 'Are you sure you want to toggle the activation status of this coupon category?',
        nzOkText: 'Yes',
        nzCancelText: 'No',
        nzOkDanger: true,
        nzOnOk: () => this.toggleActivation(row)
      });
    }
  }
  reset() {
    this.form.reset({ is_active: true, can_be_clubbed: false, salesperson_id: null });
    this.showAddButton = true;
    this.showEditButton = false;
  }
  toggleActivation(row: any) {
    const updatedStatus = !row.is_active;
    const payload: CouponCategoryPayload = {
      coupon_category_id: this.selectedId!,
      category_name: row.category_name,
      salesperson_id: row.salesperson_id,
      is_active: updatedStatus,
      can_be_clubbed: row.can_be_clubbed,
    };
    this.couponCategoryUpdate(payload);
  }
  couponCategoryUpdate(payload?: CouponCategoryPayload) {
    this.loader.showGlobal('Updating coupon category...');
    if (payload) {
      payload = {
       coupon_category_id: this.selectedId!,
       category_name: payload.category_name,
       salesperson_id: payload.salesperson_id,
       is_active: payload.is_active,
       can_be_clubbed: payload.can_be_clubbed,
     };
    }else{
      payload = {
       coupon_category_id: this.selectedId!,
       category_name: this.form.value.category_name,
       salesperson_id: this.form.value.salesperson_id,
       is_active: this.form.value.is_active,
       can_be_clubbed: this.form.value.can_be_clubbed,
     };
    }

    this.api
      .post<any>('common', API_ENDPOINTS.COUPON_CATEGORY_MASTER.COUPON_CATEGORY_UPDATE, payload)
      .subscribe({
        next: () => {
          this.reset();
          this.couponCategoryGridReload$.next();
          this.message.success('Coupon category updated successfully');
          this.loader.hideGlobal();
        },
        error: (err) => {
          this.loader.hideGlobal();
          this.message.error('Failed to update coupon category');
          console.error('Update failed', err);
        },
      });
  }
  submit() {
    this.loader.showGlobal('Creating coupon category...');
    const payload: CouponCategoryPayload = {
      category_name: this.form.value.category_name,
      salesperson_id: this.form.value.salesperson_id,
      is_active: this.form.value.is_active,
      can_be_clubbed: this.form.value.can_be_clubbed,
    };

    this.api
      .post<any>('common', API_ENDPOINTS.COUPON_CATEGORY_MASTER.COUPON_CATEGORY_CREATE, payload)
      .subscribe({
        next: () => {
          this.reset();
          this.couponCategoryGridReload$.next();
          this.loader.hideGlobal();
          this.message.success('Coupon category created successfully');
        },
        error: (err) => {
          this.loader.hideGlobal();
          this.message.error('Failed to create coupon category');
          console.error('Create failed', err);
        },
      });
  }
}

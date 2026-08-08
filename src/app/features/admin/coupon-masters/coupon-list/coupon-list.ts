import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { catchError, map, of, Subject } from 'rxjs';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { Router } from '@angular/router';

export interface CouponFilterDto {
  start_date?: string | null;
  end_date?: string | null;
  coupon_category_id?: number | null;
}

@Component({
  selector: 'app-coupon-list',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    UiGridComponent,
    NzCardModule,
    NzIconModule,
    NzDividerModule,
    NzSwitchModule,
    NzFormModule,
    NzSelectModule,
    NzModalModule,
    NzButtonModule,
    NzTypographyModule,
    NzDatePickerModule,
  ],
  templateUrl: './coupon-list.html',
  styleUrl: './coupon-list.scss',
})
export class CouponList implements OnInit {
  couponGridReload$ = new Subject<void>();
  permission = inject(PermissionService);
  router = inject(Router);
  api = inject(ApiCallService);
  fb = inject(FormBuilder);

  isFilterVisible = false;
  form!: FormGroup;
  couponCategoryList: any[] = [];
  couponPayload: CouponFilterDto = {};

  couponGridDataSource = {
    load: () =>
      this.api
        .post<any>('common', API_ENDPOINTS.COUPON_MASTER.COUPON_LIST, this.couponPayload)
        .pipe(
          map((res) => res.data ?? []),
          catchError((err) => {
            console.error('Failed to load coupons', err);
            return of([]);
          })
        ),
  };

  ngOnInit(): void {
    this.initForm();
    this.categoryDropdown();
  }

  initForm(): void {
    this.form = this.fb.group({
      start_date: null,
      end_date: null,
      coupon_category_id: null,
    });
  }

  categoryDropdown() {
    this.api.get<any>('common', API_ENDPOINTS.COUPON_MASTER.COUPON_CATEGORY_DROPDOWN).subscribe({
      next: (res) => {
        this.couponCategoryList = res.data || [];
      },
    });
  }

  openFilterModal() {
    this.isFilterVisible = true;
  }

  closeFilterModal(): void {
    this.isFilterVisible = false;
  }

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('coupon_update');
  }

  reset() {
    this.form.reset({
      start_date: null,
      end_date: null,
      coupon_category_id: null,
    });
  }

  submit() {
    this.couponPayload = {
      start_date: this.form.value.start_date,
      end_date: this.form.value.end_date,
      coupon_category_id: this.form.value.coupon_category_id,
    };

    this.couponGridReload$.next();
    this.isFilterVisible = false;
    this.reset();
  }

  onAction($event: { actionKey: string; row: any }) {
    const { actionKey, row } = $event;
    if (actionKey === 'edit') {
      this.editRow(row);
    }
  }
  editRow(payload: CouponList) {
    this.router.navigate(['admin/add/coupon'], { state: { data: payload } });
  }

  refresh() {
    this.couponGridReload$.next();
  }
}

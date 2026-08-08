import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzCardModule } from 'ng-zorro-antd/card';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { catchError, map, of, Subject } from 'rxjs';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { Router } from '@angular/router';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { CommonModule } from '@angular/common';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzMessageService } from 'ng-zorro-antd/message';
import { INDIAN_STATES } from '../../../customer/models/address-book.model';

export interface BannerFilterDto {
  start_date?: string;
  end_date?: string;
  state_id?: number;
  platform?: string;
  is_active?: boolean;
}

@Component({
  selector: 'app-bannerlist',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzModalModule,
    NzFormModule,
    NzSelectModule,
    NzSwitchModule,
    NzIconModule,
    NzDividerModule,
    NzCardModule,
    UiGridComponent,
    NzDescriptionsModule,
    NzDatePickerModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzFormModule,
    NzSelectModule,
    NzButtonModule,
    NzTypographyModule,
    NzBadgeModule,
    NzSkeletonModule,
  ],
  templateUrl: './bannerlist.html',
  styleUrl: './bannerlist.scss',
})
export class Bannerlist implements OnInit {
  api = inject(ApiCallService);
  fb = inject(FormBuilder);
  cdr = inject(ChangeDetectorRef);
  router = inject(Router);

  isFilterVisible = false;
  isViewVisible = false;
  selectedBanner: any;
  permission = inject(PermissionService);

  form!: FormGroup;
  stateList= INDIAN_STATES;
  platformOptions = ['Both', 'Web', 'Mobile'];
  bannerPayload: BannerFilterDto = {};
  bannerGridDataSource = {
  load: () =>
    this.api
      // 4. Pass the tracking property object into your datasource configuration
      .post<any>('common', API_ENDPOINTS.BANNER.BANNER_LIST, this.bannerPayload)
      .pipe(
        map((res: any) => res.data ?? []),
        catchError((err) => {
          return of([]);
        })
      ),
};
  bannerGridReload$ = new Subject<void>();
  isImageLoading = false;
  message = inject(NzMessageService);

  ngOnInit(): void {
    this.initForm();
  }

  today = new Date().toISOString().split('T')[0];
  initForm(): void {
    this.form = this.fb.group({
      start_date:null,
      end_date: null,
      state_id: 0,
      platform: 'Both',
      is_active: true,
    });
  }

  openFilterModal() {
    this.isFilterVisible = true;
  }

  closeFilterModal(): void {
    this.isFilterVisible = false;
  }

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('edit_banner');
  }
  reset() {
    this.form.reset({
      start_date: this.today,
      end_date: this.today,
      state_id: 0,
      platform: 'Both',
      is_active: true,
    });
  }

 submit() {
  this.bannerPayload = {
    start_date: this.form.value.start_date,
    end_date: this.form.value.end_date,
    state_id: this.form.value.state_id,
    platform: this.form.value.platform,
    is_active: this.form.value.is_active,
  };

  this.bannerGridReload$.next();
  this.isFilterVisible = false;
  this.reset();
}

  onAction($event: { actionKey: string; row: any }) {
    const { actionKey, row } = $event;
    if (actionKey === 'view') {
      this.isImageLoading = true;
      this.openImagePreview(row.image_url, row.banner_title);
    }
    if (actionKey === 'edit') {
      this.router.navigate(['admin/add/banner'], { state: { data: row } });
    }
    if(actionKey === 'toggleActive') {
      this.toggleActiveStatus(row.banner_id)
    }
  }
  isImagePreviewVisible = false;
  previewImageUrl: string = '';
  previewImageName: string = '';

  openImagePreview(url: string, name: string): void {
    this.isImageLoading = true;
    this.previewImageUrl = url;
    this.previewImageName = name;
    this.isImagePreviewVisible = true;
  }

  closeImagePreview(): void {
    this.isImageLoading = false;
    this.isImagePreviewVisible = false;
    this.previewImageUrl = '';
    this.previewImageName = '';
  }
  onImageLoaded(): void {
    this.isImageLoading = false;
  }
  toggleActiveStatus(bannerId: number): void {
    this.api.post<any>('common', `${API_ENDPOINTS.BANNER.TOGGLE_ACTIVE_STATUS}/${bannerId}`,"").subscribe({
      next: (res) => {
        this.message.success(res.message);
        this.bannerGridReload$.next();
      },
      error: (err) => {
        this.message.error('Error');
        console.error('Create failed', err);
      },
    });
  }
}

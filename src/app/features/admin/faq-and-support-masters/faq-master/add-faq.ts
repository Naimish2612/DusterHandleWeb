import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { map, Subject } from 'rxjs';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';

@Component({
  selector: 'app-add-faq',
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
    UiGridComponent
  ],
  templateUrl: './add-faq.html',
  styleUrl: './add-faq.scss',
})
export class AddFaq implements OnInit {
  fb = inject(FormBuilder);
  api = inject(ApiCallService);
  loader = inject(LoadingService);
  message = inject(NzMessageService);
  router = inject(Router);
  activatedRoute = inject(ActivatedRoute);
  permission = inject(PermissionService);
  nzModalService = inject(NzModalService);
  faq_id = 0;

  form!: FormGroup;
  isSaving = false;
  faqId = 0;
  showAddButton = true;
  showEditButton = false;

  faqGridReload$ = new Subject<void>();
  faqGridDataSource = {
    load: () =>
      this.api
        .get<any>('common', API_ENDPOINTS.FAQ.FAQ_LIST)
        .pipe(map((res) => res.data ?? [])),
  };

  // Mapping Modal Properties
  isMappingModalVisible = false;
  isMappingSaving = false;
  categoryList: any[] = [];
  subCategoryList: any[] = [];
  productList: any[] = [];
  mappingForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.loadCategoryDropdown();
    this.activatedRoute.queryParams.subscribe((params) => {
      if (params['faq_id']) {
        this.faqId = Number(params['faq_id']);
        this.faq_id = this.faqId;
        this.loadFaqDetails(this.faqId);
        this.showAddButton = false;
        this.showEditButton = true;
      }
    });
  }

  initForm(): void {
    this.form = this.fb.group({
      faq_id: [0],
      question: ['', [Validators.required, Validators.maxLength(500)]],
      answer: ['', [Validators.required]],
      is_active: [true],
    });

    this.mappingForm = this.fb.group({
      category_id: [null],
      sub_category_id: [null],
      product_id: [null],
    });
  }

  loadCategoryDropdown(): void {
    this.api
      .get<any>('common', API_ENDPOINTS.PRODUCT_SUBCATEGORY.DROPDOWN_PRODUCT_CATEGORY_LIST)
      .pipe(map((res) => res.data ?? []))
      .subscribe({
        next: (data) => {
          this.categoryList = data;
        },
        error: (err) => console.error('Failed to load category dropdown', err),
      });
  }

  onCategoryChange(categoryId: number | null): void {
    this.mappingForm.get('sub_category_id')?.setValue(null);
    this.mappingForm.get('product_id')?.setValue(null);
    this.subCategoryList = [];
    this.productList = [];

    if (categoryId) {
      this.loadSubCategoryDropdown(categoryId);
    }
  }

  loadSubCategoryDropdown(categoryId: number): void {
    this.api
      .get<any>(
        'common',
        `${API_ENDPOINTS.PRODUCT_SUBCATEGORY.PRODUCT_SUBCATEGORY_LIST}/${categoryId}`,
      )
      .pipe(
        map((res) =>
          (res.data ?? []).map((item: any) => ({
            id: item.sub_category_id,
            value: item.name,
          })),
        ),
      )
      .subscribe({
        next: (data) => {
          this.subCategoryList = data;
        },
        error: (err) => console.error('Failed to load sub category dropdown', err),
      });
  }

  onSubCategoryChange(subCategoryId: number | null): void {
    this.mappingForm.get('product_id')?.setValue(null);
    this.productList = [];

    if (subCategoryId) {
      this.loadProductDropdown(subCategoryId);
    }
  }

  loadProductDropdown(subCategoryId: number): void {
    this.api
      .get<any>(
        'common',
        `${API_ENDPOINTS.PRODUCT_REVIEW.GET_PRODUCT_BY_SUBCATEGORYID}/${subCategoryId}`,
      )
      .pipe(
        map((res) =>
          (res.data ?? []).map((item: any) => ({
            id: item.id,
            value: item.value,
          })),
        ),
      )
      .subscribe({
        next: (data) => {
          this.productList = data;
        },
        error: (err) => {
          this.message.error('Failed to load product dropdown');
        },
      });
  }

  loadFaqDetails(faqId: number): void {
    this.loader.showGlobal('Loading FAQ Details...');
    this.api.get<any>('common', `api/faq/get/${faqId}`).subscribe({
      next: (res) => {
        if (res.data) {
          this.form.patchValue(res.data);
        }
        this.loader.hideGlobal();
      },
      error: (err) => {
        this.message.error('Failed to load FAQ details');
        this.loader.hideGlobal();
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    this.isSaving = true;
    this.loader.showGlobal(this.faqId > 0 ? 'Updating FAQ...' : 'Creating FAQ...');
    const payload = this.form.value;

    this.api.post<any>('common', API_ENDPOINTS.FAQ.CREATE_OR_UPDATE, payload).subscribe({
      next: (res) => {
        this.message.success(this.faqId > 0 ? 'FAQ updated successfully' : 'FAQ created successfully');
        const isUpdate = this.faqId > 0;
        this.loader.hideGlobal();
        this.isSaving = false;

        if (isUpdate) {
          this.reset();
          this.faqGridReload$.next();
        } else {
          this.faq_id = res.data;
          // Open the mapping modal
          this.isMappingModalVisible = true;
        }
      },
      error: (err) => {
        this.message.error(err.message || 'Failed to save FAQ');
        this.loader.hideGlobal();
        this.isSaving = false;
      },
    });
  }

  saveMapping(): void {
    const formVal = this.mappingForm.value;

    let target_type = '';
    let target_id = null;

    if (formVal.product_id) {
      target_type = 'Product';
      target_id = formVal.product_id;
    } else if (formVal.sub_category_id) {
      target_type = 'SubCategory';
      target_id = formVal.sub_category_id;
    } else if (formVal.category_id) {
      target_type = 'Category';
      target_id = formVal.category_id;
    } else {
      this.message.warning('Please select at least one mapping option (Category, Sub Category, or Product).');
      return;
    }

    this.isMappingSaving = true;
    this.loader.showGlobal('Saving FAQ Mapping...');
    const payload = {
      faq_id: this.faq_id,
      target_type: target_type,
      target_id: target_id,
    };

    this.api.post<any>('common', API_ENDPOINTS.FAQ.MAP_FAQ, payload).subscribe({
      next: (res) => {
        this.message.success('FAQ mapped successfully');
        this.loader.hideGlobal();
        this.isMappingSaving = false;
        this.closeMappingModal();
      },
      error: (err) => {
        this.message.error(err.message || 'Failed to map FAQ');
        this.loader.hideGlobal();
        this.isMappingSaving = false;
      },
    });
  }

  closeMappingModal(): void {
    this.isMappingModalVisible = false;
    this.reset();
    this.faqGridReload$.next();
    this.goBack();
  }

  onAction($event: { actionKey: string; row: any }): void {
    const { actionKey, row } = $event;

    if (actionKey === 'edit') {
      this.faqId = row.faq_id;
      this.faq_id = row.faq_id;
      this.form.patchValue({
        faq_id: row.faq_id,
        question: row.question,
        answer: row.answer,
        is_active: row.is_active,
      });
      this.showAddButton = false;
      this.showEditButton = true;
    }

    if (actionKey === 'toggleActive') {
      this.nzModalService.confirm({
        nzTitle: 'Are you sure you want to toggle the activation status of this FAQ?',
        nzOkText: 'Yes',
        nzCancelText: 'No',
        nzOkDanger: true,
        nzOnOk: () => this.toggleActivation(row),
      });
    }
  }

  toggleActivation(row: any): void {
    const updatedStatus = !row.is_active;
    const payload = {
      faq_id: row.faq_id,
      question: row.question,
      answer: row.answer,
      is_active: updatedStatus,
    };

    this.loader.showGlobal('Updating FAQ status...');
    this.api.post<any>('common', API_ENDPOINTS.FAQ.CREATE_OR_UPDATE, payload).subscribe({
      next: () => {
        this.faqGridReload$.next();
        this.message.success('FAQ status updated successfully');
        this.loader.hideGlobal();
      },
      error: (err) => {
        this.loader.hideGlobal();
        this.message.error('Failed to update FAQ status');
        console.error('Update status failed', err);
      },
    });
  }

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('update_faq');
  }
  get hasAddPermission(): boolean {
    return this.permission.allowedActions$().has('add_faq');
  }

  reset(): void {
    this.form.reset({ faq_id: 0, is_active: true });
    this.faq_id = 0;
    this.faqId = 0;
    this.showAddButton = true;
    this.showEditButton = false;
    this.mappingForm.reset();
  }

  goBack(): void {
    this.router.navigate(['admin/faq/list']);
  }
}

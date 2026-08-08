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

import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { Router } from '@angular/router';

interface ProductSubCategoryPayload {
  sub_category_id?: number;
  category_id: number;
  name: string;
  slug: string;
}

interface CategoryOption {
  id: number;
  value: string;
}

@Component({
  selector: 'app-product-sub-category',
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
  templateUrl: './product-subcategory.html',
  styleUrl: './product-subcategory.scss',
})
export class ProductSubCategory implements OnInit {
  private permission = inject(PermissionService);
  private fb = inject(FormBuilder);
  private api = inject(ApiCallService);
  router = inject(Router)

  form!: FormGroup;
  showUpdateButton: boolean = false;
  showAddButton: boolean = true;
  subCategoryGridReload$ = new Subject<void>();
  
  categoryList: CategoryOption[] = [];
  private selectedId: number | null = null;
  selectedData: any;
  categoryId: number | string | null = null;
  
  
  ngOnInit(): void {
    this.initForm();
    this.loadCategoryDropdown();
     this.form.get('name')?.valueChanges.subscribe((name: string) => {
      if (name) {
        const generatedSlug = name
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');

        this.form.get('slug')?.setValue(generatedSlug, { emitEvent: false });
      }
    });
  }
  
  
  initForm(): void {
    this.form = this.fb.group({
      category_id: [null, [Validators.required]],
      name: ['', [Validators.required, Validators.minLength(3)]],
      slug: [''],
    });
  }

  loadCategoryDropdown(): void {
    this.api
    .get<any>(
        'common',
        API_ENDPOINTS.PRODUCT_SUBCATEGORY.DROPDOWN_PRODUCT_CATEGORY_LIST
      )
      .pipe(map((res) => res.data ?? []))
      .subscribe({
        next: (data: CategoryOption[]) => {
          this.categoryList = data;
        },
        error: (err) =>
          console.error('Failed to load category dropdown', err),
      });
    }
    
    
    get hasAddPermission(): boolean {
      return this.permission
      .allowedActions$()
      .has('product_sub_category_create');
    }
    
    get hasEditPermission(): boolean {
    return this.permission
      .allowedActions$()
      .has('product_sub_category_update');
    }
    
    
  submit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }
    
    const payload: ProductSubCategoryPayload = {
      category_id: this.form.value.category_id,
      name: this.form.value.name,
      slug: this.form.value.slug,
    };
    
    this.api
    .post<any>(
      'common',
      API_ENDPOINTS.PRODUCT_SUBCATEGORY.PRODUCT_SUBCATEGORY_CREATE,
      payload
    )
    .subscribe({
      next: () => {
        this.reset();
          this.subCategoryGridReload$.next();
        },
        error: (err) => console.error('Create failed', err),
      });
  }
  
  
  onCategoryChange($event: any) {
    this.categoryId = $event;
    this.subCategoryGridReload$.next();
  }
  
  productSubCategoryUpdate(): void {
    if (this.form.invalid || this.selectedId === null) return;

    const payload: ProductSubCategoryPayload = {
      sub_category_id: this.selectedId,
      category_id: this.form.value.category_id,
      name: this.form.value.name,
      slug: this.form.value.slug,
    };

    this.api
      .post<any>(
        'common',
        `${API_ENDPOINTS.PRODUCT_SUBCATEGORY.PRODUCT_SUBCATEGORY_UPDATE}`,
        payload
      )
      .subscribe({
        next: () => {
          this.reset();
          this.subCategoryGridReload$.next();
        },
        error: (err) => console.error('Update failed', err),
      });
  }


  reset(): void {
    this.form.reset({ category_id: null });
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
      this.selectedId = row.sub_category_id;
      this.form.patchValue({
        sub_category_id: row.sub_category_id,
        category_id: row.category_id,
        name: row.name,
        slug: row.slug,
      });
      this.showUpdateButton = true;
      this.showAddButton = false;
    }

    if (actionKey === 'delete') {
      this.api
        .delete<any>(
          'common',
          `${API_ENDPOINTS.PRODUCT_SUBCATEGORY.PRODUCT_SUBCATEGORY_DELETE}/${row.sub_category_id}`
        )
        .subscribe({
          next: () => this.subCategoryGridReload$.next(),
          error: (err) => console.error('Delete failed', err),
        });
    }
  }

    goToImport() {
    this.router.navigate(['/admin/import'], {
      state: {
        process_name: 'PRODUCT_SUB_CATEGORY',
        dummyData: [
          {
            sub_category_name: 'Phone',
            category_name: 'Electronics',
            slug: 'electronics',
          },
          {
            sub_category_name: 'Laptop',
            category_name: 'Electronics',
            slug: 'clothing',
          },
        ],
        returnUrl: '/admin/product/sub-category',
        returnText: 'Back to Product Sub Category',
      },
    });
  }

  subCategoryGridDataSource = {
    load: () =>
      this.api
        .get<any>(
          'common',
           `${API_ENDPOINTS.PRODUCT_SUBCATEGORY.PRODUCT_SUBCATEGORY_LIST}/${this.categoryId}`
        )
        .pipe(map((res) => res.data ?? [])),
  };
}
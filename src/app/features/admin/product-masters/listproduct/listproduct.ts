import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { NzCardComponent, NzCardModule } from 'ng-zorro-antd/card';
import { catchError, map, Observable, of, Subject } from 'rxjs';
import { NzRowDirective, NzColDirective, NzGridModule } from 'ng-zorro-antd/grid';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { collapseMotion } from 'ng-zorro-antd/core/animation';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NzOptionComponent, NzSelectModule } from 'ng-zorro-antd/select';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
export interface Product {
  product_code: number;
  name: string;
  sku: string;
  slug: string;
  description: string;
  base_price: number;
  category_id: number;
  sub_category_id: number;
  manufacturer_id: number;
  attributes: string;
  is_active: boolean;
  in_stock: boolean;
  stock_quantity: number;
  is_top_selling: boolean;
  is_new_arrival: boolean;
}

export interface ProductFilterDto {
  name?: string;
  slug?: string;
  category_id?: number;
  sub_category_id?: number;
  manufacturer_id?: number;
  is_active?: boolean;
  in_stock?: boolean;
  PageNumber?: number;
  PageSize?: number;
}

interface DropdownOption {
  id: number;
  value: string;
}

@Component({
  selector: 'app-listproduct',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzGridModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    NzButtonModule,
    NzCardModule,
    NzSwitchModule,
    NzDividerModule,
    NzTagModule,
    NzTableModule,
    NzModalModule,
    UiGridComponent,
    NzTypographyModule,
    NzCardComponent,
    NzRowDirective,
    NzDescriptionsModule,
    NzBadgeModule,
    NzColDirective,
    NzOptionComponent,
    NzIconModule,
  ],
  templateUrl: './listproduct.html',
  styleUrl: './listproduct.scss',
})
export class ProductList implements OnInit {
  permission = inject(PermissionService);
  api = inject(ApiCallService);
  message = inject(NzMessageService);
  loader = inject(LoadingService);
  isViewVisible = false;
  selectedProduct: any;
  productAttributes: any[] = [];
  isFilterVisible = false;

  form!: FormGroup;
  categoryList: DropdownOption[] = [];
  subCategoryList: DropdownOption[] = [];
  manufacturerList: DropdownOption[] = [];
  cdr = inject(ChangeDetectorRef);
  fb = inject(FormBuilder);
  router = inject(Router);

  currentPageIndex = 1;
  productTotal = 0;

  payload: ProductFilterDto = {};
  productGridDataSource = {
    load: () => {
      if (!this.payload.PageNumber) {
        this.payload.PageNumber = 1;
      }
      return this.api.post<any>('common', API_ENDPOINTS.PRODUCT.PRODUCT_LIST, this.payload).pipe(
        map((res) => {
          const meta = res.data?.metadata;
          this.productTotal = meta?.totalCount || 0;
          return res.data?.data ?? [];
        }),
        catchError((err) => {
          console.error('Failed to load product grid data', err);
          return of([]);
        }),
      );
    },
  };
  productGridReload$ = new Subject<void>();

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('edit_product');
  }
  get hasManageImagesPermission(): boolean {
    return this.permission.allowedActions$().has('view_product_image');
  }
  ngOnInit(): void {
    this.initForm();
    this.loadDropdowns();
    this.payload.PageNumber = 1;
  }

  reset() {
    this.form.reset({
      category_id: null,
      sub_category_id: null,
      manufacturer_id: null,
      is_active: true,
      in_stock: true,
    });
  }

  submit() {
    this.currentPageIndex = 1;
    this.payload = {
      name: this.form.value.name,
      slug: this.form.value.slug,
      category_id: this.form.value.category_id,
      sub_category_id: this.form.value.sub_category_id,
      manufacturer_id: this.form.value.manufacturer_id,
      is_active: this.form.value.is_active,
      in_stock: this.form.value.in_stock,
      PageNumber: 1,
    };
    this.productGridReload$.next();
    this.isFilterVisible = false;
  }

  openFilterModal() {
    this.isFilterVisible = true;
  }
  closeFilterModal(): void {
    this.isFilterVisible = false;
  }
  isArray(val: any): boolean {
    return Array.isArray(val);
  }
  initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      slug: ['', [Validators.required]],
      category_id: [null, [Validators.required]],
      sub_category_id: [null, [Validators.required]],
      manufacturer_id: [null, [Validators.required]],
      is_active: [true],
      in_stock: [true],
    });
  }

  onAction($event: { actionKey: string; row: any }) {
    const { actionKey, row } = $event;

    if (actionKey === 'view') {
      this.loader.showGlobal('Fetching product details...');
      this.api
        .get<any>('common', `${API_ENDPOINTS.PRODUCT.GET_PRODUCT_BY_SLUG}/${row.slug}`)
        .subscribe({
          next: (res) => {
            this.loader.hideGlobal();
            if (res.statusCode === 200 && res.data) {
              const product = res.data;
              this.selectedProduct = product;

              const rawData = product.attribute || product.attributes;

              if (rawData) {
                const parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

                this.productAttributes = Object.entries(parsedData).map(([key, value]) => ({
                  key: key.replace(/_/g, ' '),
                  value: Array.isArray(value) ? value.join(', ') : String(value),
                }));
              } else {
                this.productAttributes = [];
              }

              this.isViewVisible = true;
            } else {
              this.message.error(res.message || 'Failed to fetch product details');
            }
          },
          error: (err) => {
            this.loader.hideGlobal();
            console.error('Fetch failed', err);
            this.message.error('Failed to fetch product details');
          },
        });
    }

    if (actionKey === 'edit') {
      this.editRow(row);
    }

    if (actionKey === 'view_images') {
      this.router.navigate(['admin/product/product-images'], {
        state: { productId: row.product_code, product_name: row.name, sku: row.sku },
      });
    }
  }

  editRow(payload: Product) {
    this.loader.showGlobal('Fetching product details...');
    this.api
      .get<any>('common', `${API_ENDPOINTS.PRODUCT.GET_PRODUCT_BY_SLUG}/${payload.slug}`)
      .subscribe({
        next: (res) => {
          this.loader.hideGlobal();
          if (res.statusCode === 200 && res.data) {
            this.router.navigate(['admin/product'], { state: { data: res.data } });
          } else {
            this.message.error(res.message || 'Failed to fetch product details');
          }
        },
        error: (err) => {
          this.loader.hideGlobal();
          console.error('Fetch failed', err);
          this.message.error('Failed to fetch product details');
        },
      });
  }
  loadDropdowns(): void {
    this.loadCategoryDropdown();
    this.loadManufacturerDropdown();
  }

  loadCategoryDropdown(): void {
    this.api
      .get<any>('common', API_ENDPOINTS.PRODUCT_SUBCATEGORY.DROPDOWN_PRODUCT_CATEGORY_LIST)
      .pipe(map((res) => res.data ?? []))
      .subscribe({
        next: (data: DropdownOption[]) => (this.categoryList = data),
        error: (err) => console.error('Failed to load category dropdown', err),
      });
    this.cdr.detectChanges();
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
            id: item.sub_category_id, // Map sub_category_id to id
            value: item.name, // Map name to value
          })),
        ),
      )
      .subscribe({
        next: (data: DropdownOption[]) => (this.subCategoryList = data),
        error: (err) => console.error('Failed to load sub category dropdown', err),
      });
  }

  loadManufacturerDropdown(): void {
    this.api
      .get<any>('common', API_ENDPOINTS.MANUFACTURERS.MANUFACTURERS_LIST)
      .pipe(
        map((res) =>
          (res.data ?? []).map((item: any) => ({
            id: item.manufacturer_id, // Map manufacturer_id to id
            value: item.name, // Map name to value
          })),
        ),
      )
      .subscribe({
        next: (data: DropdownOption[]) => (this.manufacturerList = data),
        error: (err) => console.error('Failed to load manufacturer dropdown', err),
      });
  }
  onCategoryChange(categoryId: number): void {
    // Reset sub category when category changes
    this.form.get('sub_category_id')?.setValue(null);
    this.subCategoryList = [];

    if (categoryId) {
      this.loadSubCategoryDropdown(categoryId);
    }
  }

  onPageChange(event: { pageIndex: number; pageSize: number }) {
    this.payload.PageNumber = event.pageIndex;
    this.payload.PageSize = event.pageSize;
    this.productGridReload$.next();
  }
}

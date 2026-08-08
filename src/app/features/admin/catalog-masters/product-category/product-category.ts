import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NzCardComponent, NzCardModule } from 'ng-zorro-antd/card';
import { NzFormItemComponent, NzFormModule } from 'ng-zorro-antd/form';
import { NzColDirective, NzGridModule, NzRowDirective } from 'ng-zorro-antd/grid';
import { NzSwitchComponent, NzSwitchModule } from 'ng-zorro-antd/switch';
import { ɵNzTransitionPatchDirective } from 'ng-zorro-antd/core/transition-patch';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { NzDividerComponent, NzDividerModule } from 'ng-zorro-antd/divider';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { map, Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NotificationService } from '../../../../core/infrastructure/notification.service';
import { Title } from '@angular/platform-browser';

interface ProductCategoryPayload {
  category_id?: number;
  name: string;
  description: string;
  is_active: boolean;
  slug: string;
}

@Component({
  selector: 'app-product-category',
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
  templateUrl: './product-category.html',
  styleUrl: './product-category.scss',
})
export class ProductCategory implements OnInit {
  permission = inject(PermissionService);
  private fb = inject(FormBuilder);
  productCategoryGridReload$ = new Subject<void>();
  private api = inject(ApiCallService);
  notification = inject(NotificationService)
  private router = inject(Router);
  showUpdateButton: boolean = false;
  form!: FormGroup;
  private selectedId: number | null = null;
  selectedData: any;
  showAddButton: boolean = true;

  ngOnInit(): void {
    this.initForm();
    this.form.get('product_category_name')?.valueChanges.subscribe((name: string) => {
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
      product_category_name: ['', [Validators.required, Validators.minLength(3)]],
      is_active: [true, Validators.required],
      product_category_description: [''],
      slug: ['', [Validators.required]],
    });
  }

  get hasAddPermission(): boolean {
    return this.permission.allowedActions$().has('product_category_create');
  }

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('product_category_update');
  }


  submit() {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }
    const payload: ProductCategoryPayload = {
      name: this.form.value.product_category_name,
      description: this.form.value.product_category_description,
      is_active: this.form.value.is_active,
      slug: this.form.value.slug,
    };
    this.api
      .post<any>('common', API_ENDPOINTS.PRODUCT_MASTER.PRODUCT_CATEGORY_CREATE, payload)
      .subscribe({
        next: () => {
          this.reset();
          this.productCategoryGridReload$.next();
        },
        error: (err) => {
            this.notification.Error({
              title: err.message,
              message: err.raw.error.data
            })   
        }
      });
  }
  productCategoryUpdate() {
    if (this.form.invalid || this.selectedId === null) return;

    const payload: ProductCategoryPayload = {
      category_id: this.selectedId,
      name: this.form.value.product_category_name,
      description: this.form.value.product_category_description,
      is_active: this.form.value.is_active,
      slug: this.form.value.slug,
    };

    this.api
      .post<any>(
        'common',
        `${API_ENDPOINTS.PRODUCT_MASTER.PRODUCT_CATEGORY_UPDATE}`,
        payload,
      )
      .subscribe({
        next: () => {
          this.reset();
          this.productCategoryGridReload$.next();
        },
        error: (err) => console.error('Update failed', err),
      });
  }
  selectionChanged($event: any[]) {
    this.selectedData = JSON.stringify($event);
  }
  onAction($event: { actionKey: string; row: any }) {
    const { actionKey, row } = $event;

    if (actionKey === 'edit') {
      this.selectedId = row.category_id;
      this.form.patchValue({
        category_id: row.category_id,
        product_category_name: row.name,
        slug: row.slug,
        is_active: row.is_active,
        product_category_description: row.description,
      });
      this.showAddButton = false;
      this.showUpdateButton = true;
    }

    if (actionKey === 'delete') {
      this.api
        .delete<any>('common', `${API_ENDPOINTS.PRODUCT_MASTER.PRODUCT_CATEGORY_DELETE}/${row.id}`)
        .subscribe({
          next: () => this.productCategoryGridReload$.next(),
          error: (err) => console.error('Delete failed', err),
        });
    }
  }
  reset() {
    this.form.reset({
      is_active: true,
    });
    this.showUpdateButton = false;
    this.showAddButton = true;
  }
  goToImport() {
    this.router.navigate(['/admin/import'], {
      state: {
        process_name: 'PRODUCT_CATEGORY',
        dummyData: [
          {
            category_name: 'Electronics',
            description: 'Electronic items and gadgets',
            slug: 'electronics',
            is_active: true,
          },
          {
            category_name: 'Clothing',
            description: 'Apparel and accessories',
            slug: 'clothing',
            is_active: true,
          },
        ],
        returnUrl: '/admin/product/category',
        returnText: 'Back to Product Category',
      },
    });
  }
  productCategoryGridDataSource = {
    load: () =>
      this.api
        .get<any>('common', API_ENDPOINTS.PRODUCT_MASTER.PRODUCT_CATEGORY_LIST)
        .pipe(map((res) => res.data ?? [])),
  };
}

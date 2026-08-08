import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { map } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzModalModule, NzModalService} from 'ng-zorro-antd/modal';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { PermissionService } from '../../../../core/infrastructure/permission.service';

interface DropdownOption {
  id: number;
  value: string;
}
@Component({
  selector: 'app-product-review',
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
    NzTagModule,
    NzTableModule,
    NzIconModule,
    NzEmptyModule,
    NzDividerModule,
    NzRateModule,
    NzModalModule
  ],
  templateUrl: './product-review.html',
  styleUrl: './product-review.scss',
})
export class ProductReview {
  form!: FormGroup;
  categoryList: DropdownOption[] = [];
  subCategoryList: DropdownOption[] = [];
  api = inject(ApiCallService);
  cdr = inject(ChangeDetectorRef);
  fb = inject(FormBuilder);
  productList: DropdownOption[] = [];
  reviewList: any;
  loader = inject(LoadingService);
  message = inject(NzMessageService);
  permission = inject(PermissionService);
  private nzModalService = inject(NzModalService)

  initForm() {
    this.form = this.fb.group({
      category_id: [null, [Validators.required]],
      sub_category_id: [null, [Validators.required]],
      product_id: [null, [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.loadCategoryDropdown();
  }

  onCategoryChange(categoryId: number): void {
    this.form.get('sub_category_id')?.setValue(null);
    this.subCategoryList = [];

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
        next: (data: DropdownOption[]) => (this.subCategoryList = data),
        error: (err) => console.error('Failed to load sub category dropdown', err),
      });
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
  onSubCategoryChange(subCategoryId: number): void {
    this.form.get('product_id')?.setValue(null);
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
        next: (data: DropdownOption[]) => (this.productList = data),
        error: (err) => {
          this.message.error('Failed to load product dropdown');
          this.loader.hideGlobal();
        },
      });
  }
  submit() {
    this.loader.showGlobal('Fetching Reviews..');
    this.api
      .get<any>(
        'common',
        `${API_ENDPOINTS.PRODUCT_REVIEW.GET_REVIEWS_BY_PRODUCT}/${this.form.value.product_id}`,
      )
      .pipe(
        map((res) =>
          (res.data ?? []).map((item: any) => ({
            product_review_id: item.product_review_id,
            product_code: item.product_code,
            review_title: item.review_title,
            user_name: item.user_name,
            rating: item.rating,
            comment: item.comment,
            review_datetime: item.review_datetime,
            is_verified_purchase: item.is_verified_purchase,
            is_publish: item.is_publish,
            is_delete: item.is_delete,
          })),
        ),
      )
      .subscribe({
        next: (res) => {
          this.reviewList = res;
          this.message.success('Reviews loaded successfully');
        },
        complete: () => this.loader.hideGlobal(),
        error: (err) => {
          this.message.error('Failed to load product dropdown');
          this.loader.hideGlobal();
        },
      });
  }
  getRatingColor(rating: number): string {
    if (rating > 3.5) {
      return '#52c41a'; // Ant Design Green
    } else if (rating >= 2.5 && rating <= 3.5) {
      return '#8c8c8c'; // Grey
    } else {
      return '#ff4d4f'; // Light Red / Error Red
    }
  }
  getCardBgColor(ratingStr: string): string {
    const rating = parseFloat(ratingStr);
    if (rating > 3.5) {
      return '#f6ffed'; // Very light green (Ant Design success-bg)
    } else if (rating >= 2.5 && rating <= 3.5) {
      return '#f5f5f5'; // Light grey
    } else {
      return '#fff1f0'; // Very light red (Ant Design error-bg)
    }
  }
  loadReviews(id: number) {
    this.api
      .get<any>('common', `${API_ENDPOINTS.PRODUCT_REVIEW.GET_REVIEWS_BY_PRODUCT}/${id}`)
      .pipe(
        map((res) =>
          (res.data ?? []).map((item: any) => ({
            product_review_id: item.product_review_id,
            product_code: item.product_code,
            review_title: item.review_title,
            user_name: item.user_name,
            rating: item.rating,
            comment: item.comment,
            review_datetime: item.review_datetime,
            is_verified_purchase: item.is_verified_purchase,
            is_publish: item.is_publish,
            is_delete: item.is_delete,
          })),
        ),
      )
      .subscribe({
        next: (res) => {
          this.reviewList = res;
          this.loader.hideGlobal();
        },
        error: (err) => {
          this.loader.hideGlobal();
        },
      });
  }

    deleteReview(review: any) {
    this.nzModalService.confirm({
      nzTitle: 'Are you sure you want to delete this review?',
      nzOkText: 'Yes',
      nzCancelText: 'No',
      nzOkDanger: true,
      nzOnOk: () => {
        this.loader.showGlobal('Updating review status..');
        this.api
          .post<any>(
            'common',
            `${API_ENDPOINTS.PRODUCT_REVIEW.DELETE_REVIEW}/${review.product_review_id}`,
            {}
          )
          .subscribe({
            next: () => {
              this.loadReviews(review.product_code);
              this.loader.hideGlobal();
              this.message.success('Review updated successfully');
            },
            error: (err) => {
              this.message.error('Error deleting review');
              this.loader.hideGlobal();
            },
          });
      }
    });
  }


  togglePublish(review: any) {
    this.loader.showGlobal('Updating review status..');
    let payload = {
      product_review_id: review.product_review_id,
      is_publish: !review.is_publish, // This matches your template property
    };
    this.api.post<any>('common', API_ENDPOINTS.PRODUCT_REVIEW.PUBLISH_REVIEW, payload).subscribe({
      next: () => {
        this.loadReviews(review.product_code);
        this.loader.hideGlobal();
        this.message.success('Status updated successfully');
      },
      error: (err) => {
        this.message.error('Error updating review status');
        this.loader.hideGlobal();
      },
    });
  }

  get hasToggePublishPermission(): boolean {
    return this.permission.allowedActions$().has('toggle_product_review');
  }
  get hasDeletePermission(): boolean {
    return this.permission.allowedActions$().has('delete_product_review');
  }
}

import { Component, Input, Output, EventEmitter, signal, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import { OrderItem } from '../../models/user.common.model';
import { ReviewService, AddReviewResponse } from '../../services/review.service';

// ── Exported types (used by parent + service) ─────────────────────────
export interface ReviewPayload {
  product_code: number;
  rating: string;
  review_title: string;
  comment: string;
}

export interface ReviewSubmittedEvent {
  product_code: number;
  success: boolean;
}

@Component({
  selector: 'app-review-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzModalModule,
    NzButtonModule,
    NzInputModule,
    NzRateModule,
    NzIconModule,
    NzDividerModule,
    NzToolTipModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="visible"
      [nzTitle]="modalTitle"
      [nzFooter]="modalFooter"
      [nzWidth]="520"
       [nzStyle]="{ top: '80px' }"
       nzCentered="false"
      (nzOnCancel)="handleCancel()"
      [nzClosable]="!isSubmitting()"
      [nzMaskClosable]="!isSubmitting()"
      [nzKeyboard]="!isSubmitting()"
    >

      <!-- ── Title ─────────────────────────────────────────── -->
      <ng-template #modalTitle>
        <div class="review-modal__title">
          <span nz-icon nzType="star" nzTheme="fill" style="color:#faad14"></span>
          Write a Review
        </div>
      </ng-template>

      <!-- ── Body ──────────────────────────────────────────── -->
      <ng-container *nzModalContent>
        @if (product) {
          <div class="review-modal__body">

            <!-- Product strip -->
            <div class="review-modal__product">
              <div class="review-modal__product-img">
                <img
                  [src]="product.image_url || placeholderImage"
                  [alt]="product.product_name"
                />
              </div>
              <div class="review-modal__product-info">
                <span class="review-modal__product-name">
                  {{ product.product_name }}
                </span>
                <span class="review-modal__product-sku">
                  SKU: {{ product.sku }}
                </span>
              </div>
            </div>

            <nz-divider style="margin: 14px 0"></nz-divider>

            <!-- Rating -->
            <div class="review-modal__field">
              <label class="review-modal__label">
                <span class="review-modal__required">*</span>
                Your Rating
              </label>
              <div class="review-modal__rating-row">
                <nz-rate
                  [(ngModel)]="ratingValue"
                  [nzAllowHalf]="true"
                  [nzTooltips]="ratingTooltips"
                  [nzDisabled]="isSubmitting()"
                ></nz-rate>
                @if (ratingValue > 0) {
                  <span
                    class="review-modal__rating-label"
                    [ngClass]="'review-modal__rating-label--' + getRatingClass(ratingValue)"
                  >
                    {{ getRatingLabel(ratingValue) }}
                  </span>
                }
              </div>
              @if (showValidation && ratingValue === 0) {
                <span class="review-modal__error-msg">
                  <span nz-icon nzType="exclamation-circle"></span>
                  Please select a rating
                </span>
              }
            </div>

            <!-- Review Title -->
            <div class="review-modal__field">
              <label class="review-modal__label">
                <span class="review-modal__required">*</span>
                Review Title
              </label>
              <input
                nz-input
                [(ngModel)]="reviewTitle"
                placeholder="Summarize your experience in a few words..."
                [maxlength]="100"
                [disabled]="isSubmitting()"
                [class.is-error]="showValidation && !reviewTitle.trim()"
              />
              <div class="review-modal__field-footer">
                @if (showValidation && !reviewTitle.trim()) {
                  <span class="review-modal__error-msg">
                    <span nz-icon nzType="exclamation-circle"></span>
                    Review title is required
                  </span>
                } @else {
                  <span></span>
                }
                <span class="review-modal__char-count">
                  {{ reviewTitle.length }}/100
                </span>
              </div>
            </div>

            <!-- Comment -->
            <div class="review-modal__field">
              <label class="review-modal__label">
                <span class="review-modal__required">*</span>
                Your Review
              </label>
              <textarea
                nz-input
                [(ngModel)]="comment"
                placeholder="Share your detailed experience with this product..."
                [nzAutosize]="{ minRows: 3, maxRows: 6 }"
                [maxlength]="500"
                [disabled]="isSubmitting()"
                [class.is-error]="showValidation && !comment.trim()"
              ></textarea>
              <div class="review-modal__field-footer">
                @if (showValidation && !comment.trim()) {
                  <span class="review-modal__error-msg">
                    <span nz-icon nzType="exclamation-circle"></span>
                    Review comment is required
                  </span>
                } @else {
                  <span></span>
                }
                <span class="review-modal__char-count">
                  {{ comment.length }}/500
                </span>
              </div>
            </div>

          </div>
        }
      </ng-container>

      <!-- ── Footer ────────────────────────────────────────── -->
      <ng-template #modalFooter>
        <div class="review-modal__footer">
          <button
            nz-button
            nzType="default"
            (click)="handleCancel()"
            [disabled]="isSubmitting()"
          >
            Cancel
          </button>
          <button
            nz-button
            nzType="primary"
            [nzLoading]="isSubmitting()"
            [disabled]="isSubmitting()"
            (click)="submitReview()"
          >
            <span nz-icon nzType="send"></span>
            Submit Review
          </button>
        </div>
      </ng-template>

    </nz-modal>
  `,
  styles: [`
    /* ── Title ──────────────────────────────────────────────── */
    .review-modal__title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 700;
      color: #1e293b; 
    }

    /* ── Body ───────────────────────────────────────────────── */
    .review-modal__body {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    /* ── Product strip ──────────────────────────────────────── */
    .review-modal__product {
      display: flex;
      gap: 12px;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;
    }

    .review-modal__product-img {
      width: 64px;
      height: 64px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
      border: 1px solid #e2e8f0;
      background: #f1f5f9;
      img { width: 100%; height: 100%; object-fit: cover; }
    }

    .review-modal__product-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .review-modal__product-name {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .review-modal__product-sku {
      font-size: 11px;
      color: #94a3b8;
      font-family: monospace;
    }

    /* ── Fields ─────────────────────────────────────────────── */
    .review-modal__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .review-modal__label {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .review-modal__required {
      color: #ef4444;
      font-size: 14px;
      line-height: 1;
    }

    /* ── Rating ─────────────────────────────────────────────── */
    .review-modal__rating-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .review-modal__rating-label {
      font-size: 13px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 20px;
    }

    .review-modal__rating-label--poor    { color: #ef4444; background: #fef2f2; }
    .review-modal__rating-label--fair    { color: #f97316; background: #fff7ed; }
    .review-modal__rating-label--average { color: #eab308; background: #fefce8; }
    .review-modal__rating-label--good    { color: #22c55e; background: #f0fdf4; }
    .review-modal__rating-label--great   { color: #10b981; background: #ecfdf5; }

    /* ── Error input ────────────────────────────────────────── */
    :host ::ng-deep {
      input.is-error,
      textarea.is-error {
        border-color: #ef4444 !important;
        &:focus {
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15) !important;
        }
      }
    }

    /* ── Field footer ───────────────────────────────────────── */
    .review-modal__field-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 18px;
    }

    .review-modal__error-msg {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #ef4444;
      span[nz-icon] { font-size: 12px; }
    }

    .review-modal__char-count {
      font-size: 11px;
      color: #94a3b8;
    }

    /* ── Footer ─────────────────────────────────────────────── */
    .review-modal__footer {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
  `]
})
export class ReviewModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() product: OrderItem | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() reviewSubmitted = new EventEmitter<ReviewSubmittedEvent>();

  private reviewService = inject(ReviewService);
  private message = inject(NzMessageService);

  // ── Form state ────────────────────────────────────────────────
  ratingValue = 0;
  reviewTitle = '';
  comment = '';
  showValidation = false;
  isSubmitting = signal(false);

  readonly ratingTooltips = ['Terrible', 'Bad', 'Normal', 'Good', 'Excellent'];

  // ── Reset when modal opens ────────────────────────────────────
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      queueMicrotask(() => {
        this.resetForm();
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────
  getRatingLabel(rating: number): string {
    if (rating <= 1) return 'Terrible';
    if (rating <= 2) return 'Bad';
    if (rating <= 3) return 'Average';
    if (rating <= 4) return 'Good';
    return 'Excellent';
  }

  getRatingClass(rating: number): string {
    if (rating <= 1) return 'poor';
    if (rating <= 2) return 'fair';
    if (rating <= 3) return 'average';
    if (rating <= 4) return 'good';
    return 'great';
  }

  // ── Validation ────────────────────────────────────────────────
  private isValid(): boolean {
    return (
      this.ratingValue > 0 &&
      this.reviewTitle.trim().length > 0 &&
      this.comment.trim().length > 0
    );
  }

  // ── Submit ────────────────────────────────────────────────────
  submitReview(): void {
    this.showValidation = true;
    if (!this.isValid() || !this.product) return;

    const payload: ReviewPayload = {
      product_code: this.product.product_code,
      rating: this.ratingValue.toString(),
      review_title: this.reviewTitle.trim(),
      comment: this.comment.trim(),
    };

    this.isSubmitting.set(true);

    this.reviewService.addReview(payload).subscribe({
      next: (res: AddReviewResponse) => {
        // ① Show API success message
        this.message.success(res?.message || 'Review submitted successfully!');

        // ② Notify parent → disable button + show badge
        this.reviewSubmitted.emit({
          product_code: this.product!.product_code, success: true,
        });

        // ③ Close modal
        this.closeModal();
      },
      error: (err) => {
        console.error('Review submission failed:', err);
        this.message.error(err?.error?.message || 'Failed to submit review. Please try again.');
        this.isSubmitting.set(false);
      },
    });
  }

  // ── Cancel ────────────────────────────────────────────────────
  handleCancel(): void {
    if (this.isSubmitting()) return;
    this.closeModal();
  }

  // ── Private ───────────────────────────────────────────────────
  private closeModal(): void {
    setTimeout(() => {
      this.visibleChange.emit(false);
      this.resetForm();
    });
  }

  private resetForm(): void {
    this.ratingValue = 0;
    this.reviewTitle = '';
    this.comment = '';
    this.showValidation = false;
    this.isSubmitting.set(false);
  }

  // ── Placeholder ───────────────────────────────────────────────
  readonly placeholderImage: string = (() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <rect width="64" height="64" fill="#F8FAFC"/>
      <rect x="18" y="16" width="28" height="24" rx="3" fill="#E2E8F0"/>
      <circle cx="26" cy="24" r="4" fill="#CBD5E1"/>
      <polygon points="18,40 28,30 36,36 46,28 46,40" fill="#CBD5E1"/>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  })();
}
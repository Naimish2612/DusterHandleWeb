import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { delay, map, of, startWith, Subject, switchMap, tap } from 'rxjs';
import { Router } from '@angular/router';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';

interface ImageItem {
  id: number;
  uid: string;
  name: string;
  size: string;
  file: File;
  preview: string;
  image_url?: string;
}

@Component({
  selector: 'app-product-images',
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
    NzIconModule,
    NzPopconfirmModule,
    NzModalModule,
    UiGridComponent,
    NzTypographyModule,
    NzDescriptionsModule,
    NzSkeletonModule,
  ],
  templateUrl: './product-images.html',
  styleUrl: './product-images.scss',
})
export class ProductImages implements OnInit {
  isImagePreviewVisible: boolean = false;
  permission = inject(PermissionService);
  previewImageUrl: string = '';
  previewImageName: string = '';
  imageListUpload: ImageItem[] = [];
  isImageUploading = false;
  isImageLoading = false;
  imageUploadReload$ = new Subject<void>();
  private popup = inject(NzModalService);
  _id = '';
  _name = '';
  _sku = '';
  ngOnInit(): void {
    this._id = history.state.productId;
    this._name = history.state.product_name;
    this._sku = history.state.sku;
  }
  api = inject(ApiCallService);
  router = inject(Router);
  loader = inject(LoadingService);
  cdr = inject(ChangeDetectorRef);
  imageReload$ = new Subject<void>();
  message = inject(NzMessageService);
  existingImagesCount: number = 0;

  imageGridDataSource = {
    load: () =>
      this.imageReload$.pipe(
        startWith(null as any),
        switchMap(() =>
          this.api.get<any>('common', `${API_ENDPOINTS.PRODUCT.PRODUCT_IMAGES}/${this._id}`).pipe(
            map((res) => res.data ?? []),
            // Use delay(0) to prevent NG0100 error
            delay(0),
            tap((data: any[]) => {
              this.existingImagesCount = data.length;
            }),
          ),
        ),
      ),
  };
  get hasDeletePermission(): boolean {
    return this.permission.allowedActions$().has('view_product_image');
  }

  get hasAddPermission(): boolean {
    return this.permission.allowedActions$().has('add_product_image');
  }

  imageUploadGridDataSource = {
    load: () => of(this.imageListUpload),
  };
  goBack() {
    this.router.navigate(['admin/product/list']);
  }
  onImageAction($event: { actionKey: string; row: any }) {
    const { actionKey, row } = $event;

    if (actionKey === 'view') {
      this.isImageLoading = true;
      this.viewImage(row);
    } else if (actionKey === 'delete') {
      this.showDeleteConfirmation(row);
    }
  }

  showDeleteConfirmation(row: any): void {
    // Guard clause: stop early if it's an existing image and it's the last one
    if (!row.id && this.existingImagesCount === 1) {
      this.message.warning('Atleast one Image should be associated with Product Image');
      return;
    }

    this.popup.confirm({
      nzTitle: 'Are you sure you want to delete this image?',
      nzOkText: 'Yes',
      nzCancelText: 'No',
      nzOkDanger: true,
      nzOnOk: () => {
        if (row.id) {
          this.deleteUploadRow(row.uid);
        } else {
          this.deleteRow(row);
        }
      }
    });
  }
  deleteUploadRow(uid: string): void {
    this.imageListUpload = this.imageListUpload
      .filter((img) => img.uid !== uid)
      .map((img, index) => ({ ...img, id: index + 1 }));

    this.imageUploadReload$.next();
  }
  deleteRow(row: any) {
    if (this.existingImagesCount === 1) {
      this.message.warning('Atleast one Image should be associated with Product Image');
      return;
    }
    let payload = {
      product_code: this._id,
      image_ids: [row.product_image_id],
    };
    this.loader.showGlobal('Deleting Image..');
    this.api.post<any>('common', API_ENDPOINTS.PRODUCT.PRODUCT_DELETE_IMAGE, payload).subscribe({
      next: () => {
        this.imageReload$.next();
        this.loader.hideGlobal();
        this.message.success('Image Deleted');
      },
      error: (err) => {
        console.error('Delete failed', err);
      },
    });
  }

  viewImage(image: ImageItem): void {
    this.isImageLoading = true; 
    this.previewImageUrl = image.image_url ?? image.preview;
    this.previewImageName = image.name;
    this.isImagePreviewVisible = true;
  }

  closeImagePreview(): void {
    this.isImagePreviewVisible = false;
    this.previewImageUrl = '';
    this.previewImageName = '';
    this.isImageLoading = false;
  }
  onImageLoaded(): void {
    this.isImageLoading = false; 
  }

  private readonly MAX_IMAGES = 10;
  // private readonly MIN_IMAGES = 3;
  private readonly MAX_FILE_SIZE_MB = 5;
  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    const remaining = this.MAX_IMAGES - (this.existingImagesCount + this.imageListUpload.length);

    if (remaining <= 0) {
      this.message.warning(
        `Maximum ${this.MAX_IMAGES} images allowed. Already have ${this.existingImagesCount} uploaded and ${this.imageListUpload.length} selected.`
      );
      input.value = '';
      return;
    }

    if (files.length > remaining) {
      this.message.warning(`Only ${remaining} more image(s) can be selected. Total Images should be 10`);
    }

    const filesToAdd = files.slice(0, remaining);

    this.isImageUploading = true;
    this.loader.showGlobal('Compressing and uploading images...');

    try {
      for (const file of filesToAdd) {
        if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
          console.warn(`Invalid file type: ${file.name}`);
          continue;
        }

        if (file.size > this.MAX_FILE_SIZE_MB * 1024 * 1024) {
          console.warn(`File too large: ${file.name} (max ${this.MAX_FILE_SIZE_MB}MB)`);
          continue;
        }

        if (this.imageListUpload.some((img) => img.name === file.name)) {
          console.warn(`Duplicate file: ${file.name}`);
          continue;
        }

        try {
          const { file: compressedFile, preview } = await this.compressImage(file);
          const imageItem: ImageItem = {
            id: this.imageListUpload.length + 1,
            uid: this.generateUid(),
            name: compressedFile.name,
            size: this.formatFileSize(compressedFile.size).toString(),
            file: compressedFile,
            preview: preview,
          };

          this.imageListUpload = [...this.imageListUpload, imageItem];
          this.imageUploadReload$.next();
        } catch (err) {
          console.error(`Failed to compress image: ${file.name}`, err);
        }
      }
    } finally {
      input.value = '';
      this.isImageUploading = false;
      this.loader.hideGlobal();
      this.cdr.detectChanges();
    }
  }

  private compressImage(
    file: File,
    maxWidth: number = 1920,
    maxHeight: number = 1080,
    quality: number = 0.75
  ): Promise<{ file: File; preview: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (readerEvent: ProgressEvent<FileReader>) => {
        const img = new Image();

        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              file,
              preview: readerEvent.target?.result as string,
            });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          const mimeType = file.type === 'image/png' ? 'image/jpeg' : (file.type || 'image/jpeg');

          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                // If compression resulted in larger file or failed, keep original
                resolve({
                  file,
                  preview: readerEvent.target?.result as string,
                });
                return;
              }

              const compressedFile = new File([blob], file.name, {
                type: blob.type || mimeType,
                lastModified: Date.now(),
              });

              const previewUrl = canvas.toDataURL(mimeType, quality);
              resolve({
                file: compressedFile,
                preview: previewUrl,
              });
            },
            mimeType,
            quality
          );
        };

        img.onerror = (err) => reject(err);
        img.src = readerEvent.target?.result as string;
      };

      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private generateUid(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  submit() {
    this.loader.showGlobal('Uploading Image..');
    const payload: FormData = this.buildPayload();
    this.api.post<any>('common', API_ENDPOINTS.PRODUCT.PRODUCT_ADD_IMAGES, payload).subscribe({
      next: () => {
        this.reset();
        this.loader.hideGlobal();
        this.message.success('Product images uploaded successfully');
        this.loader.hideGlobal();
        this.imageUploadReload$.next();
        this.imageReload$.next();
      },
      error: (err) => {
        console.error('Create failed', err);
        this.loader.hideGlobal();
      },
    });
  }
  private buildPayload(): FormData {
    const formData = new FormData();
    const payload = {
      product_code: this._id,
    };
    formData.append('data', JSON.stringify(payload));

    this.imageListUpload.forEach((image, index) => {
      if (image.file) {
        formData.append(`image${index + 1}`, image.file, image.name);
      }
    });

    return formData;
  }
  reset() {
    this.imageListUpload = [];
  }
}

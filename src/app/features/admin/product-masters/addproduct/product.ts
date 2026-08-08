import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Observable, Subject, map, of, finalize } from 'rxjs';

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
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { Router } from '@angular/router';
import { TaxSimulatorComponent } from '../../tax-masters/tax-simulator/tax-simulator.component';

interface ProductPayload {
  product_code?: number;
  name: string;
  sku: string;
  sap_sku_code?: string;      // <-- Added sap_sku_code to interface
  slug: string;
  description: string;
  base_price: number;
  actual_price: number;
  tax_class_id: number;
  category_id: number;
  sub_category_id: number;
  manufacturer_id: number;
  attribute: Record<string, any>;
  is_active: boolean;
  in_stock: boolean;
  stock_quantity: number;
  is_top_selling: boolean;
  is_new_arrival: boolean;
  estimated_delivery_days?: number;
}

interface DropdownOption {
  id: number;
  value: string;
}

interface ItemData {
  key: string;
  value: string[] | string;
}

interface ImageItem {
  id: number;
  uid: string;
  name: string;
  size: string;
  file: File;
  preview: string;
}

@Component({
  selector: 'app-product',
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
    TaxSimulatorComponent,
  ],
  templateUrl: './product.html',
  styleUrl: './product.scss',
})
export class Product implements OnInit {
  private permission = inject(PermissionService);
  private fb = inject(FormBuilder);
  private api = inject(ApiCallService);
  cdr = inject(ChangeDetectorRef);
  message = inject(NzMessageService);
  loader = inject(LoadingService);
  isImageUploading = false;
  private nzModalService = inject(NzModalService);
  editProduct = false;

  form!: FormGroup;

  selectedData: any;
  listOfData: ItemData[] = [];
  imageList: ImageItem[] = [];
  isImagePreviewVisible: boolean = false;
  previewImageUrl: string = '';
  previewImageName: string = '';
  imageReload$ = new Subject<void>();
  imageGridDataSource = {
    load: () => of(this.imageList),
  };

  private readonly MAX_IMAGES = 10;
  private readonly MIN_IMAGES = 3;
  private readonly MAX_FILE_SIZE_MB = 1;

  categoryList: DropdownOption[] = [];
  subCategoryList: DropdownOption[] = [];
  manufacturerList: DropdownOption[] = [];
  validateForm = this.fb.group({
    key: this.fb.control('', [Validators.required]),
    value: this.fb.control('', [Validators.required]),
  });
  attributeReload$ = new Subject<void>();
  router = inject(Router);

  // Tax Simulator
  simulatorForm!: FormGroup;
  showSimulatorModal: boolean = false;
  simulatorResults: any = null;
  simulatorLoading: boolean = false;
  classDropdownList: any[] = [];
  transactionTypeOptions = [
    { label: 'Intra-State', value: 'Intra-State' },
    { label: 'Inter-State', value: 'Inter-State' },
  ];

  ngOnInit(): void {
    this.initForm();
    this.loadDropdowns();
    this.listenToNameChanges();
    const navigation = this.router.currentNavigation();
    const editData = history.state.data;

    if (editData) {
      this.editProduct = true;
      this.fillFormForEdit(editData);
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      sku: ['', [Validators.required]],
      sap_sku_code: [''],                // <-- Added sap_sku_code form control
      slug: [''],
      description: [''],
      base_price: [null, [Validators.required, Validators.min(0)]],
      actual_price: [null, [Validators.required, Validators.min(0)]],
      tax_class_id: [null, [Validators.required]],
      category_id: [null, [Validators.required]],
      sub_category_id: [null, [Validators.required]],
      manufacturer_id: [null, [Validators.required]],
      attributes: [[]],
      is_active: [true],
      in_stock: [true],
      stock_quantity: [0, [Validators.required, Validators.min(0)]],
      is_new_arrival: [true],
      is_top_selling: [true],
      estimated_delivery_days: [0, [Validators.required, Validators.min(1)]],
    });
  }
  i = 0;

  fillFormForEdit(data: any): void {
    console.log(data)
    this.form.patchValue({
      name: data.name,
      sku: data.sku,
      sap_sku_code: data.sap_sku_code,   // <-- Patch sap_sku_code on edit
      slug: data.slug,
      description: data.description,
      base_price: data.base_price,
      actual_price: data.actual_price,
      tax_class_id: data.tax_class_id,
      category_id: data.category_id,
      manufacturer_id: data.manufacturer_id,
      is_active: data.is_active,
      in_stock: data.in_stock,
      stock_quantity: data.stock_quantity,
      is_new_arrival: data.is_new_arrival,
      is_top_selling: data.is_top_selling,
      estimated_delivery_days: data.estimated_delivery_days,
    });

    this.onCategoryChange(data.category_id);
    this.form.get('sub_category_id')?.setValue(data.sub_category_id);

    const attrs = data.attribute || data.attributes;
    if (attrs) {
      const parsedAttrs = typeof attrs === 'string' ? JSON.parse(attrs) : attrs;

      this.listOfData = Object.entries(parsedAttrs).map(([key, value]) => ({
        key: key,
        value: value as string | string[],
      }));

      this.attributeReload$.next();
    }
  }

  goBack() {
    this.router.navigate(['admin/product/list']);
  }

  submitForm(): void {
    const newKey = this.validateForm.value.key as string;
    const newValue = this.validateForm.value.value as string;
    const threshold = 70;

    const finalKey = newKey.toLowerCase().replace(/ /g, '_');
    const finalValue = newValue.includes(',')
      ? newValue
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s)
      : newValue;
    const similarEntry = this.listOfData.find(
      (item) => this.getSimilarity(newKey, item.key) >= threshold,
    );

    if (similarEntry) {
      this.message.warning(
        `The key "${newKey}" is too similar to existing key "${similarEntry.key}". Please choose a different key.`,
      );
      return;
    }
    this.listOfData = [
      ...this.listOfData,
      {
        key: finalKey,
        value: finalValue,
      },
    ];
    this.i++;
    this.attributeReload$.next();
    this.validateForm.reset();
  }
  private getSimilarity(s1: string, s2: string): number {
    const str1 = s1.toLowerCase().replace(/_/g, ' ').trim();
    const str2 = s2.toLowerCase().replace(/_/g, ' ').trim();

    if (str1 === str2) return 100;

    const track = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator,
        );
      }
    }
    const distance = track[str2.length][str1.length];
    return (1 - distance / Math.max(str1.length, str2.length)) * 100;
  }

  onAction($event: { actionKey: string; row: any }) {
    const { actionKey, row } = $event;

    if (actionKey === 'edit') {
      this.editRow(row.Specification);
    } else if (actionKey === 'delete') {
      this.deleteRow(row.Specification);
    }
    this.attributeReload$.next();
  }
  attributeGridDataSource = {
    load: () =>
      of(
        this.listOfData.map((item) => ({
          Specification: item.key,
          Description: item.value,
        })),
      ),
  };

  editRow(key: string): void {
    this.validateForm.controls.key.setValue(key);
    this.validateForm.controls.value.setValue(
      this.listOfData.find((d) => d.key === key)?.value as string,
    );
    this.listOfData = this.listOfData.filter((d) => d.key !== key);
  }

  deleteRow(key: string): void {
    this.listOfData = this.listOfData.filter((d) => d.key !== key);
  }

  private listenToNameChanges(): void {
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
    this.form.get('name')?.valueChanges.subscribe((name: string) => {
      if (name) {
        const generatedSku =
          name
            .toUpperCase()
            .replace(/[AEIOU\s]/g, '')
            .substring(0, 6) +
          '-' +
          Math.floor(1000 + Math.random() * 9000);
        this.form.get('sku')?.setValue(generatedSku, { emitEvent: false });
      }
    });
  }

  loadDropdowns(): void {
    this.loadCategoryDropdown();
    this.loadManufacturerDropdown();
    this.loadClassDropdown();
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

  get hasAddPermission(): boolean {
    return this.permission.allowedActions$().has('add_product');
  }

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('edit_product');
  }

  onCategoryChange(categoryId: number): void {
    // Reset sub category when category changes
    this.form.get('sub_category_id')?.setValue(null);
    this.subCategoryList = [];

    if (categoryId) {
      this.loadSubCategoryDropdown(categoryId);
    }
  }

  update(): void {
    this.loader.showGlobal('Updating product...');
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }
    if (this.form.value.estimated_delivery_days == null || this.form.value.estimated_delivery_days < 1) {
      this.message.warning("Estimated Delivery Days should be greater than or equal to 1")
      this.loader.hideGlobal()
      return;
    }
    if (this.form.value.actual_price < this.form.value.base_price) {
      this.message.warning("Warning: Actual Price should be greater or equal to Base Price")
      this.loader.hideGlobal()
      return;
    }

    const payload = this.buildUpdatePayload();
    this.api.post<any>('common', API_ENDPOINTS.PRODUCT.PRODUCT_UPDATE, payload).subscribe({
      next: () => {
        this.reset();
        this.message.success('Product updated successfully');
        this.loader.hideGlobal();
        this.router.navigate(['admin/product/list']);
      },
      error: (err) => {
        console.error('Update failed', err);
        this.loader.hideGlobal();
      },
    });
  }

  buildUpdatePayload() {
    const payload: ProductPayload = {
      product_code: history.state.data.product_code,
      name: this.form.value.name,
      sku: this.form.value.sku,
      sap_sku_code: this.form.value.sap_sku_code,   // <-- Added sap_sku_code to update payload
      slug: this.form.value.slug,
      description: this.form.value.description,
      base_price: this.form.value.base_price,
      actual_price: this.form.value.actual_price,
      tax_class_id: this.form.value.tax_class_id,
      category_id: this.form.value.category_id,
      sub_category_id: this.form.value.sub_category_id,
      manufacturer_id: this.form.value.manufacturer_id,
      is_active: this.form.value.is_active,
      in_stock: this.form.value.in_stock,
      stock_quantity: this.form.value.stock_quantity,
      attribute: this.buildAttributeObject(),
      is_top_selling: this.form.value.is_top_selling,
      is_new_arrival: this.form.value.is_new_arrival,
      estimated_delivery_days: this.form.value.estimated_delivery_days,
    };
    return payload;
  }

  submit(): void {
    this.loader.showGlobal('Creating product...');
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const payload: FormData = this.buildPayload();

    if (this.form.value.estimated_delivery_days == null || this.form.value.estimated_delivery_days < 1) {
      this.message.warning("Estimated Delivery Days should be greater than or equal to 1")
      this.loader.hideGlobal()
      return;
    }

    if (this.actual_price < this.base_price) {
      this.message.warning("Warning: Actual Price should be greater or equal to Base Price")
      this.loader.hideGlobal()
      return;
    }

    this.api.post<any>('common', API_ENDPOINTS.PRODUCT.PRODUCT_CREATE, payload).subscribe({
      next: () => {
        this.reset();
        this.message.success('Product created successfully');
        this.loader.hideGlobal();
      },
      error: (err) => {
        console.error('Create failed', err);
        this.loader.hideGlobal();
      },
    });
  }

  reset(): void {
    this.form.reset({
      name: '',
      sku: '',
      sap_sku_code: '',             // <-- Reset sap_sku_code
      slug: '',
      description: '',
      base_price: null,
      tax_class_id: null,
      category_id: null,
      sub_category_id: null,
      manufacturer_id: null,
      attributes: [],
      is_active: true,
      in_stock: true,
      stock_quantity: 0,
      estimated_delivery_days: 1,
    });
    this.subCategoryList = [];
    this.imageList = [];
    this.listOfData = [];
  }

  base_price = 0;
  actual_price = 0;
  private buildPayload(): FormData {
    const formData = new FormData();
    const payload: ProductPayload = {
      name: this.form.value.name,
      sku: this.form.value.sku,
      sap_sku_code: this.form.value.sap_sku_code,   // <-- Added sap_sku_code to create payload
      slug: this.form.value.slug,
      description: this.form.value.description,
      base_price: this.form.value.base_price,
      actual_price: this.form.value.actual_price,
      tax_class_id: this.form.value.tax_class_id,
      category_id: this.form.value.category_id,
      sub_category_id: this.form.value.sub_category_id,
      manufacturer_id: this.form.value.manufacturer_id,
      is_active: this.form.value.is_active,
      in_stock: this.form.value.in_stock,
      stock_quantity: this.form.value.stock_quantity,
      attribute: this.buildAttributeObject(),
      is_top_selling: this.form.value.is_top_selling,
      is_new_arrival: this.form.value.is_new_arrival,
      estimated_delivery_days: this.form.value.estimated_delivery_days,
    };
    this.base_price = this.form.value.base_price
    this.actual_price = this.form.value.actual_price

    formData.append('data', JSON.stringify(payload));

    this.imageList.forEach((image, index) => {
      if (image.file) {
        formData.append(`image${index + 1}`, image.file, image.name);
      }
    });

    return formData;
  }

  private buildAttributeObject(): Record<string, any> {
    return this.listOfData.reduce(
      (obj, item) => {
        // Simply assign the value as-is to preserve the array structure
        obj[item.key] = item.value;
        return obj;
      },
      {} as Record<string, any>,
    );
  }
  onImageAction($event: { actionKey: string; row: any }) {
    const { actionKey, row } = $event;

    if (actionKey === 'view') {
      this.viewImage(row);
    } else if (actionKey === 'delete') {
      this.nzModalService.confirm({
        nzTitle: 'Are you sure you want to delete this image?',
        nzOkText: 'Yes',
        nzCancelText: 'No',
        nzOkDanger: true,
        nzOnOk: () => this.deleteImage(row.uid),
      });
    }
    this.imageReload$.next();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    const remaining = this.MAX_IMAGES - this.imageList.length;

    if (remaining <= 0) {
      console.warn(`Maximum ${this.MAX_IMAGES} images allowed.`);
      input.value = '';
      return;
    }

    const filesToAdd = files.slice(0, remaining);

    this.isImageUploading = true;
    this.loader.showGlobal('Uploading images...');

    let processedCount = 0;
    const totalFiles = filesToAdd.length;

    filesToAdd.forEach((file) => {
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        console.warn(`Invalid file type: ${file.name}`);
        processedCount++;
        this.checkLoadingComplete(processedCount, totalFiles);
        return;
      }

      if (file.size > this.MAX_FILE_SIZE_MB * 1024 * 1024) {
        console.warn(`File too large: ${file.name} (max ${this.MAX_FILE_SIZE_MB}MB)`);
        processedCount++;
        this.checkLoadingComplete(processedCount, totalFiles);
        return;
      }

      if (this.imageList.some((img) => img.name === file.name)) {
        console.warn(`Duplicate file: ${file.name}`);
        processedCount++;
        this.checkLoadingComplete(processedCount, totalFiles);
        return;
      }

      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        const imageItem: ImageItem = {
          id: this.imageList.length + 1,
          uid: this.generateUid(),
          name: file.name,
          size: this.formatFileSize(file.size).toString(),
          file: file,
          preview: e.target?.result as string,
        };

        this.imageList = [...this.imageList, imageItem];
        this.imageReload$.next();
      };

      reader.onerror = () => {
        console.error(`Failed to read file: ${file.name}`);
        processedCount++;
        this.checkLoadingComplete(processedCount, totalFiles);
      };

      reader.readAsDataURL(file);
    });
    input.value = '';
    this.loader.hideGlobal();
  }

  private checkLoadingComplete(processed: number, total: number): void {
    if (processed >= total) {
      this.isImageUploading = false;
      this.loader.hideGlobal();
    }
  }

  deleteImage(uid: string): void {
    this.imageList = this.imageList
      .filter((img) => img.uid !== uid)
      .map((img, index) => ({ ...img, id: index + 1 }));

    this.imageReload$.next();
  }

  viewImage(image: ImageItem): void {
    this.previewImageUrl = image.preview;
    this.previewImageName = image.name;
    this.isImagePreviewVisible = true;
  }

  closeImagePreview(): void {
    this.isImagePreviewVisible = false;
    this.previewImageUrl = '';
    this.previewImageName = '';
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

  loadClassDropdown(): void {
    this.api.get<any>('common', API_ENDPOINTS.TAX_MASTER.TAX_CLASS.DROPDOWN_TAX_CLASS).subscribe({
      next: (res) => {
        this.classDropdownList = res.data ?? [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load tax class dropdown', err);
        this.message.error(err.message || 'Failed to load tax class dropdown.');
      },
    });
  }

  openSimulatorModal(): void {
    this.initSimulatorForm();
    const basePrice = this.form.get('base_price')?.value;
    if (basePrice !== null && basePrice !== undefined) {
      this.simulatorForm.patchValue({ entered_price: basePrice });
    }
    const taxClassId = this.form.get('tax_class_id')?.value;
    if (taxClassId) {
      this.simulatorForm.patchValue({ tax_class_id: taxClassId });
    }
    this.simulatorResults = null;
    this.showSimulatorModal = true;
  }

  closeSimulatorModal(): void {
    this.showSimulatorModal = false;
    this.simulatorResults = null;
    if (this.simulatorForm) {
      this.simulatorForm.reset();
    }
  }

  initSimulatorForm(): void {
    this.simulatorForm = this.fb.group({
      entered_price: [null, [Validators.required, Validators.min(0)]],
      tax_class_id: [null, Validators.required],
      transaction_type: ['Intra-State', Validators.required],
      is_inclusive: [true, Validators.required],
    });
  }

  calculateTax(): void {
    if (this.simulatorForm.invalid) {
      this.simulatorForm.markAllAsTouched();
      return;
    }

    this.simulatorLoading = true;

    const payload = {
      entered_price: this.simulatorForm.get('entered_price')?.value,
      tax_class_id: this.simulatorForm.get('tax_class_id')?.value,
      transaction_type: this.simulatorForm.get('transaction_type')?.value,
      is_inclusive: this.simulatorForm.value.is_inclusive,
    };

    this.api
      .post<any>('common', API_ENDPOINTS.TAX_MASTER.TAX_RULES.TAX_SIMULATIOR, payload)
      .pipe(
        finalize(() => {
          this.simulatorLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.simulatorResults = res.data ?? null;
          this.message.success(res.message || 'Tax calculated successfully.');
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Tax calculation failed', err);
          this.message.error(err.message || 'Tax calculation failed. Please try again.');
        },
      });
  }
}

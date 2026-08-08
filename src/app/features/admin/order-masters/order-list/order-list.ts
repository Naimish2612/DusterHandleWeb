import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule, NzCardComponent } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule, NzRowDirective, NzColDirective } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule, NzOptionComponent } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { catchError, map, of, Subject } from 'rxjs';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router } from '@angular/router';

export interface OrderFilterDto {
  from_date?: string;
  to_date?: string;
  order_status?: string;
  payment_status?: string;
  order_no?: string;
}

// ============================================================
// ✅ CUSTOM VALIDATOR — rejects null / empty / whitespace-only
// ============================================================
export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined) {
      return { required: true };
    }
    const trimmed = raw.toString().trim();
    if (trimmed.length === 0) {
      return { whitespace: true, required: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-order-list',
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
    NzDatePickerModule,
    NzSkeletonModule,
    DatePipe,
  ],
  templateUrl: './order-list.html',
  styleUrl: './order-list.scss',
})
export class OrderList implements OnInit {
  form!: FormGroup;
  fb = inject(FormBuilder);
  api = inject(ApiCallService);
  orderPayload: OrderFilterDto = {};
  permission = inject(PermissionService);
  isFilterVisible = false;
  isViewVisible = false;
  orderStatusOptions = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
  paymentStatusOptions = ['Pending', 'Completed', 'Failed', 'Refunded'];
  orderGridReload$ = new Subject<void>();
  message = inject(NzMessageService);
  loader = inject(LoadingService);
  cdr = inject(ChangeDetectorRef);
  router = inject(Router);

  // ===== State for status / invoice modals =====
  selectedRow: any = null;

  showPaymentStatusModal = false;
  paymentStatusForm!: FormGroup;

  showOrderStatusModal = false;
  orderStatusForm!: FormGroup;

  showInvoiceModal = false;
  invoiceForm!: FormGroup;
  selectedInvoiceFile: File | null = null;

  ngOnInit(): void {
    this.initForm();
    this.initPaymentStatusForm();
    this.initOrderStatusForm();
    this.initInvoiceForm();
  }

  // ===== Dynamic actions per row using showIf predicates =====
  rowActions: any[] = [
    {
      key: 'view',
      icon: 'eye',
      tooltip: 'View',
      showIf: (row: any) => this.hasViewPermission,
    },
    {
      key: 'change_payment',
      icon: 'credit-card',
      tooltip: 'Change Payment Status',
      showIf: (row: any) =>
        this.hasPaymentUpdatePermission &&
        row?.payment_status !== 'Completed' &&
        row?.payment_status !== 'Failed',
    },
    {
      key: 'change_order',
      icon: 'dropbox',
      tooltip: 'Change Order Status',
      showIf: (row: any) =>
        this.hasOrderUpdatePermission &&
        row?.order_status !== 'Delivered' &&
        row?.order_status !== 'Cancelled',
    },
    {
      key: 'upload_invoice',
      icon: 'upload',
      tooltip: 'Upload Invoice',
      showIf: (row: any) =>
        this.hasInvoiceUploadPermission && !row?.invoice_file_path,
    },
  ];

  submit() {
    this.orderPayload = {
      from_date: this.form.value?.from_date,
      to_date: this.form.value?.to_date,
      order_status: this.form.value?.order_status,
      payment_status: this.form.value?.payment_status,
      order_no: this.form.value?.order_no,
    };

    this.orderGridReload$.next();
    this.isFilterVisible = false;
    this.reset();
  }

  getOrderStatusBadge(status: string): 'default' | 'processing' | 'success' | 'error' | 'warning' {
    switch (status) {
      case 'Pending':
        return 'warning';
      case 'Processing':
        return 'processing';
      case 'Shipped':
        return 'processing';
      case 'Delivered':
        return 'success';
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  }

  getPaymentStatusBadge(
    status: string,
  ): 'default' | 'processing' | 'success' | 'error' | 'warning' {
    switch (status) {
      case 'Pending':
        return 'warning';
      case 'Completed':
        return 'success';
      case 'Failed':
        return 'error';
      case 'Refunded':
        return 'default';
      default:
        return 'default';
    }
  }

  reset() {
    this.form.reset({
      from_date: null,
      to_date: null,
    });
  }

  // ============================================================
  // PERMISSIONS
  // ============================================================
  get hasViewPermission(): boolean {
    return this.permission.allowedActions$().has('view_order_details');
  }

  get hasOrderUpdatePermission(): boolean {
    return this.permission.allowedActions$().has('update_order_status');
  }

  get hasPaymentUpdatePermission(): boolean {
    return this.permission.allowedActions$().has('update_payment_status');
  }

  get hasInvoiceUploadPermission(): boolean {
    return this.permission.allowedActions$().has('upload_invoice');
  }

  initForm(): void {
    this.form = this.fb.group({
      from_date: null,
      to_date: null,
      order_status: '',
      payment_status: '',
      order_no: '',
    });
  }

  initPaymentStatusForm(): void {
    this.paymentStatusForm = this.fb.group({
      payment_status: [null, [Validators.required]],
    });
  }

  initOrderStatusForm(): void {
    this.orderStatusForm = this.fb.group({
      order_status: [null, [Validators.required]],
      shipment_ack_number: [''],
      shipment_tracking_url: [''],
    });
  }

  initInvoiceForm(): void {
    this.invoiceForm = this.fb.group({
      // ✅ Added noWhitespaceValidator
      invoice_number: ['', [noWhitespaceValidator()]],
    });
  }

  onAction($event: { actionKey: string; row: any }) {
    const { actionKey, row } = $event;
    if (actionKey === 'view') {
      this.orderDetails(row);
    } else if (actionKey === 'change_payment') {
      this.openPaymentStatusModal(row);
    } else if (actionKey === 'change_order') {
      this.openOrderStatusModal(row);
    } else if (actionKey === 'upload_invoice') {
      this.openInvoiceModal(row);
    }
  }

  selectedOrder: any = null;
  order_no = '';
  orderDetails(row: any) {
    this.router.navigate(['admin/order/view'], { queryParams: { order_no: row.order_no } });
  }

  orderGridDataSource = {
    load: () =>
      this.api.post<any>('common', API_ENDPOINTS.ORDER_MASTER.ORDER_LIST, this.orderPayload).pipe(
        map((res: any) => res.data ?? []),
        catchError((err) => {
          return of([]);
        }),
      ),
  };
  closeFilterModal(): void {
    this.isFilterVisible = false;
  }

  openFilterModal() {
    this.isFilterVisible = true;
  }

  // ============================================================
  // ✅ COMMON HELPERS — trim on blur + reactive disabled state
  // ============================================================

  /**
   * Trim the value of a form control on blur — auto-cleans whitespace-only entries.
   */
  onTrimBlur(
    formName: 'orderStatusForm' | 'invoiceForm',
    controlName: string,
  ): void {
    const form = (this as any)[formName] as FormGroup;
    const ctrl = form?.get(controlName);
    if (!ctrl) return;

    const trimmed = (ctrl.value ?? '').toString().trim();
    if (trimmed !== ctrl.value) {
      ctrl.setValue(trimmed);
    }
    ctrl.markAsDirty();
    ctrl.markAsTouched();
    ctrl.updateValueAndValidity();
  }

  /**
   * Reactive check for Order Status modal — button disabled if trimmed shipment values are empty.
   */
  isOrderStatusFormInvalid(): boolean {
    if (!this.orderStatusForm) return true;

    if (this.orderStatusForm.invalid) return true;

    // Extra whitespace check when status is Shipped
    if (this.orderStatusForm.value.order_status === 'Shipped') {
      const ack = (this.orderStatusForm.get('shipment_ack_number')?.value ?? '')
        .toString()
        .trim();
      const url = (this.orderStatusForm.get('shipment_tracking_url')?.value ?? '')
        .toString()
        .trim();
      if (!ack || !url) return true;
    }

    return false;
  }

  /**
   * Reactive check for Invoice modal — disable button if invoice_number is blank / whitespace.
   */
  isInvoiceFormInvalid(): boolean {
    if (!this.invoiceForm) return true;
    const inv = (this.invoiceForm.get('invoice_number')?.value ?? '').toString().trim();
    return !inv || this.invoiceForm.invalid;
  }

  // ============================================================
  // PAYMENT STATUS MODAL
  // ============================================================
  openPaymentStatusModal(row: any): void {
    this.selectedRow = row;
    this.paymentStatusForm.reset({ payment_status: null });
    this.showPaymentStatusModal = true;
  }

  closePaymentStatusModal(): void {
    this.showPaymentStatusModal = false;
    this.paymentStatusForm.reset();
    this.selectedRow = null;
  }

  confirmPaymentStatusUpdate(): void {
    if (this.paymentStatusForm.invalid || !this.selectedRow) {
      Object.values(this.paymentStatusForm.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    this.loader.showGlobal('Updating Payment Status...');
    const payload = {
      order_no: this.selectedRow.order_no,
      payment_status: this.paymentStatusForm.value.payment_status,
    };

    this.api
      .post<any>('common', API_ENDPOINTS.ORDER_MASTER.CHANGE_PAYMENT_STATUS, payload)
      .subscribe({
        next: () => {
          this.message.success('Payment status updated successfully');
          this.closePaymentStatusModal();
          this.orderGridReload$.next();
          this.loader.hideGlobal();
        },
        error: (err) => {
          this.message.error(err?.message || 'Failed to update payment status');
          this.loader.hideGlobal();
        },
      });
  }

  // ============================================================
  // ORDER STATUS MODAL
  // ============================================================
  openOrderStatusModal(row: any): void {
    this.selectedRow = row;
    this.orderStatusForm.reset({
      order_status: null,
      shipment_ack_number: '',
      shipment_tracking_url: '',
    });
    // Reset validators initially (no Shipped selected yet)
    this.clearShipmentValidators();
    this.showOrderStatusModal = true;
  }

  closeOrderStatusModal(): void {
    this.showOrderStatusModal = false;
    this.orderStatusForm.reset();
    this.clearShipmentValidators();
    this.selectedRow = null;
  }

  /**
   * Apply or clear validators on shipment fields based on selected order status.
   */
  onOrderStatusChangeInModal(status: string): void {
    if (status === 'Shipped') {
      this.applyShipmentValidators();
    } else {
      this.clearShipmentValidators();
    }
  }

  private applyShipmentValidators(): void {
    this.orderStatusForm
      .get('shipment_ack_number')
      ?.setValidators([noWhitespaceValidator()]);
    this.orderStatusForm
      .get('shipment_tracking_url')
      ?.setValidators([noWhitespaceValidator(), Validators.pattern(/^https?:\/\/.+/i)]);
    this.orderStatusForm.get('shipment_ack_number')?.updateValueAndValidity();
    this.orderStatusForm.get('shipment_tracking_url')?.updateValueAndValidity();
  }

  private clearShipmentValidators(): void {
    this.orderStatusForm.get('shipment_ack_number')?.clearValidators();
    this.orderStatusForm.get('shipment_tracking_url')?.clearValidators();
    this.orderStatusForm.get('shipment_ack_number')?.updateValueAndValidity();
    this.orderStatusForm.get('shipment_tracking_url')?.updateValueAndValidity();
  }

  confirmOrderStatusUpdate(): void {
    if (!this.selectedRow) return;

    const formValue = this.orderStatusForm.value;

    // ✅ Trim shipment fields if status = Shipped
    if (formValue.order_status === 'Shipped') {
      const ackCtrl = this.orderStatusForm.get('shipment_ack_number');
      const urlCtrl = this.orderStatusForm.get('shipment_tracking_url');

      const ackTrimmed = (ackCtrl?.value ?? '').toString().trim();
      const urlTrimmed = (urlCtrl?.value ?? '').toString().trim();

      ackCtrl?.setValue(ackTrimmed);
      urlCtrl?.setValue(urlTrimmed);

      ackCtrl?.markAsDirty();
      ackCtrl?.markAsTouched();
      urlCtrl?.markAsDirty();
      urlCtrl?.markAsTouched();
      ackCtrl?.updateValueAndValidity();
      urlCtrl?.updateValueAndValidity();

      // ✅ HARD BLOCK — abort if empty after trim
      if (!ackTrimmed) {
        this.message.error('Shipment Acknowledgement Number cannot be empty or blank spaces');
        return;
      }
      if (!urlTrimmed) {
        this.message.error('Shipment Tracking URL cannot be empty or blank spaces');
        return;
      }
    }

    if (this.orderStatusForm.invalid) {
      Object.values(this.orderStatusForm.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });

      // Friendly URL pattern error
      const urlCtrl = this.orderStatusForm.get('shipment_tracking_url');
      if (urlCtrl?.hasError('pattern')) {
        this.message.error('Please enter a valid URL (starting with http:// or https://)');
      }
      return;
    }

    this.loader.showGlobal('Updating Order Status...');
    const payload: any = {
      order_no: this.selectedRow.order_no,
      order_status: formValue.order_status,
    };

    if (formValue.order_status === 'Shipped') {
      const ack = (this.orderStatusForm.value.shipment_ack_number || '').trim();
      const url = (this.orderStatusForm.value.shipment_tracking_url || '').trim();

      // ✅ FINAL safety check
      if (!ack || !url) {
        this.message.error('Shipment details cannot be blank');
        this.loader.hideGlobal();
        return;
      }

      payload.shipment_ack_number = ack;
      payload.shipment_tracking_url = url;
    }

    this.api
      .post<any>('common', API_ENDPOINTS.ORDER_MASTER.CHANGE_ORDER_STATUS, payload)
      .subscribe({
        next: () => {
          this.message.success('Order status updated successfully');
          this.closeOrderStatusModal();
          this.orderGridReload$.next();
          this.loader.hideGlobal();
        },
        error: (err) => {
          this.message.error(err?.message || 'Failed to update order status');
          this.loader.hideGlobal();
        },
      });
  }

  // ============================================================
  // INVOICE UPLOAD MODAL
  // ============================================================
  openInvoiceModal(row: any): void {
    this.selectedRow = row;
    this.invoiceForm.reset({ invoice_number: '' });
    this.selectedInvoiceFile = null;
    this.showInvoiceModal = true;
  }

  closeInvoiceModal(): void {
    this.showInvoiceModal = false;
    this.invoiceForm.reset();
    this.selectedInvoiceFile = null;
    this.selectedRow = null;
  }

  onInvoiceFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    if (input.files.length > 1) {
      this.message.warning('You can upload only one file');
      input.value = '';
      return;
    }

    const file = input.files[0];

    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      this.message.error('Invalid file type. Only PDF is allowed.');
      input.value = '';
      return;
    }

    const maxSizeInMB = 2;
    if (file.size > maxSizeInMB * 1024 * 1024) {
      this.message.error(`File size exceeds the limit of ${maxSizeInMB}MB.`);
      input.value = '';
      return;
    }

    this.selectedInvoiceFile = file;
    input.value = '';
  }

  clearSelectedInvoiceFile(): void {
    this.selectedInvoiceFile = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  confirmInvoiceUpload(): void {
    if (!this.selectedRow) return;

    const invCtrl = this.invoiceForm.get('invoice_number');
    const trimmed = (invCtrl?.value ?? '').toString().trim();

    // ✅ Set trimmed value & mark validation
    invCtrl?.setValue(trimmed);
    invCtrl?.markAsDirty();
    invCtrl?.markAsTouched();
    invCtrl?.updateValueAndValidity();

    // ✅ HARD BLOCK — if trimmed value empty, abort
    if (!trimmed) {
      this.message.error('Invoice Number cannot be empty or blank spaces');
      return;
    }

    if (this.invoiceForm.invalid) {
      Object.values(this.invoiceForm.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    if (!this.selectedInvoiceFile) {
      this.message.warning('Please select an invoice file');
      return;
    }

    this.uploadInvoice(this.selectedInvoiceFile, trimmed);
  }

  /**
   * ✅ Extracted API call with final safety check
   */
  private uploadInvoice(file: File, invoiceNumber: string): void {
    const cleanNumber = (invoiceNumber || '').trim();
    if (!cleanNumber) {
      this.message.error('Invoice Number cannot be blank');
      return;
    }

    this.loader.showGlobal('Uploading Invoice...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('order_code', this.selectedRow.order_no);
    formData.append('invoice_number', cleanNumber);

    this.api.post<any>('common', API_ENDPOINTS.ORDER_MASTER.UPLOAD_INVOICE, formData).subscribe({
      next: () => {
        this.message.success('Invoice uploaded successfully');
        this.closeInvoiceModal();
        this.orderGridReload$.next();
        this.loader.hideGlobal();
      },
      error: (err) => {
        this.message.error(err?.message || 'Failed to upload invoice');
        this.loader.hideGlobal();
        console.error('Upload error:', err);
      },
    });
  }
}
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzFormModule } from 'ng-zorro-antd/form';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import {
  FormsModule,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';

export interface OrderItem {
  order_txn_id: number;
  order_id: number;
  product_code: number;
  product_name: string;
  sku: string;
  description: string;
  qty: number;
  unit_price: number;
  net_amount: number;
  tax_id: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  image_url: string;
}

export interface UserInfo {
  user_name: string;
  email_id: string;
  mobile_no: string;
  shipping_address: string;
  billing_address: string;
}

export interface DeliveryCharge {
  calculation_id: number;
  order_id: number;
  order_no: string;
  delivery_policy_id: number;
  delivery_base_fee: number;
  delivery_tax_amount: number;
  delivery_tax_type: string;
  delivery_discount_amount: number;
  delivery_final_total: number;
  calculation_snapshot: string;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface TaxBreakout {
  order_tax_id: number;
  order_id: number;
  order_no: string;
  order_txn_id: number;
  product_id: number;
  tax_id: number;
  tax_amount: number;
  total_amount: number;
  component_name: string;
  rate: number;
  calculation_type: string;
  calculated_amount: number;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface OrderDetails {
  order_id: number;
  order_no: string;
  order_date: string;
  sub_total: number;
  order_status: string;
  shipping_amount: number;
  marketplace_fee: number;
  net_amount: number;
  payment_method: string;
  payment_status: string;
  cart_details: any | null;
  shipping_address_id: number;
  billing_address_id: number;
  orderItems: OrderItem[];
  userInfo: UserInfo[];
  cart_id: number | null;
  invoice_file_path?: string | null;
  invoice_number?: string | null;
  delivery_charges?: DeliveryCharge[];
  tax_breakout?: TaxBreakout[];
  shipment_ack_number?: string | null;
  shipment_tracking_url?: string | null;
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
  selector: 'app-order-view',
  imports: [
    NzTagModule,
    NzCardModule,
    NzTableModule,
    NzDescriptionsModule,
    NzBadgeModule,
    NzSkeletonModule,
    NzDividerModule,
    NzIconModule,
    NzSelectModule,
    NzFormModule,
    DatePipe,
    CurrencyPipe,
    NzEmptyModule,
    NzListModule,
    NzPageHeaderModule,
    FormsModule,
    ReactiveFormsModule,
    NzButtonModule,
    NzToolTipModule,
    NzModalModule,
    NzInputModule,
  ],
  templateUrl: './order-view.html',
  styleUrl: './order-view.scss',
})
export class OrderView implements OnInit {
  router = inject(Router);
  activatedRoute = inject(ActivatedRoute);
  loader = inject(LoadingService);
  api = inject(ApiCallService);
  message = inject(NzMessageService);
  private fb = inject(FormBuilder);
  order = {} as OrderDetails;
  user = {} as UserInfo;
  permission = inject(PermissionService);
  orderStatusOptions = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
  paymentStatusOptions = ['Pending', 'Completed', 'Failed', 'Refunded'];

  // ===== Shipment tracking modal state =====
  showShipmentModal: boolean = false;
  shipmentForm!: FormGroup;

  // ===== Invoice upload modal state =====
  showInvoiceModal: boolean = false;
  invoiceForm!: FormGroup;
  selectedInvoiceFile: File | null = null;

  selectedPayment: string = '';
  selectedOrderStatus: string = '';

  ngOnInit(): void {
    this.initShipmentForm();
    this.initInvoiceForm();
    this.activatedRoute.queryParams.subscribe((params) => {
      const order_no = params['order_no'];
      this.orderDetails(order_no);
    });
  }

  initShipmentForm(): void {
    this.shipmentForm = this.fb.group({
      shipment_ack_number: ['', [noWhitespaceValidator()]],
      shipment_tracking_url: [
        '',
        [noWhitespaceValidator(), Validators.pattern(/^https?:\/\/.+/i)],
      ],
    });
  }

  initInvoiceForm(): void {
    this.invoiceForm = this.fb.group({
      invoice_number: ['', [noWhitespaceValidator()]],
    });
  }

  orderDetails(order_no: string) {
    this.loader.showGlobal('Loading Order Details...');
    this.api.get<any>('common', `${API_ENDPOINTS.ORDER_MASTER.ORDER_VIEW}/${order_no}`).subscribe({
      next: (data) => {
        this.order = data.data;
        this.user = data.data.userInfo;
        this.loader.hideGlobal();
      },
      error: () => {
        this.message.error('Failed to load order details');
        this.loader.hideGlobal();
      },
    });
  }

  onOrderStatusUpdateClick(status: string) {
    if (!status) {
      this.message.warning('Please select an order status');
      return;
    }
    if (status === 'Shipped') {
      this.openShipmentModal();
      return;
    }
    this.updateOrderStatus(status);
  }

  openShipmentModal(): void {
    this.shipmentForm.reset({
      shipment_ack_number: '',
      shipment_tracking_url: '',
    });
    this.showShipmentModal = true;
  }

  closeShipmentModal(): void {
    this.showShipmentModal = false;
    this.shipmentForm.reset();
  }

  confirmShipment(): void {
    const ackCtrl = this.shipmentForm.get('shipment_ack_number');
    const urlCtrl = this.shipmentForm.get('shipment_tracking_url');

    // ✅ Trim values and set them back
    const ackTrimmed = (ackCtrl?.value ?? '').toString().trim();
    const urlTrimmed = (urlCtrl?.value ?? '').toString().trim();

    ackCtrl?.setValue(ackTrimmed);
    urlCtrl?.setValue(urlTrimmed);

    // ✅ Force validation
    ackCtrl?.markAsDirty();
    ackCtrl?.markAsTouched();
    urlCtrl?.markAsDirty();
    urlCtrl?.markAsTouched();
    ackCtrl?.updateValueAndValidity();
    urlCtrl?.updateValueAndValidity();

    // ✅ HARD BLOCK — if trimmed value is empty, abort completely
    if (!ackTrimmed) {
      this.message.error('Shipment Acknowledgement Number cannot be empty or blank spaces');
      return;
    }
    if (!urlTrimmed) {
      this.message.error('Shipment Tracking URL cannot be empty or blank spaces');
      return;
    }

    // ✅ Form-level check
    if (this.shipmentForm.invalid) {
      if (urlCtrl?.hasError('pattern')) {
        this.message.error('Please enter a valid URL (starting with http:// or https://)');
      }
      return;
    }

    // ✅ Send trimmed payload
    this.updateOrderStatus('Shipped', {
      shipment_ack_number: ackTrimmed,
      shipment_tracking_url: urlTrimmed,
    });
  }

  updateOrderStatus(
    status: string,
    shipmentData?: { shipment_ack_number: string; shipment_tracking_url: string },
  ) {
    this.loader.showGlobal('Updating Order Status...');
    let payload: any = {
      order_no: this.order.order_no,
      order_status: status,
    };

    if (status === 'Shipped' && shipmentData) {
      const ack = (shipmentData.shipment_ack_number || '').trim();
      const url = (shipmentData.shipment_tracking_url || '').trim();

      // ✅ Final safety check — abort if still empty
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
          this.selectedOrderStatus = '';
          this.message.success('Order status updated successfully');
          this.closeShipmentModal();
          this.orderDetails(this.order.order_no);
          this.loader.hideGlobal();
        },
        error: () => {
          this.selectedOrderStatus = '';
          this.message.error('Failed to update order status');
          this.loader.hideGlobal();
        },
      });
  }

  updatePaymentStatus(status: string) {
    this.loader.showGlobal('Updating Payment Status...');
    let payload = {
      order_no: this.order.order_no,
      payment_status: status,
    };
    this.api
      .post<any>('common', API_ENDPOINTS.ORDER_MASTER.CHANGE_PAYMENT_STATUS, payload)
      .subscribe({
        next: () => {
          this.selectedPayment = '';
          this.message.success('Payment status updated successfully');
          this.orderDetails(this.order.order_no);
          this.loader.hideGlobal();
        },
        error: (err) => {
          this.selectedPayment = '';
          this.message.error(err.message);
          this.loader.hideGlobal();
        },
      });
  }

  get hasOrderUpdatePermission(): boolean {
    return this.permission.allowedActions$().has('update_order_status');
  }
  get hasPaymentUpdatePermission(): boolean {
    return this.permission.allowedActions$().has('update_payment_status');
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

  // ============================================================
  // INVOICE UPLOAD MODAL METHODS
  // ============================================================

  openInvoiceModal(): void {
    this.invoiceForm.reset({ invoice_number: '' });
    this.selectedInvoiceFile = null;
    this.showInvoiceModal = true;
  }

  closeInvoiceModal(): void {
    this.showInvoiceModal = false;
    this.invoiceForm.reset();
    this.selectedInvoiceFile = null;
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
    const invCtrl = this.invoiceForm.get('invoice_number');

    // ✅ Trim and set back into form
    const trimmed = (invCtrl?.value ?? '').toString().trim();
    invCtrl?.setValue(trimmed);
    invCtrl?.markAsDirty();
    invCtrl?.markAsTouched();
    invCtrl?.updateValueAndValidity();

    // ✅ HARD BLOCK — if empty after trim, abort
    if (!trimmed) {
      this.message.error('Invoice Number cannot be empty or blank spaces');
      return;
    }

    if (this.invoiceForm.invalid) {
      return;
    }

    if (!this.selectedInvoiceFile) {
      this.message.warning('Please select an invoice file');
      return;
    }

    // ✅ Send trimmed value
    this.uploadInvoice(this.selectedInvoiceFile, trimmed);
  }

  private uploadInvoice(file: File, invoiceNumber: string): void {
    // ✅ FINAL safety check before API call
    const cleanNumber = (invoiceNumber || '').trim();
    if (!cleanNumber) {
      this.message.error('Invoice Number cannot be blank');
      return;
    }

    this.loader.showGlobal('Uploading Invoice...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('order_code', this.order.order_no);
    formData.append('invoice_number', cleanNumber);

    this.api.post<any>('common', API_ENDPOINTS.ORDER_MASTER.UPLOAD_INVOICE, formData).subscribe({
      next: () => {
        this.message.success('Invoice uploaded successfully');
        this.closeInvoiceModal();
        this.orderDetails(this.order.order_no);
        this.loader.hideGlobal();
      },
      error: (err) => {
        this.message.error('Failed to upload invoice');
        this.loader.hideGlobal();
        console.error('Upload error:', err);
      },
    });
  }

  /**
   * @deprecated Kept for backward compatibility - now handled via modal.
   */
  onInvoiceSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    if (input.files.length > 1) {
      this.message.warning('You can upload only one file');
      return;
    }

    const file = input.files[0];

    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      this.message.error('Invalid file type. Only PDF and images (PNG, JPEG) are allowed.');
      input.value = '';
      return;
    }

    const maxSizeInMB = 2;
    if (file.size > maxSizeInMB * 1024 * 1024) {
      this.message.error(`File size exceeds the limit of ${maxSizeInMB}MB.`);
      input.value = '';
      return;
    }

    this.loader.showGlobal('Uploading Invoice...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('order_code', this.order.order_no);
    formData.append('data', JSON.stringify({ order_no: this.order.order_no }));

    this.api.post<any>('common', API_ENDPOINTS.ORDER_MASTER.UPLOAD_INVOICE, formData).subscribe({
      next: () => {
        this.message.success('Invoice uploaded successfully');
        this.orderDetails(this.order.order_no);
        this.loader.hideGlobal();
      },
      error: (err) => {
        this.message.error('Failed to upload invoice');
        this.loader.hideGlobal();
        console.error('Upload error:', err);
      },
    });

    input.value = '';
  }

  downloadInvoice() {
    if (!this.order.invoice_file_path) return;
    window.open(this.order.invoice_file_path, '_blank');
  }

  getTaxBreakout(productCode: number): TaxBreakout[] {
    if (!this.order.tax_breakout) return [];
    return this.order.tax_breakout.filter((t) => t.product_id === productCode);
  }

  // ============================================================
  // ✅ HELPERS: Trim on blur + reactive disabled state
  // ============================================================

  /**
   * Trims a form control value on blur — so "   " becomes ""
   * and validators fire correctly.
   */
  onTrimBlur(formName: 'shipmentForm' | 'invoiceForm', controlName: string): void {
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
   * Reactive check — button stays disabled if trimmed values are empty.
   */
  isShipmentFormInvalid(): boolean {
    const ack = (this.shipmentForm.get('shipment_ack_number')?.value ?? '').toString().trim();
    const url = (this.shipmentForm.get('shipment_tracking_url')?.value ?? '').toString().trim();
    return !ack || !url || this.shipmentForm.invalid;
  }

  isInvoiceFormInvalid(): boolean {
    const inv = (this.invoiceForm.get('invoice_number')?.value ?? '').toString().trim();
    return !inv || this.invoiceForm.invalid;
  }

  goBack() {
    this.router.navigate(['admin/order/list']);
  }
}
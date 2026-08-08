import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NotificationService } from '../../../../core/infrastructure/notification.service';
import { DeliveryPolicySimulatorComponent } from '../delivery-policy-simulator/delivery-policy-simulator.component';
import { NzDividerModule } from 'ng-zorro-antd/divider';

interface DeliveryPolicyPayload {
  delivery_policy_id: number;
  policy_name: string;
  effective_from: string;
  effective_to: string | null;
  calculation_type: string;
  min_charge: number;
  max_charge: number;
  tax_percentage: number;
  is_active: boolean;
}

@Component({
  selector: 'app-add-delivery-policy',
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
    NzIconModule,
    NzDatePickerModule,
    NzModalModule,
    NzTableModule,
    NzDividerModule,
    DeliveryPolicySimulatorComponent,
  ],
  templateUrl: './add-delivery-policy.html',
  styleUrl: './add-delivery-policy.scss',
})
export class AddDeliveryPolicy implements OnInit {
  form!: FormGroup;
  permission = inject(PermissionService);
  router = inject(Router);
  api = inject(ApiCallService);
  cdr = inject(ChangeDetectorRef)
  fb = inject(FormBuilder);
  showAddButton: boolean = true;
  showEditButton: boolean = false;
  loader = inject(LoadingService);
  message = inject(NzMessageService);
  notification = inject(NotificationService)

  calculationTypeOptions = [
    { label: 'Flat Bracket', value: 'FlatBracket' },
    { label: 'Progressive Slab', value: 'ProgressiveSlab' },
  ];

  selectedId: number | null = null;

  // Slab Modal State variables
  showSlabModal: boolean = false;
  slabsList: any[] = [];
  currentPolicyId: number | null = null;
  newSlabRangeStart: number = 0;
  newSlabRangeEnd: number | null = null;
  newSlabPercentage: number | null = null;

  // Simulator State
  showSimulatorModal: boolean = false;
  simulatorForm!: FormGroup;
  simulatorResults: any = null;
  simulatorLoading: boolean = false;

  ngOnInit(): void {
    this.initForm();
    this.checkEditState();
  }

  initForm(): void {
    this.form = this.fb.group({
      policy_name: ['', [Validators.required, Validators.minLength(3)]],
      effective_from: ['', Validators.required],
      effective_to: [null],
      calculation_type: ['FlatBracket', Validators.required],
      min_charge: [null, [Validators.required, Validators.min(1)]],
      max_charge: [null, [Validators.required, Validators.min(1), this.maxChargeValidator.bind(this)]],
      tax_percentage: [null, [Validators.required, Validators.min(1), Validators.max(100)]],
      is_active: [true, Validators.required],
    });

    this.form.get('min_charge')?.valueChanges.subscribe(() => {
      this.form.get('max_charge')?.updateValueAndValidity();
    });
  }

  maxChargeValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.parent) return null;
    const min = control.parent.get('min_charge')?.value;
    const max = control.value;

    if (min !== null && min !== undefined && min !== '' && max !== null && max !== undefined && max !== '') {
      if (Number(max) <= Number(min)) {
        return { maxLessThanMin: true };
      }
    }
    return null;
  }

  checkEditState(): void {
    const editData = history.state.data;
    if (editData) {
      this.selectedId = editData.delivery_policy_id;
      this.form.patchValue({
        policy_name: editData.policy_name,
        effective_from: editData.effective_from ? new Date(editData.effective_from) : null,
        effective_to: editData.effective_to ? new Date(editData.effective_to) : null,
        calculation_type: editData.calculation_type,
        min_charge: editData.min_charge,
        max_charge: editData.max_charge,
        tax_percentage: editData.tax_percentage,
        is_active: editData.is_active,
      });
      this.showAddButton = false;
      this.showEditButton = true;
      this.loadSlabsForSimulator(editData.delivery_policy_id);
    }
  }

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('update_delivery_policy');
  }

  reset() {
    this.form.reset({
      policy_name: '',
      effective_from: '',
      effective_to: null,
      calculation_type: 'FlatBracket',
      min_charge: 0,
      max_charge: 0,
      tax_percentage: 0,
      is_active: true,
    });
    this.showAddButton = true;
    this.showEditButton = false;
    this.selectedId = null;
  }

  goBack() {
    this.router.navigate(['admin/delivery/policy']);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loader.showGlobal('Creating delivery policy...');
    const payload: DeliveryPolicyPayload = {
      delivery_policy_id: 0,
      policy_name: this.form.value.policy_name,
      effective_from: this.formatDateTime(this.form.value.effective_from),
      effective_to: this.form.value.effective_to ? this.formatDateTime(this.form.value.effective_to) : null,
      calculation_type: this.form.value.calculation_type,
      min_charge: this.form.value.min_charge,
      max_charge: this.form.value.max_charge,
      tax_percentage: this.form.value.tax_percentage,
      is_active: this.form.value.is_active,
    };

    this.api
      .post<any>('common', API_ENDPOINTS.DELIVERY_POLICY.CREATE, payload)
      .subscribe({
        next: (res) => {
          this.loader.hideGlobal();
          this.message.success('Delivery policy created successfully');

          // Get policy ID from response. Supports both res.data (number) and res.data.delivery_policy_id
          const createdId = res.data?.delivery_policy_id || res.data;
          if (createdId) {
            this.currentPolicyId = createdId;
            this.slabsList = [];
            this.newSlabRangeStart = 0;
            this.newSlabRangeEnd = null;
            this.newSlabPercentage = null;
            this.showSlabModal = true;
          } else {
            this.goBack();
          }
        },
        error: (err) => {
          this.loader.hideGlobal();
          this.notification.Warning({
            title: 'Timeline is colapsing',
            message: err.raw.error.data || 'Error in creating policy',
            duration: 30
          })
          this.reset()
          console.error('Create failed', err);
        },
      });
  }

  deliveryPolicyUpdate() {
    if (this.form.invalid || this.selectedId === null) {
      this.form.markAllAsTouched();
      return;
    }

    this.loader.showGlobal('Updating delivery policy...');
    const payload: DeliveryPolicyPayload = {
      delivery_policy_id: this.selectedId,
      policy_name: this.form.value.policy_name,
      effective_from: this.formatDateTime(this.form.value.effective_from),
      effective_to: this.form.value.effective_to ? this.formatDateTime(this.form.value.effective_to) : null,
      calculation_type: this.form.value.calculation_type,
      min_charge: this.form.value.min_charge,
      max_charge: this.form.value.max_charge,
      tax_percentage: this.form.value.tax_percentage,
      is_active: this.form.value.is_active,
    };

    this.api
      .post<any>('common', API_ENDPOINTS.DELIVERY_POLICY.UPDATE, payload)
      .subscribe({
        next: () => {
          this.loader.hideGlobal();
          this.message.success('Delivery policy updated successfully');
          this.goBack();
        },
        error: (err) => {
          this.loader.hideGlobal();
          this.message.error(err.raw.error.data || 'Failed to update delivery policy');
          console.error('Update failed', err);
        },
      });
  }

  // Slab management methods
  addSlabRow() {
    if (this.newSlabRangeEnd === null || this.newSlabPercentage === null) {
      this.message.warning('Please enter valid Range End and Slab Percentage');
      return;
    }
    if (this.newSlabRangeEnd <= this.newSlabRangeStart) {
      this.message.warning('Range End must be greater than Range Start');
      return;
    }
    if (this.newSlabPercentage < 0) {
      this.message.warning('Slab Percentage cannot be negative');
      return;
    }
    if (this.newSlabPercentage > 100) {
      this.message.warning('Slab Percentage cannot be greater than 100');
      return;
    }

    this.slabsList = [
      ...this.slabsList,
      {
        delivery_policy_id: this.currentPolicyId,
        range_start: this.newSlabRangeStart,
        range_end: this.newSlabRangeEnd,
        percentage: this.newSlabPercentage,
      },
    ];

    // Compute range start for next slab (previous range_end + 1)
    this.newSlabRangeStart = this.newSlabRangeEnd + 1;
    this.newSlabRangeEnd = null;
    this.newSlabPercentage = null;
  }

  removeSlabRow(index: number) {
    this.slabsList = this.slabsList.filter((_, i) => i !== index);

    // Re-calculate ranges for consistency (Range Start of row i = previous_range_end + 1, or 0 if row 0)
    let nextStart = 0;
    this.slabsList = this.slabsList.map((slab) => {
      const updatedSlab = {
        ...slab,
        range_start: nextStart,
      };
      nextStart = slab.range_end + 1;
      return updatedSlab;
    });

    this.newSlabRangeStart = nextStart;
  }

  submitSlabs() {
    if (this.slabsList.length === 0) {
      this.message.warning('Please add at least one slab before saving');
      return;
    }

    this.loader.showGlobal('Saving delivery slabs...');
    this.api
      .post<any>('common', API_ENDPOINTS.DELIVERY_POLICY.CREATE_SLAB, this.slabsList)
      .subscribe({
        next: () => {
          this.loader.hideGlobal();
          this.message.success('Delivery policy slabs saved successfully');
          this.showSlabModal = false;
          this.goBack();
        },
        error: (err) => {
          this.loader.hideGlobal();
          this.message.error(err.message || 'Failed to save delivery policy slabs');
          console.error('Save slabs failed', err);
        },
      });
  }

  private formatDateTime(value: any): string {
    if (!value) {
      return '';
    }
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      const hours = String(value.getHours()).padStart(2, '0');
      const minutes = String(value.getMinutes()).padStart(2, '0');
      const seconds = String(value.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    return value;
  }

  loadSlabsForSimulator(policyId: number): void {
    this.api
      .get<any>('common', `${API_ENDPOINTS.DELIVERY_POLICY.SLAB_LIST_BY_ID}/${policyId}`)
      .subscribe({
        next: (res) => {
          this.slabsList = res.data || [];
          this.slabsList.sort((a, b) => a.range_start - b.range_start);
        },
        error: (err) => {
          console.error('Failed to load policy slabs for simulator', err);
        }
      });
  }

  initSimulatorForm(): void {
    this.simulatorForm = this.fb.group({
      order_amount: [null, [Validators.required, Validators.min(0)]],
    });
  }

  openSimulatorModal(): void {
    this.initSimulatorForm();
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

  calculateDeliveryCost(): void {
    if (this.simulatorForm.invalid || this.simulatorForm.invalid) {
      this.simulatorForm.markAllAsTouched();
      return;
    }

    this.simulatorLoading = true;
    const orderAmount = this.simulatorForm.get('order_amount')?.value;

    const payload = {
      delivery_policy_id: this.selectedId || 0,
      policy_name: this.form.get('policy_name')?.value || '',
      effective_from: this.form.get('effective_from')?.value ? this.formatDateTime(this.form.get('effective_from')?.value) : null,
      effective_to: this.form.get('effective_to')?.value ? this.formatDateTime(this.form.get('effective_to')?.value) : null,
      calculation_type: this.form.get('calculation_type')?.value,
      min_charge: this.form.get('min_charge')?.value || 0,
      max_charge: this.form.get('max_charge')?.value || 0,
      tax_percentage: this.form.get('tax_percentage')?.value || 0,
      is_active: this.form.get('is_active')?.value ?? true,
      slabs: this.slabsList || []
    };

    this.api
      .post<any>('common', `${API_ENDPOINTS.DELIVERY_POLICY.SIMULATOR}/${orderAmount}`, payload)
      .subscribe({
        next: (res) => {
          this.simulatorLoading = false;
          this.simulatorResults = res.data ?? null;
          this.message.success(res.message || 'Delivery cost simulated successfully.');
          this.cdr.detectChanges()
        },
        error: (err) => {
          this.simulatorLoading = false;
          console.error('Delivery simulation failed', err);
          this.message.error(err.message || 'Delivery cost simulation failed. Please try again.');
          this.cdr.detectChanges()

        },
      });
  }
}

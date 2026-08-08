import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import {
  Validators,
  FormBuilder,
  ReactiveFormsModule,
  FormsModule,
  FormGroup,
} from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { finalize, map, Subject, of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { NotificationService } from '../../../../core/infrastructure/notification.service';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { ResponseEntity } from '../../../../shared/models/response-entity';
import { TaxRuleModel } from '../models/tax-rule.model';
import { TaxSimulatorResponse } from '../models/tax-simulator.model';
import { TaxSimulatorComponent } from '../tax-simulator/tax-simulator.component';

interface GridActionData {
  actionKey: 'edit' | 'delete';
  row: any;
}

@Component({
  selector: 'app-tax-rules',
  standalone: true,
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
    NzDatePickerModule,
    UiGridComponent,
    NzModalModule,
    TaxSimulatorComponent,
  ],
  templateUrl: './tax-rules.html',
  styleUrl: './tax-rules.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxRulesComponent implements OnInit {
  form!: FormGroup;
  gridLoading: boolean = true;
  selectedData: any;
  showAddButton: boolean = true;
  showUpdateButton: boolean = false;

  // Dropdown options
  classDropdownList: any[] = [];
  componentDropdownList: any[] = [];
  transactionTypeOptions = [
    { label: 'Intra-State', value: 'Intra-State' },
    { label: 'Inter-State', value: 'Inter-State' },
  ];
  calculationTypeOptions = [
    { label: 'Percentage', value: 'Percentage' },
    { label: 'FlatAmount', value: 'FlatAmount' },
  ];

  get hasAddPermission(): boolean {
    return this.permission.allowedActions$().has('tax_rule_create');
  }

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('tax_rule_update');
  }

  get hasDeletePermission(): boolean {
    return this.permission.allowedActions$().has('tax_rule_delete');
  }

  private loadingService = inject(LoadingService);
  private api = inject(ApiCallService);
  private message = inject(NzMessageService);
  cdr = inject(ChangeDetectorRef)
  private notification = inject(NotificationService);
  private nzModelService = inject(NzModalService);
  private permission = inject(PermissionService);
  private fb = inject(FormBuilder);

  taxRuleGridReload$ = new Subject<void>();

  // Tax Simulator
  simulatorForm!: FormGroup;
  showSimulatorModal: boolean = false;
  simulatorResults: TaxSimulatorResponse | null = null;
  simulatorLoading: boolean = false;

  ngOnInit(): void {
    this.initForm();
    this.loadClassDropdown();
    this.loadComponentDropdown();
    this.gridLoading = false;

    // Load grid data when class is selected
    this.form.get('class_id')?.valueChanges.subscribe(() => {
      this.loadGridData();
    });
    this.form.get('rate')?.valueChanges.subscribe((value) => {
      this.percentValue(value);
    });
  }
  percentValue(value: any){
    const formValue = this.form.getRawValue()
    if(formValue.calculation_type == "Percentage" && this.form.get('rate')?.value >= 100){
      this.form.get('rate')?.setValue(10);
    }
  }
  initForm(): void {
    this.form = this.fb.group({
      rule_id: [0],
      class_id: ['', Validators.required],
      component_id: ['', Validators.required],
      transaction_type: ['Intra-State', Validators.required],
      calculation_type: ['Percentage', Validators.required],
      rate: ['', [Validators.required, Validators.min(0)]],
      valid_from: ['', Validators.required],
      valid_to: [''],
      is_active: [true, Validators.required],
    });
  }

  loadClassDropdown(): void {
    this.api
      .get<any>(
        'common',
        API_ENDPOINTS.TAX_MASTER.TAX_CLASS.DROPDOWN_TAX_CLASS
      )
      .subscribe({
        next: (res) => {
          this.classDropdownList = res.data ?? [];
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message: err.message || 'Failed to load tax class dropdown.',
          });
        },
      });
  }

  loadComponentDropdown(): void {
    this.api
      .get<any>(
        'common',
        API_ENDPOINTS.TAX_MASTER.TAX_COMPONENTS.DROPDOWN_TAX_COMPONENT
      )
      .subscribe({
        next: (res) => {
          this.componentDropdownList = res.data ?? [];
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message: err.message || 'Failed to load tax component dropdown.',
          });
        },
      });
  }

  submit(): void {
    this.loadingService.showGlobal('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if(this.form.value.calculation_type == "Percentage" && this.form.value.rate >= 100){
      this.message.warning(
        'Warning: If Calculation Type is Percentage then rate can not be more than 100%.',
      );
      this.loadingService.hideGlobal();
      return;
    }


    const payload = {
      rule_id: 0,
      class_id: this.form.get('class_id')?.value,
      component_id: this.form.get('component_id')?.value,
      transaction_type: this.form.get('transaction_type')?.value,
      calculation_type: this.form.get('calculation_type')?.value,
      rate: this.form.get('rate')?.value,
      valid_from: this.formatDateTime(this.form.get('valid_from')?.value),
      valid_to: this.form.get('valid_to')?.value
        ? this.formatDateTime(this.form.get('valid_to')?.value)
        : null,
      is_active: this.form.get('is_active')?.value,
    };

    this.api
      .post<ResponseEntity<TaxRuleModel>>(
        'common',
        API_ENDPOINTS.TAX_MASTER.TAX_RULES.CREATE_TAX_RULE,
        payload
      )
      .pipe(
        finalize(() => {
          this.loadingService.hideGlobal();
        })
      )
      .subscribe({
        next: (res) => {
          this.notification.Success({
            title: '',
            message: res.message || 'Tax Rule created successfully.',
          });
          this.reset();
          this.loadGridData();
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message:
              err.message || 'Tax Rule creation failed. Please try again.',
          });
        },
      });
  }

  taxRuleUpdate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loadingService.showGlobal('');

    const payload = {
      rule_id: this.form.get('rule_id')?.value,
      class_id: this.form.get('class_id')?.value,
      component_id: this.form.get('component_id')?.value,
      transaction_type: this.form.get('transaction_type')?.value,
      calculation_type: this.form.get('calculation_type')?.value,
      rate: this.form.get('rate')?.value,
      valid_from: this.formatDateTime(this.form.get('valid_from')?.value),
      valid_to: this.form.get('valid_to')?.value
        ? this.formatDateTime(this.form.get('valid_to')?.value)
        : null,
      is_active: this.form.get('is_active')?.value,
    };

    this.api
      .post<ResponseEntity<TaxRuleModel>>(
        'common',
        API_ENDPOINTS.TAX_MASTER.TAX_RULES.UPDATE_TAX_RULE,
        payload
      )
      .pipe(
        finalize(() => {
          this.loadingService.hideGlobal();
        })
      )
      .subscribe({
        next: (res) => {
          this.notification.Success({
            title: '',
            message: res.message || 'Tax Rule updated successfully.',
          });
          this.reset();
          this.loadGridData();
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message:
              err.message || 'Tax Rule update failed. Please try again.',
          });
        },
      });
  }

  reset(): void {
    this.form.reset({
      rule_id: 0,
      transaction_type: 'Intra-State',
      calculation_type: 'Percentage',
      is_active: true,
    });
    this.showAddButton = true;
    this.showUpdateButton = false;
  }

  // Selection Change Event from Tax Rule List Grid Checkbox
  selectionChanged($event: any[]): void {
    console.log('Selection Changed Start.');
    console.log(JSON.stringify($event));
    this.selectedData = JSON.stringify($event);
    console.log('Selection Changed End.');
  }

  // Action Event from Tax Rule List Grid
  onAction($event: { actionKey: string; row: any }): void {
    console.log('Action Key: ' + $event.actionKey);
    console.log('Row Data: ' + JSON.stringify($event.row));

    if ($event.actionKey === 'edit') {
      this.setFormData($event.row);
      this.showAddButton = false;
      this.showUpdateButton = true;
    } else if ($event.actionKey === 'delete') {
      let isOkLoading = false;
      this.nzModelService.confirm({
        nzTitle: 'Are you sure you want to delete this tax rule?',
        nzContent: `<b>Rule ID: ${$event.row.rule_id}</b>`,
        nzOkText: 'Yes',
        nzCancelText: 'No',
        nzOkDanger: true,
        nzOkLoading: isOkLoading,
        nzOnOk: () =>
          new Promise((resolve) => {
            isOkLoading = true;
            this.api
              .delete<ResponseEntity<any>>(
                'common',
                API_ENDPOINTS.TAX_MASTER.TAX_RULES.CREATE_TAX_RULE +
                  `/${$event.row.rule_id}`,
                {}
              )
              .pipe(
                finalize(() => {
                  isOkLoading = false;
                  resolve();
                })
              )
              .subscribe({
                next: (res) => {
                  this.notification.Success({
                    title: '',
                    message: res.message || 'Tax Rule deleted successfully.',
                  });
                  this.loadGridData();
                },
                error: (err) => {
                  this.notification.Error({
                    title: 'Error',
                    message:
                      err.message ||
                      'Tax Rule deletion failed. Please try again.',
                  });
                },
              });
          }),
        nzKeyboard: true,
      });
    }
  }

  // Load grid data based on class selection
  loadGridData(): void {
    const classId = this.form.get('class_id')?.value;
    if (!classId) {
      return;
    }
    this.taxRuleGridReload$.next();
  }

  // DataSource for Tax Rule List Grid
  taxRuleGridDataSource = {
    load: () => {
      const classId = this.form.get('class_id')?.value;
      if (!classId) {
        return of([]);
      }
      return this.api
        .post<any>(
          'common',
          API_ENDPOINTS.TAX_MASTER.TAX_RULES.LIST_TAX_RULE,
          { class_id: classId }
        )
        .pipe(map((res) => res.data ?? []));
    },
  };

  setFormData(data: TaxRuleModel): void {
    this.form.patchValue({
      rule_id: data.rule_id,
      class_id: data.class_id,
      component_id: data.component_id,
      transaction_type: data.transaction_type,
      calculation_type: data.calculation_type,
      rate: data.rate,
      valid_from: data.valid_from ? new Date(data.valid_from) : null,
      valid_to: data.valid_to ? new Date(data.valid_to) : null,
      is_active: data.is_active,
    });
  }

  private formatDateTime(value: any): string {
    if (!value) {
      return '';
    }
    // If it's a Date object, format it
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

  // ============== TAX SIMULATOR METHODS ==============

  openSimulatorModal(): void {
    this.initSimulatorForm();
    // prefill from current form values if available
    const classId = this.form.get('class_id')?.value;
    const txType = this.form.get('transaction_type')?.value;
    if (classId) {
      this.simulatorForm.patchValue({ tax_class_id: classId });
    }
    if (txType) {
      this.simulatorForm.patchValue({ transaction_type: txType });
    }
    this.simulatorResults = null;
    this.showSimulatorModal = true;
  }

  closeSimulatorModal(): void {
    this.showSimulatorModal = false;
    this.simulatorResults = null;
    this.simulatorForm.reset();
  }

  initSimulatorForm(): void {
    this.simulatorForm = this.fb.group({
      entered_price: ['', [Validators.required, Validators.min(0)]],
      tax_class_id: ['', Validators.required],
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
      is_inclusive: this.simulatorForm.get('is_inclusive')?.value,
    };

    this.api
      .post<any>(
        'common',
        API_ENDPOINTS.TAX_MASTER.TAX_RULES.TAX_SIMULATIOR,
        payload
      )
      .pipe(
        finalize(() => {
          this.simulatorLoading = false;
        })
      )
      .subscribe({
        next: (res) => {
          this.simulatorResults = res.data ?? null;
          this.notification.Success({
            title: '',
            message: res.message || 'Tax calculated successfully.',
          });
          this.cdr.detectChanges()
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message:
              err.message || 'Tax calculation failed. Please try again.',
          });
        },
      });
  }
}

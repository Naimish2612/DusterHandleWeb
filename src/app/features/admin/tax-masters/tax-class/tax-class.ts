import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
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
import { finalize, map, Subject } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { NotificationService } from '../../../../core/infrastructure/notification.service';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { ResponseEntity } from '../../../../shared/models/response-entity';
import { TaxClassModel } from '../models/tax-class.model';

// Interface for Action Data from Grid
interface GridActionData {
  actionKey: 'edit' | 'delete';
  row: any;
}

@Component({
  selector: 'app-tax-class',
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
    UiGridComponent,
    NzModalModule,
  ],
  templateUrl: './tax-class.html',
  styleUrl: './tax-class.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxClassComponent implements OnInit {
  form!: FormGroup;
  gridLoading: boolean = true;
  selectedData: any;

  showAddButton: boolean = true;
  showUpdateButton: boolean = false;

  get hasAddPermission(): boolean {
    return this.permission.allowedActions$().has('tax_class_create');
  }

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('tax_class_update');
  }

  get hasDeletePermission(): boolean {
    return this.permission.allowedActions$().has('tax_class_delete');
  }

  private loadingService = inject(LoadingService);
  private api = inject(ApiCallService);
  private message = inject(NzMessageService);
  private notification = inject(NotificationService);
  private nzModelService = inject(NzModalService);
  private permission = inject(PermissionService);
  private fb = inject(FormBuilder);

  taxClassGridReload$ = new Subject<void>();

  ngOnInit(): void {
    this.initForm();
    this.gridLoading = false;
  }

  initForm(): void {
    this.form = this.fb.group({
      class_id: [0],
      class_name: ['', [Validators.required, Validators.minLength(2)]],
      is_active: [true, Validators.required],
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loadingService.showGlobal('');

    const payload = {
      class_id: 0,
      class_name: this.form.get('class_name')?.value,
      is_active: this.form.get('is_active')?.value,
    };

    this.api
      .post<ResponseEntity<TaxClassModel>>(
        'common',
        API_ENDPOINTS.TAX_MASTER.TAX_CLASS.CREATE_TAX_CLASS,
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
            message: res.message || 'Tax Class created successfully.',
          });
          this.reset();
          this.taxClassGridReload$.next();
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message:
              err.message || 'Tax Class creation failed. Please try again.',
          });
        },
      });
  }

  taxClassUpdate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loadingService.showGlobal('');

    const payload = {
      class_id: this.form.get('class_id')?.value,
      class_name: this.form.get('class_name')?.value,
      is_active: this.form.get('is_active')?.value,
    };

    this.api
      .post<ResponseEntity<TaxClassModel>>(
        'common',
        API_ENDPOINTS.TAX_MASTER.TAX_CLASS.UPDATE_TAX_CLASS,
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
            message: res.message || 'Tax Class updated successfully.',
          });
          this.reset();
          this.taxClassGridReload$.next();
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message:
              err.message || 'Tax Class update failed. Please try again.',
          });
        },
      });
  }

  reset(): void {
    this.form.reset({ class_id: 0, is_active: true });
    this.showAddButton = true;
    this.showUpdateButton = false;
  }

  // Selection Change Event from Tax Class List Grid Checkbox
  selectionChanged($event: any[]): void {
    console.log('Selection Changed Start.');
    console.log(JSON.stringify($event));
    this.selectedData = JSON.stringify($event);
    console.log('Selection Changed End.');
  }

  // Action Event from Tax Class List Grid
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
        nzTitle: 'Are you sure you want to delete this tax class?',
        nzContent: `<b>Class Name: ${$event.row.class_name}</b>`,
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
                API_ENDPOINTS.TAX_MASTER.TAX_CLASS.CREATE_TAX_CLASS +
                  `/${$event.row.class_id}`,
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
                    message: res.message || 'Tax Class deleted successfully.',
                  });
                  this.taxClassGridReload$.next();
                },
                error: (err) => {
                  this.notification.Error({
                    title: 'Error',
                    message:
                      err.message ||
                      'Tax Class deletion failed. Please try again.',
                  });
                },
              });
          }),
        nzKeyboard: true,
      });
    }
  }

  // DataSource for Tax Class List Grid
  taxClassGridDataSource = {
    load: () =>
      this.api
        .get<any>(
          'common',
          API_ENDPOINTS.TAX_MASTER.TAX_CLASS.LIST_TAX_CLASS
        )
        .pipe(map((res) => res.data ?? [])),
  };

  setFormData(data: TaxClassModel): void {
    this.form.patchValue({
      class_id: data.class_id,
      class_name: data.class_name,
      is_active: data.is_active,
    });
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, map } from 'rxjs';

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
import { NzMessageService } from 'ng-zorro-antd/message';

import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';

interface ImportFieldsPayload {
  import_id?: number;
  process_name: string;
  required_fields: string[];
  non_required_fields: string[];
  max_records_allowed?: number | null;
  is_active: boolean;
}

@Component({
  selector: 'app-import-process',
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
    NzModalModule,
    UiGridComponent,
  ],
  templateUrl: './import-process.html',
  styleUrl: './import-process.scss',
})
export class ImportProcess implements OnInit {
  private permission = inject(PermissionService);
  private fb = inject(FormBuilder);
  private api = inject(ApiCallService);
  private message = inject(NzMessageService);
  private nzModalService = inject(NzModalService);

  form!: FormGroup;
  showUpdateButton: boolean = false;
  importGridReload$ = new Subject<void>();
  showAddButton: boolean = true;
  selectedData: any;

  private selectedId: number | null = null;

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.form = this.fb.group({
      process_name: ['', [Validators.required, Validators.minLength(3)]],
      required_fields: [[], [Validators.required, Validators.minLength(1)]],
      non_required_fields: [[]],
      max_records_allowed: [null, [Validators.min(1)]],
      is_active: [true],
    });
  }

  formatProcessName(): void {
    const control = this.form.get('process_name');
    if (control && control.value) {
      const formatted = control.value.toUpperCase().replace(/\s+/g, '_');
      if (control.value !== formatted) {
        control.setValue(formatted);
      }
    }
  }

  // ─── Permissions ──────────────────────────────────────────────────────────

  get hasAddPermission(): boolean {
    const actions = this.permission.allowedActions$();
    return (
      actions.size === 0 || actions.has('add_import_process') || actions.has('import_fields_write')
    );
  }

  get hasEditPermission(): boolean {
    const actions = this.permission.allowedActions$();
    return (
      actions.size === 0 ||
      actions.has('update_import_process') ||
      actions.has('import_fields_write')
    );
  }

  get hasViewPermission(): boolean {
    const actions = this.permission.allowedActions$();
    return (
      actions.size === 0 || actions.has('import_process_list') || actions.has('import_process_list')
    );
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  submit(): void {
    this.formatProcessName();
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const payload: ImportFieldsPayload = {
      process_name: this.form.value.process_name,
      required_fields: this.form.value.required_fields || [],
      non_required_fields: this.form.value.non_required_fields || [],
      max_records_allowed: this.form.value.max_records_allowed,
      is_active: this.form.value.is_active,
    };

    this.api.post<any>('common', API_ENDPOINTS.IMPORT.CREATE, payload).subscribe({
      next: (res) => {
        if (res.statusCode === 200) {
          this.message.success(res.message || 'Import configuration created successfully');
          this.reset();
          this.importGridReload$.next();
        } else {
          this.message.error(res.message || 'Create failed');
        }
      },
      error: (err) => {
        console.error('Create failed', err);
        this.message.error(err?.error?.message || 'Create failed');
      },
    });
  }

  importUpdate(): void {
    this.formatProcessName();
    if (this.form.invalid || this.selectedId === null) return;

    const payload: ImportFieldsPayload = {
      import_id: this.selectedId,
      process_name: this.form.value.process_name,
      required_fields: this.form.value.required_fields || [],
      non_required_fields: this.form.value.non_required_fields || [],
      max_records_allowed: this.form.value.max_records_allowed,
      is_active: this.form.value.is_active,
    };

    this.api.post<any>('common', API_ENDPOINTS.IMPORT.UPDATE, payload).subscribe({
      next: (res) => {
        if (res.statusCode === 200) {
          this.message.success(res.message || 'Import configuration updated successfully');
          this.reset();
          this.importGridReload$.next();
        } else {
          this.message.error(res.message || 'Update failed');
        }
      },
      error: (err) => {
        console.error('Update failed', err);
        this.reset();
        this.message.error(err?.error?.message || 'Update failed');
      },
    });
  }

  reset(): void {
    this.form.reset({
      process_name: '',
      required_fields: [],
      non_required_fields: [],
      max_records_allowed: null,
      is_active: true,
    });
    this.showUpdateButton = false;
    this.showAddButton = true;
    this.selectedId = null;
  }

  selectionChanged($event: any[]): void {
    this.selectedData = JSON.stringify($event);
  }

  onAction($event: { actionKey: string; row: any }): void {
    const { actionKey, row } = $event;

    if (actionKey === 'edit') {
      this.selectedId = row.import_id;
      this.form.patchValue({
        process_name: row.process_name,
        required_fields: row.required_fields || [],
        non_required_fields: row.non_required_fields || [],
        max_records_allowed: row.max_records_allowed,
        is_active: row.is_active,
      });
      this.showUpdateButton = true;
      this.showAddButton = false;
    }

    if (actionKey === 'delete') {
      this.nzModalService.confirm({
        nzTitle: 'Are you sure you want to delete this process?',
        nzOkText: 'Yes',
        nzCancelText: 'No',
        nzOkDanger: true,
        nzOnOk: () => {
          this.api
            .delete<any>('common', `${API_ENDPOINTS.IMPORT.DELETE}/${row.import_id}`)
            .subscribe({
              next: (res) => {
                if (res.statusCode === 200) {
                  this.message.success(res.message || 'Import configuration deleted successfully');
                  this.importGridReload$.next();
                  if (this.selectedId === row.import_id) {
                    this.reset();
                  }
                } else {
                  this.message.error(res.message || 'Delete failed');
                }
              },
              error: (err) => {
                console.error('Delete failed', err);
                this.message.error(err?.error?.message || 'Delete failed');
              },
            });
        },
      });
    }
  }

  // ─── Grid Data Source ─────────────────────────────────────────────────────

  importGridDataSource = {
    load: () =>
      this.api.get<any>('common', API_ENDPOINTS.IMPORT.LIST).pipe(map((res) => res.data ?? [])),
  };
}

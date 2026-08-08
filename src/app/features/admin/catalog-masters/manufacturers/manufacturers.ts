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
import { NzModalModule } from 'ng-zorro-antd/modal';

import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { NzMessageService } from 'ng-zorro-antd/message';
import { LoadingService } from '../../../../core/infrastructure/loading.service';

interface ManufacturerPayload {
  manufacturer_id?: number;
  name: string;
  website: string;
  support_email: string;
}

@Component({
  selector: 'app-manufacturers',
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
    UiGridComponent
],
  templateUrl: './manufacturers.html',
  styleUrl: './manufacturers.scss',
})
export class Manufacturers implements OnInit {
  private permission = inject(PermissionService);
  private fb = inject(FormBuilder);
  private api = inject(ApiCallService);
  loader = inject(LoadingService)
  message = inject(NzMessageService)

  form!: FormGroup;
  showUpdateButton: boolean = false;
  manufacturerGridReload$ = new Subject<void>();
  showAddButton: boolean = true;
  selectedData: any;

  private selectedId: number | null = null;

  ngOnInit(): void {
    this.initForm();
  }


  initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      website: ['', [
  Validators.pattern(/^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/)
]],
      support_email: ['', [Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
    });
  }

  // ─── Permissions ──────────────────────────────────────────────────────────

  get hasAddPermission(): boolean {
    return this.permission.allowedActions$().has('manufacturer_create');
  }

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('manufacturer_update');
  }
  // ─── Actions ──────────────────────────────────────────────────────────────

  submit(): void {
    this.loader.showGlobal("Creating..")
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const payload: ManufacturerPayload = {
      // manufacturer_id: null,
      name: this.form.value.name,
      website: this.form.value.website,
      support_email: this.form.value.support_email,
    };

    this.api
      .post<any>('common', API_ENDPOINTS.MANUFACTURERS.MANUFACTURERS_CREATE, payload)
      .subscribe({
        next: () => {
          this.reset();
          this.loader.hideGlobal()
          this.manufacturerGridReload$.next();
        },
        error: (err) => {
           this.message.error(err.raw.error.data)
           this.loader.hideGlobal()
        },
      });
  }

  manufacturerUpdate(): void {
    this.loader.showGlobal("Updating..")

    if (this.form.invalid || this.selectedId === null) return;

    const payload: ManufacturerPayload = {
      manufacturer_id: this.selectedId,
      name: this.form.value.name,
      website: this.form.value.website,
      support_email: this.form.value.support_email,
    };

    this.api
      .post<any>('common', `${API_ENDPOINTS.MANUFACTURERS.MANUFACTURERS_UPDATE}`, payload)
      .subscribe({
        next: () => {
          this.reset();
          this.loader.hideGlobal()
          this.manufacturerGridReload$.next();
        },
        error: (err) => {
          this.message.error(err.raw.error.data)
           this.loader.hideGlobal()
        },
      });
  }

  reset(): void {
    this.form.reset();
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
      this.selectedId = row.manufacturer_id;
      this.form.patchValue({
        name: row.name,
        website: row.website,
        support_email: row.support_email,
      });
      this.showUpdateButton = true;
      this.showAddButton = false;
    }

    if (actionKey === 'delete') {
      this.api
        .delete<any>('common', `${API_ENDPOINTS.MANUFACTURERS.MANUFACTURERS_DELETE}/${row.id ?? row.manufacturer_id}`)
        .subscribe({
          next: () => this.manufacturerGridReload$.next(),
          error: (err) => console.error('Delete failed', err),
        });
    }
  }

  // ─── Grid Data Source ─────────────────────────────────────────────────────

  manufacturerGridDataSource = {
    load: () =>
      this.api
        .get<any>('common', API_ENDPOINTS.MANUFACTURERS.MANUFACTURERS_LIST)
        .pipe(map((res) => res.data ?? [])),
  };
}
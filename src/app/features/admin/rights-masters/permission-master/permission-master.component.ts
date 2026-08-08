import { Component, inject, OnInit } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { finalize, map, Subject } from 'rxjs';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { Router } from '@angular/router';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { NotificationService } from '../../../../core/infrastructure/notification.service';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { ResponseEntity } from '../../../../shared/models/response-entity';

@Component({
  selector: 'app-permission-master',
  imports: [CommonModule,
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
    NzModalModule,],
  templateUrl: './permission-master.component.html',
  styleUrl: './permission-master.component.scss',
})
export class PermissionMasterComponent implements OnInit {
  form!: FormGroup;
  gridLoading: boolean = true;
  selectedData: any;

  showAddButton: boolean = true;
  showUpdateButton: boolean = false;

  private loadingService = inject(LoadingService);
  private api = inject(ApiCallService);
  private message = inject(NzMessageService);
  private notification = inject(NotificationService);
  private nzModelService = inject(NzModalService);
  permissionGridReload$ = new Subject<void>();
  private router = inject(Router);
  private permission=inject(PermissionService);

   get hasAddPermission(): boolean {
    return  this.permission.allowedActions$().has('permission_create');
  }

  get hasEditPermission(): boolean {
    return  this.permission.allowedActions$().has('permission_update');
  }

  get hasDeletePermission(): boolean {
    return  this.permission.allowedActions$().has('permission_delete');
  }

  get hasPermissionToActionMap(): boolean {
    return  this.permission.allowedActions$().has('permission_to_action_map');
  }

  ngOnInit(): void {
    this.initForm();
    this.gridLoading = false;
  }

  initForm(): void {
    this.form = this.fb.group({
      permission_code: [0],
      permission_name: ['', [Validators.required, Validators.minLength(3)]],
      is_active: [true, Validators.required],
      is_block: [false, Validators.required],
      permission_description: [''],
    });
  }

  constructor(private fb: FormBuilder) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loadingService.showGlobal('');

    this.api
      .post<null>('common', API_ENDPOINTS.RIGHTS_MASTER.PERMISSION_CREATE, this.form.value)
      .pipe(
        finalize(() => {
          // this runs only after API completes or errors
          this.loadingService.hideGlobal();
        }),
      )
      .subscribe({
        next: (res) => {
          this.notification.Success({
            title: '',
            message: res.message || 'Permission created successfully.',
          });
          this.reset();
          this.permissionGridReload$.next();
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message: err.raw.error.data || 'Permission creation failed. Please try again.',
          });
        },
      });
  }

  roleUpdate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loadingService.showGlobal('');

    this.api
      .post<null>('common', API_ENDPOINTS.RIGHTS_MASTER.PERMISSION_UPDATE, this.form.value)
      .pipe(
        finalize(() => {
          // this runs only after API completes or errors
          this.loadingService.hideGlobal();
        }),
      )
      .subscribe({
        next: (res) => {
          this.notification.Success({
            title: '',
            message: res.message || 'Permission updated successfully.',
          });
          this.reset();
          this.permissionGridReload$.next();
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message: err.raw.error.data || 'Permission update failed. Please try again.',
          });
        },
      });
  }

  reset(): void {
    this.form.reset({ permission_code: 0, is_active: true, is_block: false });
    this.showAddButton = true;
    this.showUpdateButton = false;
  }

  // Selection Change Event from Role List Grid Checkbox
  selectionChanged($event: any[]) {
    console.log('Selection Changed Start.');
    console.log(JSON.stringify($event));
    this.selectedData = JSON.stringify($event);
    console.log('Selection Changed End.');
  }

  // Action Event from Role List Grid
  onAction($event: { actionKey: string; row: any }) {

    if ($event.actionKey === 'edit') {
      this.setFormData($event.row);
      this.showAddButton = false;
      this.showUpdateButton = true;
    } else if ($event.actionKey === 'delete') {
      let isOkLoading = false;
      this.nzModelService.confirm({
        nzTitle: 'Are you sure you want to delete this permission?',
        nzContent: `<b>Permission Name: ${$event.row.permission_name}</b>`,
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
                API_ENDPOINTS.RIGHTS_MASTER.PERMISSION_DELETE + `/${$event.row.permission_code}`,
                {},
              )
              .pipe(
                finalize(() => {
                  isOkLoading = false;
                  resolve();
                }),
              )
              .subscribe({
                next: (res) => {
                  this.notification.Success({
                    title: '',
                    message: res.message || 'Permission deleted successfully.',
                  });
                  this.permissionGridReload$.next();
                },
                error: (err) => {
                  this.notification.Error({
                    title: 'Error',
                    message:
                      err.message || 'Permission deletion failed. Please try again.',
                  });
                },
              });
          }),
        nzKeyboard: true,
      });
    }
    else if ($event.actionKey === 'permission_action') {
      // Handle Permission To Action Mapping logic here
      this.router.navigate(['/admin/permission/action/', $event.row.permission_code]);
    }
  }

  // DataSource for RoleList Grid
  permissionGridDataSource = {
    load: () =>
      this.api
        .get<any>('common', API_ENDPOINTS.RIGHTS_MASTER.PERMISSION_LIST)
        .pipe(map((res) => res.data ?? [])),
  };

  setFormData(data: any): void {
    this.form.patchValue({
      permission_code: data.permission_code,
      permission_name: data.permission_name,
      is_active: data.is_active,
      is_block: data.is_block,
      permission_description: data.permission_description,
    });
  }
}

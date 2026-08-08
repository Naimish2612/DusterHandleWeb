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
import { Router } from '@angular/router';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { NotificationService } from '../../../../core/infrastructure/notification.service';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { ResponseEntity } from '../../../../shared/models/response-entity';


// Interface for Action Data from Grid
interface GridActionData {
  actionKey: 'edit' | 'delete' | 'view';
  row: any;
}

@Component({
  selector: 'app-role-master',
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
  templateUrl: './role-master.component.html',
  styleUrl: './role-master.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleMasterComponent implements OnInit {
  form!: FormGroup;
  gridLoading: boolean = true;
  selectedData: any;

  showAddButton: boolean = true;
  showUpdateButton: boolean = false;

  get hasAddPermission(): boolean {
    return  this.permission.allowedActions$().has('role_create');
  }

  get hasEditPermission(): boolean {
    return  this.permission.allowedActions$().has('role_update');
  }

  get hasDeletePermission(): boolean {
    return  this.permission.allowedActions$().has('role_delete');
  }

  get hasRoleToPermissionMap(): boolean {
    return  this.permission.allowedActions$().has('role_to_permission_map');
  }

  private loadingService = inject(LoadingService);
  private api = inject(ApiCallService);
  private message = inject(NzMessageService);
  private notification = inject(NotificationService);
  private nzModelService = inject(NzModalService);
  roleGridReload$ = new Subject<void>();
  private router = inject(Router);
  private permission = inject(PermissionService);

  // columns = [
  //   { key: 'role_code', title: 'RoleCode', width: '20%' },
  // ];

  ngOnInit(): void {
    this.initForm();
    this.gridLoading = false;
  }

  initForm(): void {
    this.form = this.fb.group({
      role_code: [0],
      role_name: ['', [Validators.required, Validators.minLength(3)]],
      is_active: [true, Validators.required],
      is_block: [false, Validators.required],
      role_description: [''],
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
      .post<null>('common', API_ENDPOINTS.RIGHTS_MASTER.ROLE_CREATE, this.form.value)
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
            message: res.message || 'Role created successfully.',
          });
          this.reset();
          this.roleGridReload$.next();
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message: err.message || 'Role creation failed. Please try again.',
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
      .post<null>('common', API_ENDPOINTS.RIGHTS_MASTER.ROLE_UPDATE, this.form.value)
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
            message: res.message || 'Role updated successfully.',
          });
          this.reset();
          this.roleGridReload$.next();
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message: err.message || 'Role update failed. Please try again.',
          });
        },
      });
  }

  reset(): void {
    this.form.reset({ role_code: 0, is_active: true, is_block: false });
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
    // this.loadingService.showGlobal('');
    // console.log('OnAction From Grid Start.');
    // console.log(JSON.stringify($event));
    // console.log('OnAction From Grid End.');
    // this.loadingService.hideGlobal();

    console.log('Action Key: ' + $event.actionKey);
    console.log('Row Data: ' + JSON.stringify($event.row));

    if ($event.actionKey === 'edit') {
      this.setFormData($event.row);
      this.showAddButton = false;
      this.showUpdateButton = true;
    } else if ($event.actionKey === 'delete') {
      let isOkLoading = false;
      this.nzModelService.confirm({
        nzTitle: 'Are you sure you want to delete this role?',
        nzContent: `<b>Role Name: ${$event.row.role_name}</b>`,
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
                API_ENDPOINTS.RIGHTS_MASTER.ROLE_DELETE + `/${$event.row.role_code}`,
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
                    message: res.message || 'Role deleted successfully.',
                  });
                  this.roleGridReload$.next();
                },
                error: (err) => {
                  this.notification.Error({
                    title: 'Error',
                    message:
                      err.message || 'Role deletion failed. Please try again.',
                  });
                },
              });
          }),
        nzKeyboard: true,
      });
    } else if ($event.actionKey === 'role_permission') {
      // Handle Role to Permission Mapping action
      this.router.navigate(['/admin/role/permission', $event.row.role_code]);
    }
  }

  // DataSource for RoleList Grid
  roleGridDataSource = {
    load: () =>
      this.api
        .get<any>('common', API_ENDPOINTS.RIGHTS_MASTER.ROLE_LIST)
        .pipe(map((res) => res.data ?? [])),
  };

  setFormData(data: any): void {
    this.form.patchValue({
      role_code: data.role_code,
      role_name: data.role_name,
      is_active: data.is_active,
      is_block: data.is_block,
      role_description: data.role_description,
    });
  }
}

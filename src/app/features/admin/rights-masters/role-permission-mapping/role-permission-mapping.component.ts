import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { finalize, map } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { NotificationService } from '../../../../core/infrastructure/notification.service';

@Component({
  selector: 'app-role-permission-mapping',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NzFormModule,
    NzCheckboxModule,
    NzDividerModule,
    NzCardModule,
    NzSpinModule,
    NzIconModule,
    NzButtonModule,
  ],
  standalone: true,
  templateUrl: './role-permission-mapping.component.html',
  styleUrl: './role-permission-mapping.component.scss',
})
export class RolePermissionMappingComponent implements OnInit {
  roleCode!: string;

  permissions: any[] = [];
  PrefilledPermissions: any[] = [];
  selectedPermissions: string[] = [];

  selectAll = false;
  loading = false;

  public route = inject(ActivatedRoute);
  public router = inject(Router);
  public loadingService = inject(LoadingService);
  public api = inject(ApiCallService);
  public notification = inject(NotificationService);
  public message = inject(NzMessageService);
  cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.roleCode = this.route.snapshot.paramMap.get('roleCode')!;
    this.loadPermissionbyRole();
  }
  loadPermissionbyRole(): void {
    this.loading = true;
    this.loadingService.showGlobal('');

    this.api
      .get<any>('common', `${API_ENDPOINTS.RIGHTS_MASTER.PERMISSION_LIST_OF_ROLE}/${this.roleCode}`)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.loadingService.hideGlobal();
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res: any) => {
          this.permissions = res.data || [];

          this.selectedPermissions = this.permissions
            .filter((p) => p.is_checked)
            .map((p) => p.permission_code);

          this.updateSelectAllState();
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message: err.message || 'Failed to load permissions.',
          });
        },
      });
  }

  onPermissionChange(checked: boolean, permission: any): void {
    permission.is_checked = checked;

    if (checked) {
      if (!this.selectedPermissions.includes(permission.permission_code)) {
        this.selectedPermissions.push(permission.permission_code);
      }
    } else {
      this.selectedPermissions = this.selectedPermissions.filter(
        (code) => code !== permission.permission_code,
      );
    }

    this.updateSelectAllState();
  }

  private updateSelectAllState(): void {
    this.selectAll =
      this.permissions.length > 0 && this.selectedPermissions.length === this.permissions.length;
  }

  toggleSelectAll(checked: boolean): void {
    this.selectAll = checked;
    this.permissions.forEach((p) => (p.is_checked = checked));
    this.selectedPermissions = checked ? this.permissions.map((p) => p.permission_code) : [];
  }

  save(): void {
    if (this.selectedPermissions.length === 0) {
      this.message.warning('Please select at least one permission.');
      // this.notification.Warning({
      //   title: 'Validation',
      //   message: 'Please select at least one permission.',
      // });
      return;
    }

    this.loadingService.showGlobal('');

    const payload = {
      role_code: this.roleCode,
      permission_codes: this.selectedPermissions,
    };

    this.api
      .post<null>('common', API_ENDPOINTS.RIGHTS_MASTER.ROLE_PERMISSION_MAPPING, payload)
      .pipe(
        finalize(() => {
          this.loadingService.hideGlobal();
        }),
      )
      .subscribe({
        next: (res) => {
          this.notification.Success({
            title: '',
            message: res.message || 'Role permission mapping successfully.',
          });
          this.router.navigate(['/admin/role/master']);
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message: err.message || 'Role permission mapping failed. Please try again.',
          });
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/admin/role/master']);
  }

  onChange(event: any): void {
    // console.log('Checkbox changed:', event);
  }
}

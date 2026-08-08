import { Component, inject, OnInit } from '@angular/core';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { map, Subject } from 'rxjs';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTypographyModule } from 'ng-zorro-antd/typography';

@Component({
  selector: 'app-userlist',
  imports: [
    UiGridComponent,
    NzCardModule,
    NzIconModule,
    NzDividerModule,
    NzSwitchModule,
    NzFormModule,
    NzSelectModule,
    NzModalModule,
    NzButtonModule,
    NzTypographyModule,
  ],
  templateUrl: './userlist.html',
  styleUrl: './userlist.scss',
})
export class Userlist implements OnInit {
  userGridReload$ = new Subject<void>();
  api = inject(ApiCallService);
  permission = inject(PermissionService);
  message = inject(NzMessageService);
  router = inject(Router);
  private nzModalService = inject(NzModalService)
  gridActions: any[] = [];
  userGridDataSource = {
  load: () =>
    this.api
      .get<any>('common', API_ENDPOINTS.USER_ADMIN.USER_LIST)
      .pipe(
        map((res) => {
          const records = res?.data ?? [];          
          return records.map((user: any) => {
            return {
              ...user,
              birthdate: this.formatStringToPureDate(user.birthdate),
              member_since: this.formatStringToPureDate(user.member_since)
            };
          });
        })
      ),
};

  formatStringToPureDate(dateString: string | null | undefined): string {
  if (!dateString || dateString.startsWith('0001-01-01')) {
    return ''; 
  }

  const d = new Date(dateString);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return dateString;
}
  ngOnInit(): void {
    this.gridActions = [
      {
        key: 'edit',
        icon: 'edit',
        tooltip: 'Edit',
        showIf: this.hasEditPermission,
      },
      {
        key: 'block',
        icon: (row: any) => (row.is_block ? 'play-circle' : 'stop'),
        tooltip: (row: any) => (row.is_block ? 'Unblock User' : 'Block User'),
        showIf: this.hasBlockPermission,
      },
      {
        key: 'remove',
        icon: 'delete',
        tooltip: 'Remove User',
        showIf: this.hasRemovePermission,
      },
    ];
  }
  onAction($event: { actionKey: string; row: any }) {
    const { actionKey, row } = $event;
    if (actionKey === 'remove') {
        this.nzModalService.confirm({
        nzTitle: 'Are you sure you want to remove this user?',
        nzOkText: 'Yes',
        nzCancelText: 'No',
        nzOkDanger: true,
        nzOnOk: () => this.remove(row)
      });
    }

    if (actionKey === 'edit') {
      this.editRow(row);
    }

    if (actionKey === 'block') {
      this.nzModalService.confirm({
      nzTitle: 'Are you sure you want to block/unblock this user?',
      nzOkText: 'Yes',
      nzCancelText: 'No',
      nzOkDanger: true,
      nzOnOk: () => {
        this.block(row);
      }
    });
    }
  }
  editRow(payload: any) {
    this.router.navigate(['admin/add/user'], { state: { data: payload } });
  }
  block(row: any) {
    this.api
      .get<any>('common', `${API_ENDPOINTS.USER_ADMIN.BLOCK_USER}/${row.user_code}`)
      .subscribe({
        next: (res) => {
          this.message.success(res.message);
          this.userGridReload$.next();
        },
        error: (err) => {
          this.message.error('Error');
          console.error('Create failed', err);
        },
      });
  }
  remove(row: any) {
    let payload = {
      user_code: row.user_code,
    };
    this.api.post<any>('common', API_ENDPOINTS.USER_ADMIN.DELETE_USER, payload).subscribe({
      next: () => {
        this.message.success('User Removed Successfully');
        this.userGridReload$.next();
      },
      error: (err) => {
        this.message.error('Error');
        console.error('Create failed', err);
      },
    });
  }
  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('update_user');
  }
  get hasBlockPermission(): boolean {
    return this.permission.allowedActions$().has('block_user');
  }
  get hasRemovePermission(): boolean {
    return this.permission.allowedActions$().has('delete_user');
  }
  refresh() {
    this.userGridReload$.next();
  }
}

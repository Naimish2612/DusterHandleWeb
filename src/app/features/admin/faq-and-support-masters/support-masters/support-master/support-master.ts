import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { UiGridComponent } from '../../../../../shared/ui/ui-grid/ui-grid.component';
import { catchError, map, of, Subject } from 'rxjs';
import { PermissionService } from '../../../../../core/infrastructure/permission.service';
import { API_ENDPOINTS } from '../../../../../core/global-api-endpoints/api-endpoints';
import { ApiCallService } from '../../../../../core/infrastructure/api-call.service';
import { Router } from '@angular/router';

export interface TicketFilterDto {
  from_date?: string | null;
  to_date?: string | null;
  priority?: string | null;
  status?: string | null;
  ticket_no?: string | null;
  order_no?: string | null;
}

@Component({
  selector: 'app-support-master',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzCardModule,
    NzIconModule,
    NzDividerModule,
    NzFormModule,
    NzSelectModule,
    NzModalModule,
    NzButtonModule,
    NzTypographyModule,
    NzDatePickerModule,
    NzInputModule,
    UiGridComponent
  ],
  templateUrl: './support-master.html',
  styleUrl: './support-master.scss',
})
export class SupportMaster implements OnInit {
  gridReload$ = new Subject<void>();
  permission = inject(PermissionService);
  router = inject(Router);
  api = inject(ApiCallService);
  fb = inject(FormBuilder);
  message = inject(NzMessageService);

  isFilterVisible = false;
  form!: FormGroup;
  payload: TicketFilterDto = {};

  gridDataSource = {
    load: () =>
      this.api
        .post<any>('common', API_ENDPOINTS.SUPPORT.TICKET_LIST, this.payload)
        .pipe(
          map((res) => res.data ?? []),
          catchError((err) => {
            this.message.error('Failed to load support tickets');
            console.error('Failed to load tickets', err);
            return of([]);
          })
        ),
  };

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.form = this.fb.group({
      from_date: null,
      to_date: null,
      priority: null,
      status: null,
      ticket_no: null,
      order_no: null,
    });
  }

  openFilterModal() {
    this.isFilterVisible = true;
  }

  closeFilterModal(): void {
    this.isFilterVisible = false;
  }

  get hasViewPermission(): boolean {
    return this.permission.allowedActions$().has('view_ticket');
  }

  reset() {
    this.form.reset({
      from_date: null,
      to_date: null,
      priority: null,
      status: null,
      ticket_no: null,
      order_no: null,
    });
  }

  submit() {
    this.payload = {
      from_date: this.form.value.from_date,
      to_date: this.form.value.to_date,
      priority: this.form.value.priority,
      status: this.form.value.status,
      ticket_no: this.form.value.ticket_no,
      order_no: this.form.value.order_no,
    };

    this.gridReload$.next();
    this.isFilterVisible = false;
    this.reset();
  }

  onAction($event: { actionKey: string; row: any }) {
    const { actionKey, row } = $event;
    if (actionKey === 'eye') {
      this.viewThread(row);
    }
  }

  viewThread(row: any) {
    this.router.navigate(['admin/support/chat'], { state: { ticket: row } });
  }


  refresh() {
    this.gridReload$.next();
  }
}

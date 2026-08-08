import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { Subject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { UiGridComponent } from '../../../../../shared/ui/ui-grid/ui-grid.component';
import { ApiCallService } from '../../../../../core/infrastructure/api-call.service';

@Component({
  selector: 'app-email-queue',
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzDividerModule,
    NzIconModule,
    NzButtonModule,
    NzSelectModule,
    NzFormModule,
    NzTooltipModule,
    UiGridComponent
  ],
  templateUrl: './email-queue.html',
  styleUrl: './email-queue.scss',
})
export class EmailQueue implements OnInit {
  api = inject(ApiCallService);

  selectedStatus = 'Pending';
  emailQueueReload$ = new Subject<void>();

  emailQueueDataSource = {
    load: () =>
      this.api
        .get<any>('common', `api/alert/get/email/queue/list/${this.selectedStatus}`)
        .pipe(
          map((res: any) => res.data ?? []),
          catchError((err) => {
            console.error('Failed to load email queue', err);
            return of([]);
          })
        ),
  };

  ngOnInit(): void {}

  onStatusChange(status: string): void {
    this.selectedStatus = status;
    this.refresh();
  }

  refresh(): void {
    this.emailQueueReload$.next();
  }

  onAction($event: { actionKey: string; row: any }): void {
    // Actions if any
  }
}

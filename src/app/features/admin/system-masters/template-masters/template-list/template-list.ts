import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { UiGridComponent } from '../../../../../shared/ui/ui-grid/ui-grid.component';
import { ApiCallService } from '../../../../../core/infrastructure/api-call.service';
import { PermissionService } from '../../../../../core/infrastructure/permission.service';
import { API_ENDPOINTS } from '../../../../../core/global-api-endpoints/api-endpoints';
import { ReactiveFormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { LoadingService } from '../../../../../core/infrastructure/loading.service';
import { NzMessageService } from 'ng-zorro-antd/message';



@Component({
  selector: 'app-template-list',
  imports: [
    CommonModule,
    NzCardModule,
    NzDividerModule,
    NzIconModule,
    NzButtonModule,
    NzModalModule,
    NzTypographyModule,
    UiGridComponent,
    NzFormModule
  ],
  templateUrl: './template-list.html',
  styleUrl: './template-list.scss',
})
export class TemplateList implements OnInit {
  api = inject(ApiCallService);
  permission = inject(PermissionService);
  router = inject(Router);
  sanitizer = inject(DomSanitizer);
  loader = inject(LoadingService);
  message = inject(NzMessageService);

  isPreviewVisible = false;
  previewBodyHtml: SafeHtml = '';
  previewEventCode = '';

  templateGridDataSource = {
    load: () =>
      this.api
        .get<any>('common', API_ENDPOINTS.TEMPLATE.LIST)
        .pipe(
          map((res: any) => res.data ?? []),
          catchError((err) => {
            console.error('Failed to load templates', err);
            return of([]);
          })
        ),
  };

  templateGridReload$ = new Subject<void>();

  ngOnInit(): void {}

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('update_template');
  }

  get hasAddPermission(): boolean {
    return this.permission.allowedActions$().has('add_template');
  }

  navigateToAdd(): void {
    this.router.navigate(['admin/add/template']);
  }

  onAction($event: { actionKey: string; row: any }): void {
    const { actionKey, row } = $event;
    if (actionKey === 'edit') {
      this.loader.showGlobal('Fetching template details...');
      this.api
        .get<any>('common', `${API_ENDPOINTS.TEMPLATE.GET_BY_ID}/${row.template_id}`)
        .subscribe({
          next: (res: any) => {
            this.loader.hideGlobal();
            this.router.navigate(['admin/add/template'], { state: { data: res.data } });
          },
          error: (err) => {
            console.error('Failed to fetch template details', err);
            this.loader.hideGlobal();
            this.message.error('Failed to fetch template details');
          },
        });
    } else if (actionKey === 'view') {
      this.openPreview(row);
    }
  }

  openPreview(row: any): void {
    this.previewEventCode = row.event_code || '';
    this.previewBodyHtml = this.sanitizer.bypassSecurityTrustHtml(row.body_html || '');
    this.isPreviewVisible = true;
  }

  closePreview(): void {
    this.isPreviewVisible = false;
    this.previewBodyHtml = '';
    this.previewEventCode = '';
  }
}

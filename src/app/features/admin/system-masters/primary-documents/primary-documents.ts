import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, map } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
import { NzMessageService } from 'ng-zorro-antd/message';

import { AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';

import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';

interface PrimaryDocumentPayload {
  document_id?: number;
  document_name: string;
  body_html: string;
  is_active: boolean;
}

@Component({
  selector: 'app-primary-documents',
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
    AngularEditorModule,
    UiGridComponent
  ],
  templateUrl: './primary-documents.html',
  styleUrl: './primary-documents.scss',
})
export class PrimaryDocuments implements OnInit {
  private permission = inject(PermissionService);
  private fb = inject(FormBuilder);
  private api = inject(ApiCallService);
  private loader = inject(LoadingService);
  private message = inject(NzMessageService);
  private sanitizer = inject(DomSanitizer);

  form!: FormGroup;
  showUpdateButton: boolean = false;
  gridReload$ = new Subject<void>();
  showAddButton: boolean = true;
  selectedData: any;

  isPreviewVisible = false;
  previewBodyHtml: SafeHtml = '';
  previewDocName = '';

  private selectedId: number | null = null;
  private cdr = inject(ChangeDetectorRef);

  editorConfig: AngularEditorConfig = {
    editable: true,
    spellcheck: true,
    height: '350px',
    minHeight: '200px',
    maxHeight: 'auto',
    width: 'auto',
    minWidth: '0',
    translate: 'no',
    enableToolbar: true,
    showToolbar: true,
    placeholder: 'Enter document body HTML here...',
    defaultParagraphSeparator: 'p',
    defaultFontName: 'Arial',
    defaultFontSize: '3',
    sanitize: false,
    toolbarPosition: 'top',
  };

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.form = this.fb.group({
      document_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      body_html: ['', [Validators.required]],
      is_active: [true, [Validators.required]],
    });
  }

  // ─── Permissions ──────────────────────────────────────────────────────────

  get hasAddPermission(): boolean {
    const actions = this.permission.allowedActions$();
    return actions.size === 0 || actions.has('add_primary_document') || actions.has('primary_document_write');
  }

  get hasEditPermission(): boolean {
    const actions = this.permission.allowedActions$();
    return actions.size === 0 || actions.has('update_primary_document') || actions.has('primary_document_write');
  }

  get hasViewPermission(): boolean {
    const actions = this.permission.allowedActions$();
    return actions.size === 0 || actions.has('view_primary_documents') || actions.has('primary_document_read');
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  submit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    this.loader.showGlobal('Saving Primary Document...');
    const payload: PrimaryDocumentPayload = {
      document_name: this.form.value.document_name,
      body_html: this.form.value.body_html,
      is_active: !!this.form.value.is_active,
    };

    this.api
      .post<any>('common', API_ENDPOINTS.PRIMARY_DOCUMENTS.CREATE, payload)
      .subscribe({
        next: (res) => {
          this.loader.hideGlobal();
          if (res.statusCode === 200) {
            this.message.success(res.message || 'Primary Document saved successfully');
            this.reset();
            this.gridReload$.next();
          } else {
            this.message.error(res.message || 'Failed to save Primary Document');
          }
        },
        error: (err) => {
          this.loader.hideGlobal();
          console.error('Save failed', err);
          this.message.error(err?.error?.message || 'Failed to save Primary Document');
        },
      });
  }

  update(): void {
    if (this.form.invalid || this.selectedId === null) return;

    this.loader.showGlobal('Updating Primary Document...');
    const payload: PrimaryDocumentPayload = {
      document_id: this.selectedId,
      document_name: this.form.value.document_name,
      body_html: this.form.value.body_html,
      is_active: !!this.form.value.is_active,
    };

    this.api
      .post<any>('common', API_ENDPOINTS.PRIMARY_DOCUMENTS.UPDATE, payload)
      .subscribe({
        next: (res) => {
          this.loader.hideGlobal();
          if (res.statusCode === 200) {
            this.message.success(res.message || 'Primary Document updated successfully');
            this.reset();
            this.gridReload$.next();
          } else {
            this.message.error(res.message || 'Failed to update Primary Document');
          }
        },
        error: (err) => {
          this.loader.hideGlobal();
          console.error('Update failed', err);
          this.message.error(err?.error?.message || 'Failed to update Primary Document');
        },
      });
  }

  // reset(): void {
  //   this.form.reset({
  //     document_name: '',
  //     body_html: '',
  //     is_active: true,
  //   });
  //   this.showUpdateButton = false;
  //   this.showAddButton = true;
  //   this.selectedId = null;
  // }

  editorVisible: boolean = true;

  reset(): void {
    // Step 1: Hide editor to safely destroy it
    this.editorVisible = false;
    this.cdr.detectChanges();

    // Step 2: Reset form values
    this.form.reset({
      document_name: '',
      body_html: '',
      is_active: true,
    });

    this.showUpdateButton = false;
    this.showAddButton = true;
    this.selectedId = null;

    // Step 3: Re-render editor after DOM settles
    setTimeout(() => {
      this.editorVisible = true;
      this.cdr.detectChanges();
    }, 50);
  }

  selectionChanged($event: any[]): void {
    this.selectedData = JSON.stringify($event);
  }

  // onAction($event: { actionKey: string; row: any }): void {
  //   const { actionKey, row } = $event;

  //   if (actionKey === 'edit') {
  //     const docId = row.document_id;
  //     this.loader.showGlobal('Fetching document details...');
  //     this.api
  //       .get<any>('common', `${API_ENDPOINTS.PRIMARY_DOCUMENTS.GET_BY_ID}/${docId}`)
  //       .subscribe({
  //         next: (res) => {
  //           this.loader.hideGlobal();
  //           if (res.statusCode === 200 && res.data) {
  //             const doc = res.data;
  //             this.selectedId = doc.document_id;
  //             this.form.patchValue({
  //               document_name: doc.document_name,
  //               body_html: doc.body_html || '',
  //               is_active: doc.is_active ?? true,
  //             });
  //             this.showUpdateButton = true;
  //             this.showAddButton = false;
  //           } else {
  //             this.message.error(res.message || 'Failed to fetch document details');
  //           }
  //         },
  //         error: (err) => {
  //           this.loader.hideGlobal();
  //           console.error('Fetch failed', err);
  //           this.message.error('Failed to fetch document details');
  //         }
  //       });
  //   } else if (actionKey === 'preview') {
  //     this.openPreview(row);
  //   }
  // }

  onAction($event: { actionKey: string; row: any }): void {
    const { actionKey, row } = $event;

    if (actionKey === 'edit') {
      const docId = row.document_id;

      // Hide editor before patching to avoid focus error
      this.editorVisible = false;
      this.cdr.detectChanges();

      this.loader.showGlobal('Fetching document details...');
      this.api
        .get<any>('common', `${API_ENDPOINTS.PRIMARY_DOCUMENTS.GET_BY_ID}/${docId}`)
        .subscribe({
          next: (res) => {
            this.loader.hideGlobal();
            if (res.statusCode === 200 && res.data) {
              const doc = res.data;
              this.selectedId = doc.document_id;

              this.form.patchValue({
                document_name: doc.document_name,
                body_html: doc.body_html || '',
                is_active: doc.is_active ?? true,
              });

              this.showUpdateButton = true;
              this.showAddButton = false;

              // Re-show editor after patch with settled DOM
              setTimeout(() => {
                this.editorVisible = true;
                this.cdr.detectChanges();
              }, 50);

            } else {
              this.editorVisible = true; // restore on error
              this.message.error(res.message || 'Failed to fetch document details');
            }
          },
          error: (err) => {
            this.loader.hideGlobal();
            this.editorVisible = true; // restore on error
            console.error('Fetch failed', err);
            this.message.error('Failed to fetch document details');
          }
        });

    } else if (actionKey === 'preview') {
      this.openPreview(row);
    }
  }


  openPreview(row: any): void {
    this.previewDocName = row.document_name || '';
    this.previewBodyHtml = this.sanitizer.bypassSecurityTrustHtml(row.body_html || '');
    this.isPreviewVisible = true;
  }

  closePreview(): void {
    this.isPreviewVisible = false;
    this.previewBodyHtml = '';
    this.previewDocName = '';
  }

  formatDocumentName(): void {
    const control = this.form.get('document_name');
    if (control && control.value) {
      const value = control.value.trim();
      if (!value) return;

      const formatted = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      control.setValue(formatted);
    }
  }

  // ─── Grid Data Source ─────────────────────────────────────────────────────

  gridDataSource = {
    load: () =>
      this.api
        .get<any>('common', API_ENDPOINTS.PRIMARY_DOCUMENTS.LIST)
        .pipe(map((res) => res.data ?? [])),
  };
}

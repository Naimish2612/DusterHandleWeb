import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiCallService } from '../../../core/infrastructure/api-call.service';
import { API_ENDPOINTS } from '../../../core/global-api-endpoints/api-endpoints';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzTransferModule, TransferItem } from 'ng-zorro-antd/transfer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import * as XLSX from 'xlsx';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { environment } from '../../../../environments/environment';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { LoadingService } from '../../../core/infrastructure/loading.service';

interface CustomTransferItem extends TransferItem {
  isRequired?: boolean;
}

@Component({
  selector: 'app-import-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzStepsModule,
    NzTransferModule,
    NzButtonModule,
    NzIconModule,
    NzUploadModule,
    NzTableModule,
    NzAlertModule,
    NzCardModule,
    NzTagModule,
    NzDividerModule,
    NzTabsModule,
    NzSpinModule,
    NzToolTipModule,
    NzDrawerModule,
    NzFormModule,
    NzCollapseModule,
    NzBadgeModule
  ],
  templateUrl: './import-component.html',
  styleUrl: './import-component.scss',
})
export class ImportComponent implements OnInit {
  currentStep = 0;
  importName = '';
  drawerVisible = false;
  loadingJobs = false;
  groupedJobs: { [key: string]: any[] } = {};
  statusKeys = ['Queued', 'Processing', 'Completed', 'CompletedWithErrors', 'Failed'];
  loadingFields = false;
  importingRecords = false;
  returnUrl = '';
  returnText = '';
  maxRecordsAllowed = 0;

  get formattedImportName(): string {
    if (!this.importName) return 'Data';
    const cleanName = this.importName.replace(/_import$/i, '');
    const title = this.formatFieldTitle(cleanName);
    return title;
  }

  get backUrl(): string {
    if (this.returnUrl) return this.returnUrl;
    return '/admin/home';
  }

  get backText(): string {
    if (this.returnText) return this.returnText;
    return 'Back to Dashboard';
  }

  // Transfer List Data
  list: CustomTransferItem[] = [];

  // Dummy import data passed from parent component
  dummyDataState: any[] = [];

  // Uploaded and processed records
  previewData: any[] = [];
  validPreviewData: any[] = [];
  invalidPreviewData: any[] = [];
  activeTab = 0;

  get filteredPreviewData(): any[] {
    if (this.activeTab === 1) {
      return this.validPreviewData;
    }
    if (this.activeTab === 2) {
      return this.invalidPreviewData;
    }
    return this.previewData;
  }

  // File upload variables
  fileList: any[] = [];
  uploadedFile: File | null = null;

  private api = inject(ApiCallService);
  private message = inject(NzMessageService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  loader = inject(LoadingService)

  ngOnInit(): void {
    // Extract history state from router navigation
    const state = window.history.state;
    if (state && state.process_name) {
      this.importName = state.process_name;
      this.dummyDataState = state.dummyData || [];
      this.returnUrl = state.returnUrl || '';
      this.returnText = state.returnText || '';
    }

    this.fetchFields();
  }

  fetchFields(): void {
    this.loader.showGlobal("Fetching fields..")
    this.loadingFields = true;
    this.api
      .get<any>('common', `${API_ENDPOINTS.IMPORT.GET_FIELDS}/${this.importName}`)
      .subscribe({
        next: (res) => {
          this.loadingFields = false;
          const data = res?.data;

          if (data) {
            this.maxRecordsAllowed = data.max_records_allowed || data.maxRecordsAllowed || data.MaxRecordsAllowed || 0;
          }

          if (!data) {
            console.error('No data object in API response.');
            this.message.error('Failed to load import fields configuration from server.');
            this.cdr.detectChanges();
            return;
          }

          // Support snake_case, camelCase, and PascalCase from API response properties
          const required = data.required_fields || data.requiredFields || data.RequiredFields || data.Required_fields;
          const nonRequired = data.non_required_fields || data.nonRequiredFields || data.NonRequiredFields || data.Non_required_fields;
          
          if (!required || !Array.isArray(required)) {
            console.error('No required fields array found in API response data.', data);
            this.message.error('Invalid fields configuration format from server.');
            this.cdr.detectChanges();
            return;
          }
          
          const tempList: CustomTransferItem[] = [];
          
          required.forEach((field: string) => {
            tempList.push({
              key: field,
              title: this.formatFieldTitle(field),
              direction: 'right',
              disabled: true,
              isRequired: true,
            });
          });

          if (nonRequired && Array.isArray(nonRequired)) {
            nonRequired.forEach((field: string) => {
              tempList.push({
                key: field,
                title: this.formatFieldTitle(field),
                direction: 'left',
                disabled: false,
                isRequired: false,
              });
            });
          }
          
          this.list = tempList;
          this.loader.hideGlobal()
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loadingFields = false;
          console.error('API error fetching fields configuration:', err);
          this.message.error('Failed to load fields configuration from server.');
          this.loader.hideGlobal()
          this.cdr.detectChanges();
        },
      });
  }

  formatFieldTitle(field: string): string {
    if (!field) return '';
    return field
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private normalizeString(str: string): string {
    return str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  }

  downloadSample(): void {
    const selectedItems = this.list.filter((item) => item['direction'] === 'right');

    if (selectedItems.length === 0) {
      this.message.warning('Please select at least one field for import.');
      return;
    }

    const rows: Record<string, any>[] = [];

    if (this.dummyDataState && this.dummyDataState.length > 0) {
      this.dummyDataState.forEach((row) => {
        const excelRow: Record<string, any> = {};
        selectedItems.forEach((item) => {
          const header = item['title'] || this.formatFieldTitle(item['key']);
          excelRow[header] = row[item['key']] !== undefined && row[item['key']] !== null ? row[item['key']] : '';
        });
        rows.push(excelRow);
      });
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Template');
    XLSX.writeFile(wb, `${this.importName}_template.xlsx`);
    this.message.success('Sample Excel file template downloaded.');
  }

  goToNextStep(): void {
    if (this.currentStep === 0) {
      this.currentStep = 1;
    }
  }

  goToPreviousStep(): void {
    if (this.currentStep === 1) {
      this.currentStep = 0;
      this.previewData = [];
      this.validPreviewData = [];
      this.invalidPreviewData = [];
      this.fileList = [];
      this.uploadedFile = null;
    }
  }

  handleFileUpload = (file: any): boolean => {
    this.loader.showGlobal("Reading file..")
    const rawFile = file.originFileObj || file;
    if (!rawFile) {
      this.message.error('No valid file object found.');
      return false;
    }
    this.uploadedFile = rawFile;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          this.message.error('The uploaded file contains no data.');
          return;
        }

        if (this.maxRecordsAllowed > 0 && jsonData.length > this.maxRecordsAllowed) {
          this.message.error(`Upload limit exceeded. Maximum allowed records is ${this.maxRecordsAllowed}, but this file has ${jsonData.length} records.`);
          this.resetUploader();
          return;
        }

        this.processUploadedData(jsonData);
        this.message.success(`Parsed ${jsonData.length} records from file.`);
        this.loader.hideGlobal()
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        this.loader.hideGlobal()
        this.message.error('Failed to parse Excel file. Please ensure it is a valid Excel document.');
      }
    };
    reader.readAsArrayBuffer(rawFile);
    return false; // Prevent automatic upload post
  };
  processUploadedData(data: any[]): void {
    const selectedFields = this.list
      .filter((item) => item['direction'] === 'right')
      .map((item) => item['key']);

    const requiredFields = this.list
      .filter((item) => item.isRequired)
      .map((item) => item['key']);

    const processed: any[] = [];

    // Create a mapping of normalized header -> original field key
    const headerMapping: Record<string, string> = {};
    this.list.forEach((field) => {
      const normKey = this.normalizeString(field['key']);
      const normTitle = this.normalizeString(field['title'] || '');
      if (normKey) headerMapping[normKey] = field['key'];
      if (normTitle) headerMapping[normTitle] = field['key'];
    });

    data.forEach((row, index) => {
      // Map row keys to configured field keys using normalized match
      const mappedRow: Record<string, any> = {};
      Object.keys(row).forEach((excelHeader) => {
        const normHeader = this.normalizeString(excelHeader);
        const targetKey = headerMapping[normHeader];
        if (targetKey) {
          mappedRow[targetKey] = row[excelHeader];
        } else {
          // Keep original key if no match, just in case
          mappedRow[excelHeader] = row[excelHeader];
        }
      });

      const errors: string[] = [];

      // 1. Check required fields presence
      requiredFields.forEach((field) => {
        const val = mappedRow[field];
        if (val === undefined || val === null || String(val).trim() === '') {
          errors.push(`${this.formatFieldTitle(field)} is required`);
        }
      });

      processed.push({
        ...mappedRow,
        rowNumber: index + 1,
        isValid: errors.length === 0,
        errors: errors,
      });
    });

    this.previewData = processed;
    this.updateValidInvalidSubsets();
  }

  updateValidInvalidSubsets(): void {
    this.validPreviewData = this.previewData.filter((row) => row.isValid);
    this.invalidPreviewData = this.previewData.filter((row) => !row.isValid);
  }

  getCellError(row: any, colKey: string): string | null {
    if (row.isValid) return null;
    const item = this.list.find((i) => i['key'] === colKey);
    if (item && item.isRequired) {
      const val = row[colKey];
      if (val === undefined || val === null || String(val).trim() === '') {
        return `${item['title'] || this.formatFieldTitle(colKey)} is required`;
      }
    }
    return null;
  }

  get previewColumns(): { key: string; title: string; isRequired: boolean }[] {
    return this.list
      .filter((item) => item['direction'] === 'right')
      .map((item) => ({
        key: item['key'],
        title: item['title'] || '',
        isRequired: !!item['isRequired']
      }));
  }

  submitImport(): void {
    this.loader.showGlobal("Importing file...")
    if (this.previewData.length === 0) {
      this.message.warning('No records to import.');
      return;
    }

    if (this.invalidPreviewData.length > 0) {
      this.message.error('Please resolve all validation errors before importing.');
      return;
    }

    if (this.maxRecordsAllowed > 0 && this.previewData.length > this.maxRecordsAllowed) {
      this.message.error(`You cannot import more than ${this.maxRecordsAllowed} records at a time.`);
      return;
    }

    if (!this.uploadedFile) {
      this.message.error('No file selected for upload.');
      return;
    }

    this.importingRecords = true;

    const formData = new FormData();
    formData.append('file', this.uploadedFile);
    formData.append('process_name', this.importName);

    this.api
      .upload<any>('common', API_ENDPOINTS.IMPORT.FILE_UPLOAD, formData)
      .subscribe({
        next: (res) => {
          this.importingRecords = false;
          this.loader.hideGlobal()
          this.message.success('Successfully uploaded file and queued import job.');
          this.router.navigate([this.backUrl]);
        },
        error: (err) => {
          this.importingRecords = false;
          this.loader.hideGlobal()
          this.message.error(err?.message || 'Failed to upload and import the file.');
          console.error('Import upload failed:', err);
        },
      });
  }

  openStatusDrawer(): void {
    this.drawerVisible = true;
    this.fetchJobs();
  }

  closeStatusDrawer(): void {
    this.drawerVisible = false;
  }

  fetchJobs(): void {
    this.loader.showGlobal("Loading jobs..")
    this.loadingJobs = true;
    this.api.get<any>('common', API_ENDPOINTS.IMPORT.ALL_JOBS).subscribe({
      next: (res) => {
        this.loadingJobs = false;
        this.groupedJobs = res?.data || {};
        this.loader.hideGlobal()
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingJobs = false;
        console.error('Failed to fetch job statuses:', err);
        this.loader.hideGlobal()
        this.message.error('Failed to load import job history.');
        this.cdr.detectChanges();
      }
    });
  }

  fetchJobStatus(jobId: number): void {
    this.api.get<any>('common', `${API_ENDPOINTS.IMPORT.FILE_STATUS}/${jobId}`).subscribe({
      next: (res) => {
        const updatedJob = res?.data;
        if (updatedJob) {
          this.fetchJobs();
        }
      },
      error: (err) => {
        console.error(`Failed to fetch status for job ${jobId}:`, err);
      }
    });
  }

  getJobsByStatus(status: string): any[] {
    return this.groupedJobs[status] || [];
  }

  formatStatusLabel(status: string): string {
    if (!status) return '';
    return status.replace(/([A-Z])/g, ' $1').trim();
  }

  getDownloadUrl(filePath: string): string {
    if (!filePath) return '';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    const base = environment.apiBaseUrls.common;
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const cleanPath = filePath.startsWith('/') ? filePath : '/' + filePath;
    return `${cleanBase}${cleanPath}`;
  }

  getBadgeColor(status: string): string {
    switch (status) {
      case 'Queued': return '#faad14'; // Yellow
      case 'Processing': return '#fa8c16'; // Orange
      case 'Completed': return '#52c41a'; // Green
      case 'CompletedWithErrors': return '#1890ff'; // Blue
      case 'Failed': return '#ff4d4f'; // Red
      default: return '#8c8c8c';
    }
  }

  resetUploader(): void {
    this.previewData = [];
    this.validPreviewData = [];
    this.invalidPreviewData = [];
    this.fileList = [];
    this.uploadedFile = null;
    this.cdr.detectChanges();
  }
}

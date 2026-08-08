import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';
import { API_ENDPOINTS } from '../../../../../core/global-api-endpoints/api-endpoints';
import { ApiCallService } from '../../../../../core/infrastructure/api-call.service';
import { Router } from '@angular/router';
import { catchError, finalize, map, of } from 'rxjs';
import { LoadingService } from '../../../../../core/infrastructure/loading.service';
import { PermissionService } from '../../../../../core/infrastructure/permission.service';

export interface SupportMessageDto {
  message_id: number;
  ticket_id: number;
  sender_type: 'Customer' | 'Support_Agent' | 'System_Bot';
  sender_id: string;
  message_text: string;
  created_at?: string;
  upload_attachments: string[];
}

@Component({
  selector: 'app-support-chat',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzCardModule,
    NzIconModule,
    NzDividerModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzSelectModule,
    NzTagModule,
    NzTypographyModule,
    NzSpinModule,
  ],
  templateUrl: './support-chat.html',
  styleUrl: './support-chat.scss',
})
export class SupportChat implements OnInit {
  router = inject(Router);
  api = inject(ApiCallService);
  loader = inject(LoadingService);
  message = inject(NzMessageService);
  permission = inject(PermissionService)

  ticket: any = null;
  messages: SupportMessageDto[] = [];
  isLoading = false;
  isSending = false;
  isStatusUpdating = false;
  cdr = inject(ChangeDetectorRef);

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('manage_ticket');
  }

  get hasUpdatePermission(): boolean {
    return this.permission.allowedActions$().has('manage_ticket_status');
  }
  replyText = '';
  selectedFiles: File[] = [];

  ngOnInit(): void {
    const stateTicket = history.state.ticket;
    if (stateTicket) {
      this.ticket = stateTicket;
      this.loadThread();
    } else {
      this.message.warning('No ticket selected. Redirecting back...');
      this.goBack();
    }
  }

  loadThread(isSilent = false): void {
    this.loader.showGlobal('Loading Thread..');
    if (!this.ticket) return;
    if (!isSilent && this.messages.length === 0) {
      this.isLoading = true;
    }

    this.api
      .get<any>('common', `${API_ENDPOINTS.SUPPORT.TICKET_THREAD}/${this.ticket.ticket_id}`)
      .pipe(
        map((res) => res.data ?? []),
        catchError((err) => {
          this.message.error('Failed to load ticket thread');
          console.error('Failed to load thread', err);
          this.loader.hideGlobal();
          this.isLoading = false;
          return of([]);
        }),
      )
      .subscribe((data) => {
        setTimeout(() => {
          this.messages = data;
          this.isLoading = false;
          this.loader.hideGlobal();
          this.cdr.detectChanges();
        }, 500);
      });
  }

  onFileSelected(event: any): void {
    const filesList = event.target.files;
    if (!filesList) return;

    if (this.selectedFiles.length + filesList.length > 5) {
      this.message.warning('You can select a maximum of 5 files');
      event.target.value = '';
      return;
    }

    const allowedExtensions = ['jpg', 'jpeg', 'png'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

      if (!allowedExtensions.includes(fileExt)) {
        this.message.error(`File "${file.name}" is not allowed. Only JPG, JPEG, and PNG files are supported.`);
        continue;
      }

      if (file.size > maxSizeBytes) {
        this.message.error(`File "${file.name}" exceeds the 5 MB size limit.`);
        continue;
      }

      this.selectedFiles.push(file);
    }
    event.target.value = '';
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  sendReply(): void {
    if (this.replyText.length <= 0) {
      this.message.warning('Please enter a message');
      return;
    }

    this.isSending = true;
    const formData = new FormData();
    formData.append(
      'data',
      JSON.stringify({
        ticket_id: this.ticket.ticket_id,
        message_text: this.replyText.trim(),
      }),
    );

    // Append attachments
    this.selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    this.api
      .post<any>('common', API_ENDPOINTS.SUPPORT.AGENT_REPLY, formData)
      .pipe(
        finalize(() => {
          this.isSending = false;
        }),
      )
      .subscribe({
        next: (res) => {
          this.message.success('Response sent successfully');
          this.replyText = '';
          this.selectedFiles = [];
          this.loadThread(true);
        },
        error: (err) => {
          this.message.error(err.message || 'Failed to send response');
          console.error('Send response failed', err);
        },
      });
  }

  updateStatus(newStatus: string): void {
    if (!this.ticket) return;

    this.isStatusUpdating = true;
    const endpoint = `${API_ENDPOINTS.SUPPORT.UPDATE_STATUS}?ticketId=${this.ticket.ticket_id}&status=${newStatus}`;

    this.api
      .post<any>('common', endpoint, null)
      .pipe(
        finalize(() => {
          this.isStatusUpdating = false;
        }),
      )
      .subscribe({
        next: (res) => {
          this.message.success(`Status updated to ${newStatus}`);
          this.ticket.status = newStatus;
          this.loadThread(true);
        },
        error: (err) => {
          this.message.error(err.message || 'Failed to update ticket status');
          console.error('Update status failed', err);
        },
      });
  }

  getStatusColor(status: string): string {
    if (!status) return 'default';
    switch (status.toUpperCase()) {
      case 'OPEN':
        return 'blue';
      case 'IN PROGRESS':
        return 'orange';
      case 'RESOLVED':
        return 'green';
      case 'CLOSED':
        return 'magenta';
      default:
        return 'default';
    }
  }

  goBack(): void {
    this.router.navigate(['admin/support']);
  }
}

import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Ant Design Modules
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';

// Infrastructure Services
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';

interface WelcomeData {
  application: string;
  version: string;
  environment: string;
  server_UTC_time: string;
  server_LOCAL_time: string;
  machine_name: string;
  ip_address: string;
  uptime: string;
}

@Component({
  selector: 'app-system-information',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzCardModule,
    NzButtonModule,
    NzIconModule,
    NzGridModule,
    NzBreadCrumbModule,
    NzSpinModule,
    NzBadgeModule,
    NzDescriptionsModule
  ],
  templateUrl: './system-information.html',
  styleUrl: './system-information.scss',
})
export class SystemInformation implements OnInit {
  private api = inject(ApiCallService);
  private message = inject(NzMessageService);
  private cdr = inject(ChangeDetectorRef);

  isLoadingInfo = true;
  welcomeData?: WelcomeData;
  requestId = '';
  timestamp = '';

  ngOnInit(): void {
    this.fetchSystemInfo();
  }

  fetchSystemInfo(): void {
    this.isLoadingInfo = true;
    this.api.get<WelcomeData>('common', 'api/welcome').subscribe({
      next: (res: any) => {
        this.welcomeData = res.data;
        this.isLoadingInfo = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching welcome api:', err);
        this.isLoadingInfo = false;
        this.message.error('Failed to load server environment details.');
        this.cdr.detectChanges();
      }
    });
  }

  copySystemDetails(): void {
    if (!this.welcomeData) return;
    const diagnosticInfo = {
      application: this.welcomeData.application,
      version: this.welcomeData.version,
      environment: this.welcomeData.environment,
      server_UTC_time: this.welcomeData.server_UTC_time,
      server_LOCAL_time: this.welcomeData.server_LOCAL_time,
      machine_name: this.welcomeData.machine_name,
      ip_address: this.welcomeData.ip_address,
      uptime: this.welcomeData.uptime,
    };

    navigator.clipboard.writeText(JSON.stringify(diagnosticInfo, null, 2)).then(() => {
      this.message.success('Diagnostic information copied to clipboard!');
    }).catch(err => {
      console.error('Could not copy text: ', err);
      this.message.error('Failed to copy text.');
    });
  }
}

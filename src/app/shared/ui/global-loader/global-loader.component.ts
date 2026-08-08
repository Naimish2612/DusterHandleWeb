import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { LoadingService } from '../../../core/infrastructure/loading.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-global-loader',
  standalone:true,
  imports: [CommonModule, NzSpinModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-container
    *ngIf="loadingService.isGlobalLoading$ | async as loader"
  >
    <div class="global-loader-overlay" *ngIf="loader.loading">
      <div class="global-loader-content">
        <nz-spin nzSize="large"></nz-spin>
        <div class="global-loader-text">
          {{ loader.text }}
        </div>
      </div>
    </div>
  </ng-container> `,
  styles: [
    `
      .global-loader-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        background: rgba(255, 255, 255, 0.65);

        display: flex;
        align-items: center;
        justify-content: center;
      }

      .global-loader-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px; // use spacing token if defined (e.g. $space-sm)
      }

      .global-loader-text {
        padding-top: 8px;
        font-size: 14px;
        font-weight: 500;
        color: #1677ff; // ng-zorro primary
        text-align: center;
      }
    `,
  ],
})
export class GlobalLoaderComponent {
  constructor(public loadingService: LoadingService) {}
}

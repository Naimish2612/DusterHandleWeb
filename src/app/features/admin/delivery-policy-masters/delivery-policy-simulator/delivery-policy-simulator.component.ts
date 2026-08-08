import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'delivery-policy-simulator-result',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzDescriptionsModule, NzButtonModule],
  template: `
    <nz-card nzTitle="Delivery Policy Preview">
      <div class="simulator-result">
        <!-- Summary Prices -->
        <nz-descriptions nzBordered nzSize="small" [nzColumn]="2" nzTitle="Cost Summary">
          <nz-descriptions-item nzTitle="Base Fee">
            {{ data?.base_fee | currency: 'INR' }}
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="Discount Amount">
            {{ data?.discount_amount | currency: 'INR' }}
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="Tax Type">
            {{ data?.tax_type || 'N/A' }}
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="Tax Amount">
            {{ data?.tax_amount | currency: 'INR' }}
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="Final Total">
            <span style="font-weight: bold; color: #1890ff;">
              {{ data?.final_total | currency: 'INR' }}
            </span>
          </nz-descriptions-item>
          
          @for (key of getExtraKeys(data); track key) {
            <nz-descriptions-item [nzTitle]="formatKey(key)">
              {{ data[key] }}
            </nz-descriptions-item>
          }
        </nz-descriptions>

        @if (data?.calculation_snapshot) {
          <h4 style="margin-top: 20px; margin-bottom: 10px;">Calculation Details</h4>
          <nz-descriptions nzBordered nzSize="small" [nzColumn]="2">
            <nz-descriptions-item nzTitle="Calculation Method">
              {{ data?.calculation_snapshot?.engineDetails?.method || 'N/A' }}
            </nz-descriptions-item>
            <nz-descriptions-item nzTitle="Evaluated Cart Value">
              {{ data?.calculation_snapshot?.engineDetails?.cartValueEvaluated | currency: 'INR' }}
            </nz-descriptions-item>
            <nz-descriptions-item nzTitle="Applied Percentage">
              {{ data?.calculation_snapshot?.engineDetails?.appliedPercentage }}%
            </nz-descriptions-item>
            <nz-descriptions-item nzTitle="Calculated Raw Base">
              {{ data?.calculation_snapshot?.engineDetails?.calculatedRawBase | currency: 'INR' }}
            </nz-descriptions-item>
            <nz-descriptions-item nzTitle="Min Allowed Charge">
              {{ data?.calculation_snapshot?.minMaxApplied?.min | currency: 'INR' }}
            </nz-descriptions-item>
            <nz-descriptions-item nzTitle="Max Allowed Charge">
              {{ data?.calculation_snapshot?.minMaxApplied?.max | currency: 'INR' }}
            </nz-descriptions-item>
          </nz-descriptions>
        }
      </div>
    </nz-card>
  `,
})
export class DeliveryPolicySimulatorComponent {
  @Input() data: any | null = null;
  @Input() close!: () => void;

  getExtraKeys(data: any): string[] {
    if (!data) return [];
    const standardKeys = [
      'policy_id_applied', 'base_fee', 'tax_amount', 'tax_type',
      'discount_amount', 'final_total', 'calculation_snapshot'
    ];
    return Object.keys(data).filter(key => !standardKeys.includes(key.toLowerCase()));
  }

  formatKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}

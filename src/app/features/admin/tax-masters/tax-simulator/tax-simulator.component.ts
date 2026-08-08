import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject, Input } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'tax-simulator-result',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzDescriptionsModule, NzButtonModule],
  template: `
    <nz-card nzTitle="Tax Preview">
      <div class="simulator-result">
        <!-- Summary Prices -->
        <nz-descriptions nzBordered nzSize="small" [nzColumn]="2">
          <nz-descriptions-item nzTitle="Entered Price">
            {{ data?.entered_price | currency: 'INR' }}
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="Net Base Price">
            {{ data?.net_base_price | currency: 'INR' }}
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="Total Tax Amount">
            {{ data?.total_tax_amount | currency: 'INR' }}
          </nz-descriptions-item>
          <nz-descriptions-item nzTitle="Final Customer Price">
            {{ data?.final_customer_price | currency: 'INR' }}
          </nz-descriptions-item>
        </nz-descriptions>

        <!-- Tax Breakdown Components -->
        <h4 style="margin-top: 20px; margin-bottom: 10px">Tax Breakdown</h4>
        <nz-descriptions nzBordered nzSize="small" [nzColumn]="2">
          @for (item of data?.tax_breakdown; track item.component_name) {
            <nz-descriptions-item [nzTitle]="item.component_name">
              Rate: {{ item.rate }}{{ item.calculation_type === 'Percentage' ? '%' : '₹' }} | Type: {{ item.calculation_type }} | Amount: {{ item.calculated_amount | currency: 'INR' }}
            </nz-descriptions-item>
          } @empty {
            <nz-descriptions-item nzTitle="Info" [nzSpan]="2">
              No tax breakdown components available.
            </nz-descriptions-item>
          }
        </nz-descriptions>
      </div>
    </nz-card>
  `,
})
export class TaxSimulatorComponent {
  @Input() data: any | null = null;
  @Input() close!: () => void;
}

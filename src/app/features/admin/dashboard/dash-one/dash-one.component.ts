import { Component } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';

@Component({
  selector: 'app-dash-one',
  standalone: true,
  imports: [NzCardModule, NzIconModule, NzStatisticModule],
  templateUrl: './dash-one.component.html',
  styleUrl: './dash-one.component.scss',
})
export class DashOneComponent {}

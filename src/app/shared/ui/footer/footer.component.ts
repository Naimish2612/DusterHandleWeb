import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NzLayoutModule } from 'ng-zorro-antd/layout';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, NzLayoutModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  companyInfo = {
    name: 'Duster Metal Products Pvt. Ltd',
    version: '1.0',
  };

  footerLinks = [
    { label: 'Privacy Policy', url: '#' },
    { label: 'Terms of Service', url: '#' },
  ];
}

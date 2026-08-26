import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'app-public-footer',
  imports: [RouterLink, NzIconModule, NzInputModule, NzButtonModule],
  templateUrl: './public-footer.html',
  styleUrl: './public-footer.scss',
})
export class PublicFooter {
  currentYear = new Date().getFullYear();

  quickLinks = [
    { label: 'New Arrivals', route: '/home', fragment: 'new-arrivals', queryParams: null },
    { label: 'Top Selling', route: '/home', fragment: 'top-selling', queryParams: null },
    { label: 'About Us', route: '/about', queryParams: null },
    { label: 'Contact', route: '/contact', queryParams: null },
  ];

  legalLinks = [
    { label: 'Privacy Policy', route: '/help/privacy-policy' },
    { label: 'Terms & Conditions', route: '/help/terms-and-conditions' },
    { label: 'Cookie Policy', route: '/help/cookie-policy' },
    // { label: 'Return Policy', route: '/help/return-policy' },
    // { label: 'Refund Policy', route: '/help/refund-policy' },
    // { label: 'Replacement Policy', route: '/help/replacement-policy' },
    // { label: 'Grievance Redressal Policy', route: '/help/grievance-redressal-policy' },
  ];

  socialLinks = [
    { icon: 'x', label: 'Twitter', url: '#' },
    { icon: 'instagram', label: 'Instagram', url: '#' },
    { icon: 'facebook', label: 'Facebook', url: '#' },
    { icon: 'youtube', label: 'YouTube', url: '#' },
    { icon: 'linkedin', label: 'LinkedIn', url: '#' },
  ];
}

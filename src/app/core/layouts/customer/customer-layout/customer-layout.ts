import { Component, OnInit, signal } from '@angular/core';
import { BackToTop } from '../../../../shared/ui/back-to-top/back-to-top';
import { RouterModule } from '@angular/router';
import { PublicHeader } from '../../../../shared/ui/public-header/public-header';
import { PublicFooter } from '../../../../shared/ui/public-footer/public-footer';

@Component({
  selector: 'app-customer-layout',
  imports: [BackToTop, RouterModule, PublicHeader, PublicFooter],
  templateUrl: './customer-layout.html',
  styleUrl: './customer-layout.scss',
})
export class CustomerLayout implements OnInit {
  isSidebarCollapsed = signal(false);

  ngOnInit(): void {}

  onSidebarToggle(collapsed: boolean): void {
    this.isSidebarCollapsed.set(collapsed);
  }
}

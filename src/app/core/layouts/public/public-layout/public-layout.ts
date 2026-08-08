import { Component, OnInit, signal } from '@angular/core';
import { BackToTop } from '../../../../shared/ui/back-to-top/back-to-top';
import { RouterModule } from '@angular/router';
import { PublicHeader } from '../../../../shared/ui/public-header/public-header';
import { PublicFooter } from '../../../../shared/ui/public-footer/public-footer';

@Component({
  selector: 'app-public-layout',
  imports: [BackToTop, RouterModule, PublicHeader, PublicFooter],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.scss',
})
export class PublicLayout  implements OnInit {
  isSidebarCollapsed = signal(false);

  ngOnInit(): void {}

  onSidebarToggle(collapsed: boolean): void {
    this.isSidebarCollapsed.set(collapsed);
  }
}


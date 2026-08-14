import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { FooterComponent } from '../../../../shared/ui/footer/footer.component';
import { SidebarComponent } from '../../../../shared/ui/sidebar/sidebar.component';

@Component({
  selector: 'app-admin-layout',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzLayoutModule,
    SidebarComponent,
    FooterComponent,
  ],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout implements OnInit, OnDestroy {
  isSidebarCollapsed = signal(false);
  private overlayContainer = inject(OverlayContainer);

  ngOnInit(): void {
    this.overlayContainer.getContainerElement().classList.add('admin-overlay');
  }

  ngOnDestroy(): void {
    this.overlayContainer.getContainerElement().classList.remove('admin-overlay');
  }

  onSidebarToggle(collapsed: boolean): void {
    this.isSidebarCollapsed.set(collapsed);
  }
}

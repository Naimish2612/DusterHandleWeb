import { CommonModule } from '@angular/common';
import { Component, HostListener, signal } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-back-to-top',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  template: ` <button
    class="back-to-top"
    [class.back-to-top--visible]="visible()"
    (click)="scrollToTop()"
    aria-label="Back to top"
  >
    <span nz-icon nzType="up"></span>
  </button>`,
  styleUrl: './back-to-top.scss',
})
export class BackToTop {
  visible = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.visible.set(window.scrollY > 400);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

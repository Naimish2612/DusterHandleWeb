import { Component, OnInit, signal, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
export class PublicLayout implements OnInit {
  isSidebarCollapsed = signal(false);
  showIntroLoader = signal(true);
  isAnimatingOut = signal(false);
  isDone = signal(false);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.showIntroLoader.set(false);
      return;
    }

    // Hide header logo while intro loader is active
    document.body.classList.add('intro-active');

    // Hold centered logo for 1s, then execute dynamic pixel-perfect glide to header logo
    setTimeout(() => {
      this.triggerSmoothLogoTransition();
    }, 1000);
  }

  private triggerSmoothLogoTransition(): void {
    const targetHeaderLogo = document.querySelector('.site-header__logo img') || document.querySelector('.site-header__logo');
    const loaderLogoBox = document.querySelector('.Duster-intro-loader__logo-box') as HTMLElement;
    const loaderLogoImg = document.querySelector('.Duster-intro-loader__logo') as HTMLElement;

    if (targetHeaderLogo && loaderLogoBox) {
      const targetRect = targetHeaderLogo.getBoundingClientRect();
      const loaderRect = loaderLogoBox.getBoundingClientRect();

      // Calculate exact center-to-center delta vector
      const loaderCenterX = loaderRect.left + loaderRect.width / 2;
      const loaderCenterY = loaderRect.top + loaderRect.height / 2;
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;

      const moveX = targetCenterX - loaderCenterX;
      const moveY = targetCenterY - loaderCenterY;

      const targetHeight = targetRect.height || 36;
      const scale = targetHeight / (loaderRect.height / 1.3);

      // Preserve -50%, -50% center origin while translating moveX, moveY
      loaderLogoBox.style.transformOrigin = 'center center';
      loaderLogoBox.style.transform = `translate3d(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px), 0) scale(${scale})`;
      
      if (loaderLogoImg) {
        loaderLogoImg.style.animation = 'none';
      }
    }

    this.isAnimatingOut.set(true);

    // 1. Logo reaches destination at 800ms
    setTimeout(() => {
      // 2. Smooth crossfade: header logo fades in while loader logo fades out
      document.body.classList.remove('intro-active');
      if (loaderLogoBox) {
        loaderLogoBox.style.opacity = '0';
      }

      // 3. Unmount loader from DOM after crossfade completes
      setTimeout(() => {
        this.isDone.set(true);
        this.showIntroLoader.set(false);
      }, 350);
    }, 800);
  }

  onSidebarToggle(collapsed: boolean): void {
    this.isSidebarCollapsed.set(collapsed);
  }
}


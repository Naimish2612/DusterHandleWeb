// import { Component, inject, signal } from '@angular/core';
// import { RouterOutlet } from '@angular/router';
// import { NzButtonModule } from 'ng-zorro-antd/button';
// import { en_US, hi_IN, NzI18nService } from 'ng-zorro-antd/i18n';
// import { GlobalLoaderComponent } from "./shared/ui/global-loader/global-loader.component";

// @Component({
//   selector: 'app-root',
//   imports: [RouterOutlet, NzButtonModule, GlobalLoaderComponent],
//   templateUrl: './app.html',
//   styleUrl: './app.scss',
// })
// export class App {
//   protected readonly title = signal('duster.ecom');
//   private i18n = inject(NzI18nService);

//   changeToEnglish() {
//     this.i18n.setLocale(en_US)
//   }
//   changeToHindi() {
//     this.i18n.setLocale(hi_IN)
//   }
// }


import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { en_US, hi_IN, NzI18nService } from 'ng-zorro-antd/i18n';
import { GlobalLoaderComponent } from "./shared/ui/global-loader/global-loader.component";
import { SessionService } from './core/infrastructure/session.service';
import { CartService } from './features/public/services/cart.service'; // ✅ Adjust path
import Lenis from 'lenis';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NzButtonModule, GlobalLoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('duster.ecom');
  private i18n = inject(NzI18nService);
  private sessionService = inject(SessionService); // ✅
  private cartService = inject(CartService);       // ✅
  private platformId = inject(PLATFORM_ID);
  private lenis: Lenis | null = null;

  ngOnInit(): void {
    this.restoreCustomerCart();
    if (isPlatformBrowser(this.platformId)) {
      this.initLenis();
    }
  }

  private initLenis(): void {
    this.lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 2.0,
      infinite: false,
    });

    const raf = (time: number) => {
      this.lenis?.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  /**
   * ✅ Re-fetch cart on page refresh (only for logged-in CUSTOMER)
   */
  private restoreCustomerCart(): void {
    if (
      this.sessionService.isAuthenticated() &&
      this.sessionService.getUserType() === 'CUSTOMER'
    ) {
      this.cartService.initializeCart().subscribe({
        next: () => console.log('✅ Cart restored from server'),
        error: () => console.log('ℹ️ No active cart'),
      });
    }
  }

  changeToEnglish() {
    this.i18n.setLocale(en_US);
  }

  changeToHindi() {
    this.i18n.setLocale(hi_IN);
  }
}

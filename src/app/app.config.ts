import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';

/** config angular i18n **/
import en from '@angular/common/locales/en';
import { registerLocaleData } from '@angular/common';
registerLocaleData(en);

/** config ng-zorro-antd i18n **/
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzConfig, provideNzConfig } from 'ng-zorro-antd/core/config';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNzIcons } from './core/icon/icons-provider';
import { authInterceptor } from './core/Interceptor/auth.interceptor';

/** Global Configuration **/
const ngZorroConfig: NzConfig = {
  message: { nzTop: 120 },
  notification: { nzTop: 240 }
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAnimations(),
    provideAnimationsAsync(),
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })),
    provideNzIcons(),
    provideNzConfig(ngZorroConfig),
    provideHttpClient(withInterceptors([authInterceptor])), { provide: ErrorHandler },
    provideNzI18n(en_US)
  ],
};

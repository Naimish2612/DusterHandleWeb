import { Component, computed, HostListener, inject, OnInit, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { SessionService } from '../../../core/infrastructure/session.service';
import { ClientUserService, ClientNavbarUser } from '../../../core/infrastructure/client-user.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { UserProfile } from '../sidebar/sidebar.component';
import { CartService } from '../../../features/public/services/cart.service';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-public-header',
  imports: [CommonModule, RouterLink, RouterLinkActive, NzIconModule, NzBadgeModule, NzDropDownModule,
    NzMenuModule, NzDrawerModule, NzButtonModule, NzAvatarModule, NzModalModule],
  templateUrl: './public-header.html',
  styleUrl: './public-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicHeader implements OnInit {

  private session = inject(SessionService);
  private readonly clientUserService = inject(ClientUserService);
  private modal = inject(NzModalService);
  private router = inject(Router);
  private message = inject(NzMessageService);
  private destroyRef = inject(DestroyRef);
  private cartService = inject(CartService);

  cartCount = this.cartService.cartItemCount;
  userName = signal('');
  isScrolled = signal(false);
  drawerOpen = signal(false);
  currentUser = signal<ClientNavbarUser | null>(null);

  get isLoggedIn(): boolean {
    return this.session.isAuthenticated();
  }

  navItems: NavItem[] = [
    { label: 'Home', route: '/home', icon: 'home' },
    { label: 'Products', route: '/products', icon: 'appstore' },
    { label: 'About', route: '/about', icon: 'info-circle' },
    { label: 'Contact', route: '/contact', icon: 'mail' },
  ];

  constructor() { }

  ngOnInit(): void {
    // Subscribe to user changes from service
    this.clientUserService.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.currentUser.set(user);
        if (user) {
          this.userName.set(user.fullName || user.name || '');
        } else {
          this.userName.set('');
        }
      });

    // Hydrate from storage to populate initial data
    this.clientUserService.hydrateFromStorage();
    const refresh = this.cartService.refreshCart();
    if (refresh) refresh.subscribe();
  }

  userInitials = computed<string>(() => {
    const name = this.userName().trim();
    if (!name) return 'U';
    return name.split(/\s+/).map(part => part.charAt(0).toUpperCase()).slice(0, 2).join('');
  });

  logout(): void {
    this.modal.confirm({
      nzTitle: 'Confirm Logout',
      nzContent: 'Are you sure you want to logout?',
      nzOkText: 'Yes, Logout',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'Cancel',
      nzOnOk: () => {
        this.message.success('Logged out successfully!');
        this.session.clearSession();
        this.clientUserService.clearUser();
        this.cartService.resetCart();
        setTimeout(() => {
          window.location.href = '/home';
        }, 600);
      },
    });
  }

  @HostListener('window:scroll')
  onScroll(): void { this.isScrolled.set(window.scrollY > 10); }

  openDrawer(): void { this.drawerOpen.set(true); }

  closeDrawer(): void { this.drawerOpen.set(false); }
}

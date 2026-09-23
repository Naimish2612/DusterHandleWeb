import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/global-api-endpoints/api-endpoints';
import { ApiCallService } from '../../../core/infrastructure/api-call.service';
import { LoadingService } from '../../../core/infrastructure/loading.service';
import { NotificationService } from '../../../core/infrastructure/notification.service';
import { PermissionService } from '../../../core/infrastructure/permission.service';
import { SessionService } from '../../../core/infrastructure/session.service';
import { MenuService } from '../../../core/infrastructure/menu.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { ClientUserService } from '../../../core/infrastructure/client-user.service';
import { ChangePassword } from '../change-password/change-password';
import { MenuItem } from '../../models/menu-item';
export type { MenuItem } from '../../models/menu-item';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  permissions?: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
    NzDropDownModule,
    NzAvatarModule,
    NzBadgeModule,
    NzInputModule,
    NzBreadCrumbModule,
    NzModalModule,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private loader = inject(LoadingService);
  private session = inject(SessionService);
  private api = inject(ApiCallService);
  private notification = inject(NotificationService);
  public menuService = inject(MenuService);
  private permission = inject(PermissionService);
  private readonly clientUserService = inject(ClientUserService);

  // Signals
  isCollapsed = signal(false);

  // Menu search
  menuSearchValue = signal('');
  filteredMenuItems = computed<MenuItem[]>(() => {
    const search = this.menuSearchValue().trim();
    if (!search) {
      return this.menuService.menuItems$();
    }
    return this.menuService.searchMenu(search);
  });

  // User info
  currentUser: UserProfile = {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@erppro.com',
    avatar: 'https://i.pravatar.cc/150?img=12',
    role: 'Administrator',
    permissions: [
      'view_dashboard',
      'view_sales',
      'view_inventory',
      'view_finance',
      'view_hr',
      'view_settings',
    ],
  };

  // Output event for toggle
  toggleSidebar = output<boolean>();

  constructor(
    private router: Router,
    private modal: NzModalService,
    private message: NzMessageService,
  ) {
    if (this.menuService.hasMenu()) {
      this.loader.hideGlobal();
    } else {
      this.loader.showGlobal('Initializing...');
      this.getMenu();
    }
  }

  ngOnInit(): void {
    this.clientUserService.loadUser(true).subscribe({
      error: () => {
        // Keep home usable even if the profile refresh fails.
      },
    });

    this.bindClientUserProfile();
  }

  // Accordion toggle: closes other items at the same level
  onOpenChange(item: any, siblings: any[], isOpen: boolean): void {
    if (this.menuSearchValue().trim()) return;
    if (isOpen && siblings) {
      siblings.forEach((s) => {
        if (s !== item) s.open = false;
      });
    }
    item.open = isOpen;
  }

  toggleCollapsed(): void {
    this.isCollapsed.update((value) => !value);
    this.toggleSidebar.emit(this.isCollapsed());
  }

  // Menu search functionality
  onMenuSearch(value: string): void {
    this.menuSearchValue.set(value ?? '');
  }

  clearSearch(): void {
    this.menuSearchValue.set('');
  }
  openMyProfile(){
    this.router.navigate(['/admin/profile'])
  }

  openChangePassword(): void {
    this.router.navigate(['/admin/home'])
    const userType = this.session.getUserType();
    const role: 'customer' | 'admin' | 'vendor' = userType?.toLowerCase() === 'admin' ? 'admin' : 'customer';

    const modalRef = this.modal.create({
      nzTitle: undefined,
      nzContent: ChangePassword,
      nzFooter: null,
      nzWidth: 500,
      nzClassName: 'change-password-modal',
      nzMaskClosable: false
    });

    const instance = modalRef.getContentComponent();
    if (instance) {
      instance.userRole = role;

      instance.passwordChanged.subscribe(() => {
        modalRef.close();
      });

      instance.cancelled.subscribe(() => {
        modalRef.close();
      });
    }
  }

  logout(): void {
    this.modal.confirm({
      nzTitle: 'Confirm Logout',
      nzContent: 'Are you sure you want to logout?',
      nzOkText: 'Yes, Logout',
      nzCancelText: 'Cancel',
      nzOnOk: () => {
        this.message.success('Logged out successfully!');
        this.menuService.resetMenu();
        this.session.clearSession();
        this.clientUserService.clearUser();
        localStorage.clear()
        this.permission.clear();
        this.router.navigate(['/auth/login']);
      },
    });
  }

  private bindClientUserProfile(): void {
    const roleLabel = this.resolveRoleLabel();
    const storedUser = this.clientUserService.hydrateFromStorage();

    if (storedUser) {
      this.currentUser = {
        id: String(storedUser.code || this.currentUser.id),
        name: storedUser.fullName || storedUser.name || this.currentUser.name,
        email: storedUser.email || this.currentUser.email,
        avatar: storedUser.avatar || '',
        role: roleLabel,
        permissions: this.currentUser.permissions,
      };
    }

    this.clientUserService.user$.subscribe((user) => {
      if (!user) {
        this.currentUser = { ...this.currentUser, role: roleLabel };
        return;
      }

      this.currentUser = {
        id: String(user.code || this.currentUser.id),
        name: user.fullName || user.name || this.currentUser.name,
        email: user.email || this.currentUser.email,
        avatar: user.avatar || '',
        role: roleLabel,
        permissions: this.currentUser.permissions,
      };
    });
  }

  private resolveRoleLabel(): string {
    const userType = this.session.getUserType();
    switch (userType) {
      case 'ADMIN':
        return 'Admin';
      case 'CUSTOMER':
        return 'Customer';
      default:
        return this.currentUser.role;
    }
  }

  getMenu() {
    this.api
      .get<any>('common', API_ENDPOINTS.USER.USER_PERMISSION)
      .pipe(
        finalize(() => {
          this.loader.hideGlobal();
        }),
      )
      .subscribe({
        next: (res) => {
          const responseData = res.data!;

          if (!responseData) {
            this.notification.Error({
              title: 'Error',
              message: 'System Menu Permission not available,Contact your administrator.',
            });
          }

          this.menuService.setMenuData(responseData.sideBar, responseData.button_actions);
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message: err.message || 'System Menu failed. Please try again.',
          });
        },
      });
  }
}

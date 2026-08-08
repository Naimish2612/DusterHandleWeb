import { inject, Injectable, signal } from '@angular/core';
import { MenuItem } from '../../shared/models/menu-item';
import { LocalStorageService } from './local-storage.service';
import { PermissionService } from './permission.service';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private ls = inject(LocalStorageService);
  private permission = inject(PermissionService);

  private menuItemsSignal = signal<MenuItem[]>([]);
  private allowedActionsSignal = signal<string[]>([]);
  private readonly STORAGE_KEY = 'MENU_ITEMS';
  private readonly ACTIONS_KEY = 'BUTTON_ACTIONS';

  menuItems$ = this.menuItemsSignal.asReadonly();
  allowedActions$ = this.allowedActionsSignal.asReadonly();

  constructor() {
    const cached = this.readMenuCache();
    if (cached?.length) {
      this.menuItemsSignal.set(cached);
    }

    const cachedActions = this.readActionsCache();
    if (cachedActions?.length) {
      this.allowedActionsSignal.set(cachedActions);
      this.permission.setAllowedActions(cachedActions);
    }
  }
  
  setMenuItems(items: MenuItem[]): void {
    this.menuItemsSignal.set(items ?? []);
    this.writeMenuCache(this.menuItemsSignal());
  }

  setAllowedActions(actions: string[]): void {
    const normalized = Array.isArray(actions) ? actions : [];
    this.allowedActionsSignal.set(normalized);
    this.permission.setAllowedActions(normalized);
    this.writeActionsCache(normalized);
  }

  setMenuData(items: MenuItem[], actions: string[]): void {
    this.setMenuItems(items);
    this.setAllowedActions(actions);
  }

  searchMenu(keyword: string): MenuItem[] {
    if (!keyword.trim()) {
      return [...this.menuItemsSignal()];
    }

    const searchTerm = keyword.toLowerCase().trim();
    const clone = JSON.parse(
      JSON.stringify(this.menuItemsSignal()),
    ) as MenuItem[];
    return this.filterMenuItemsByKeyword(clone, searchTerm);
  }

  private filterMenuItemsByKeyword(
    items: MenuItem[],
    keyword: string,
  ): MenuItem[] {
    return items.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(keyword);

      if (item.children && item.children.length > 0) {
        item.children = this.filterMenuItemsByKeyword(item.children, keyword);
        return titleMatch || item.children.length > 0;
      }

      return titleMatch;
    });
  }

  resetMenu(): void {
    this.menuItemsSignal.set([]);
    this.allowedActionsSignal.set([]);
    this.permission.clear();
    this.clearMenuCache();
    this.clearActionsCache();
  }

  hasMenu(): boolean {
    return this.menuItemsSignal().length > 0;
  }

  private readMenuCache(): MenuItem[] | null {
    const parsed = this.ls.getDecryptItem<MenuItem[] | string>(
      this.STORAGE_KEY,
    );
    if (!parsed) return null;
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'string') {
      try {
        const again = JSON.parse(parsed) as MenuItem[];
        return Array.isArray(again) ? again : null;
      } catch {
        return null;
      }
    }
    return null;
  }

  private writeMenuCache(items: MenuItem[]): void {
    try {
      this.ls.setEncryptItem(this.STORAGE_KEY, items ?? []);
    } catch {
      // ignore
    }
  }

  private readActionsCache(): string[] | null {
    const parsed = this.ls.getDecryptItem<string[] | string>(this.ACTIONS_KEY);
    if (!parsed) return null;
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'string') {
      try {
        const again = JSON.parse(parsed) as string[];
        return Array.isArray(again) ? again : null;
      } catch {
        return null;
      }
    }
    return null;
  }

  private writeActionsCache(actions: string[]): void {
    try {
      this.ls.setEncryptItem(this.ACTIONS_KEY, actions ?? []);
    } catch {
      // ignore
    }
  }

  private clearMenuCache(): void {
    try {
      this.ls.removeItem(this.STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  private clearActionsCache(): void {
    try {
      this.ls.removeItem(this.ACTIONS_KEY);
    } catch {
      // ignore
    }
  }
}

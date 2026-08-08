import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  private allowedActionsSignal = signal<Set<string>>(new Set());
  readonly allowedActions$ = this.allowedActionsSignal.asReadonly();

  constructor() { }

  /**
   * Initialize permissions from backend
   */
  setAllowedActions(actions: string[]): void {
    this.allowedActionsSignal.set(new Set(actions));
  }

  /**
   * Check permission (O(1))
   */
  hasAction(actionCode: string): boolean {
    return this.allowedActionsSignal().has(actionCode);
  }

  /**
   * Clear permissions on logout
   */
  clear(): void {
    this.allowedActionsSignal.set(new Set());
  }
  
}

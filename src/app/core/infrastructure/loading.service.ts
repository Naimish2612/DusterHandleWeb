import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface GlobalLoaderState {
  loading: boolean;
  text: string;
}

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private readonly DEFAULT_TEXT = 'Loading...!';
  private globalCount = 0;

  private readonly _isGlobalLoading = new BehaviorSubject<GlobalLoaderState>({
    loading: false,
    text: this.DEFAULT_TEXT,
  });

  isGlobalLoading$ = this._isGlobalLoading.asObservable();

  private _contextLoading = new Map<string, BehaviorSubject<boolean>>();

  //Global Loading
  showGlobal(nzTip: string | null): void {
    this.globalCount++;
    this._isGlobalLoading.next({
      loading: true,
      text: nzTip || this.DEFAULT_TEXT,
    });
  }

  hideGlobal(): void {
    if (this.globalCount > 0) {
      this.globalCount--;
    }
    if (this.globalCount === 0) {
      this._isGlobalLoading.next({ loading: false, text: this.DEFAULT_TEXT });
    }
  }

  //Contextual Loading (per key, e.g., button or table)
  private ensureContext(key: string): BehaviorSubject<boolean> {
    if (!this._contextLoading.has(key)) {
      this._contextLoading.set(key, new BehaviorSubject<boolean>(false));
    }
    return this._contextLoading.get(key)!;
  }

  isLoading(key: string): Observable<boolean> {
    return this.ensureContext(key).asObservable();
  }

  showContext(key: string): void {
    this.ensureContext(key).next(true);
  }

  hideContext(key: string): void {
    this.ensureContext(key).next(false);
  }
}

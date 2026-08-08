import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { finalize, Observable, Subscription, take } from 'rxjs';
import { LocalStorageService } from '../../../core/infrastructure/local-storage.service';

export type SelectionMode = 'single' | 'multiple';

export interface TableColumn {
  key: string; // object key to show (e.g. 'name')
  title: string; // header text
  width?: string; // optional width
  align?: 'left' | 'center' | 'right';
  template?: string; // reserved for future templating
}

export interface TableAction {
  key: string; // unique action key
  icon: string | ((row: any) => string); // nz-icon type or function
  tooltip?: string | ((row: any) => string); // tooltip text or function
  danger?: boolean; // red style
  type?: 'primary' | 'default' | 'link' | 'text' | 'dashed';
  // showIf?: (row: any) => boolean;
  showIf?: boolean; // optional predicate to show action
}

export interface UiGridDataSource<T> {
  load: () => Observable<T[]>;
}

@Component({
  selector: 'ui-grid',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzButtonModule,
    NzCheckboxModule,
    NzDividerModule,
    NzEmptyModule,
    NzIconModule,
    NzSpinModule,
    NzTableModule,
    NzToolTipModule,
  ],
  templateUrl: './ui-grid.component.html',
  styleUrl: './ui-grid.component.scss',
})
export class UiGridComponent {
  constructor(
    private cdr: ChangeDetectorRef,
    private localStorageService: LocalStorageService
  ) { }

  // data + columns
  private _columns: TableColumn[] = [];
  @Input() set columns(value: TableColumn[]) {
    this._columns = value || [];
    if (this._columns.length > 0) {
      this.loadColumnPrefs();
    }
  }
  get columns(): TableColumn[] {
    return this._columns;
  }
  @Input() autoColumns: boolean = true;
  @Input() hideColumns: string[] = [];
  // backward-compatible alias requested as `hildeColumn`
  @Input() set hildeColumn(keys: string[] | null | undefined) {
    this.hideColumns = Array.isArray(keys) ? keys : [];
  }
  data: any[] = []; // full dataset (for client side) or page items (for server side)
  loading: boolean = false;

  // selection config
  @Input() selectable: boolean = false; //for hide show, check box logic. if true then you should have to set selectionMode either single | multiple.
  @Input() selectionMode: SelectionMode = 'multiple'; // 'single' | 'multiple'
  @Input() selectionKey: string = 'id'; // property used to identify rows for selection
  @Input() selectionRequired: boolean = false; // if true, you can enforce parent check

  // actions config
  @Input() actions: TableAction[] = [];
  @Input() actionLoadingMap: Record<string, boolean> = {}; // parent can set per-action loading flags
  @Input() disableActionIf?: (action: TableAction, row: any) => boolean; // predicate to disable action button

  // pagination config
  @Input() serverSide: boolean = false; // if true, parent handles paging and supplies `data` for current page
  @Input() pageIndex: number = 1;
  @Input() pageSize: number = 10;
  @Input() total: number = 0;
  @Input() pageSizeOptions: number[] = [10, 20, 50];
  @Input() showSizeChanger: boolean = true;

  // scrolling
  @Input() scrollX?: string | null; // e.g. '1200px'
  @Input() scrollY?: string | null; // e.g. '400px'

  // other
  private _title?: string;
  @Input() set title(value: string | undefined) {
    this._title = value;
    if (this.columns && this.columns.length > 0) {
      this.loadColumnPrefs();
    }
  }
  get title(): string | undefined {
    return this._title;
  }
  @Input() headerExtra?: string;
  @Input() columnWidths: any = {};
  @Input() sortableColumns: 'all' | string[] = 'all';
  @Input() nonSortableColumns: string[] = [];

  private _ref_name?: string;
  @Input() set ref_name(value: string | undefined) {
    this._ref_name = value;
    if (this.columns && this.columns.length > 0) {
      this.loadColumnPrefs();
    }
  }
  get ref_name(): string | undefined {
    return this._ref_name;
  }

  // outputs
  @Output() selectionChange = new EventEmitter<any[]>(); // selected rows
  @Output() action = new EventEmitter<{ actionKey: string; row: any }>();
  @Output() pageChange = new EventEmitter<{
    pageIndex: number;
    pageSize: number;
  }>();

  @Input() autoLoad = true;
  @Input() reloadOn?: Observable<void>;
  @Input() dataSource!: { load: () => Observable<any[]> };
  private reloadSub?: Subscription;
  private hasLoadedOnce = false;

  // internal state
  selectedMap = new Map<any, any>(); // key -> row
  allChecked = false;
  indeterminate = false;

  // computed display data for client-side paging
  displayData: any[] = [];

  get parentVisibleColumns(): TableColumn[] {
    const hiddenByParent = new Set((this.hideColumns || []).map((k) => String(k).toLowerCase()));
    return (this.columns || []).filter(
      (col) => !hiddenByParent.has(String(col?.key ?? '').toLowerCase())
    );
  }

  get visibleColumns(): TableColumn[] {
    return this.parentVisibleColumns.filter(
      (col) => !this.userHiddenColumns.has(col.key.toLowerCase())
    );
  }

  get scrollObj(): { x?: string | null; y?: string | null } {
    return {
      // Default ERP standard: always allow horizontal scrolling
      x: this.scrollX ?? '100%',
      // Vertical scroll only when explicitly set by parent
      y: this.scrollY ?? null,
    };
  }

  ngOnInit(): void {
    this.subscribeReload();
    document.addEventListener('click', this.onDocumentClick);
    if (this.columns && this.columns.length > 0) {
      this.loadColumnPrefs();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // if (changes['data'] || changes['pageIndex'] || changes['pageSize']) {
    //   this.computeDisplayData();
    //   this.refreshSelectionState();

    // }

    if (changes['columns'] && this.columns && this.columns.length > 0) {
      this.loadColumnPrefs();
    }

    if (
      changes['dataSource'] &&
      this.dataSource &&
      this.autoLoad &&
      !this.hasLoadedOnce
    ) {
      this.loadData();
    }
  }

  ngOnDestroy(): void {
    this.reloadSub?.unsubscribe();
    document.removeEventListener('click', this.onDocumentClick);
  }

  /* ==============================
     Pagination logic
     - serverSide=true -> do not slice 'data', parent controls paging and total
     - serverSide=false -> client side paging (slice data)
     ===============================*/
  computeDisplayData(): void {
    if (this.serverSide) {
      // data already contains current page rows provided by parent
      this.displayData = this.data || [];
      // if total not provided, fallback to data length
      if (!this.total) {
        this.total = this.data?.length || 0;
      }
    } else {
      const start = (this.pageIndex - 1) * this.pageSize;
      const end = start + this.pageSize;
      this.displayData = (this.data || []).slice(start, end);
      this.total = this.data?.length || 0;
    }
  }

  handlePageIndexChange(page: number): void {
    this.pageIndex = page;
    if (this.serverSide) {
      this.pageChange.emit({
        pageIndex: this.pageIndex,
        pageSize: this.pageSize,
      });
    } else {
      this.computeDisplayData();
    }
  }

  handlePageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 1; // reset to first page
    if (this.serverSide) {
      this.pageChange.emit({
        pageIndex: this.pageIndex,
        pageSize: this.pageSize,
      });
    } else {
      this.computeDisplayData();
    }
  }

  /* ==============================
     Selection logic
     ===============================*/
  identifyKey(row: any) {
    return row?.[this.selectionKey] ?? JSON.stringify(row);
  }

  isSelected(row: any): boolean {
    const k = this.identifyKey(row);
    return this.selectedMap.has(k);
  }

  toggleRowSelection(row: any, checked: boolean): void {
    const k = this.identifyKey(row);
    if (this.selectionMode === 'single') {
      // clear previous
      this.selectedMap.clear();
      if (checked) this.selectedMap.set(k, row);
    } else {
      if (checked) this.selectedMap.set(k, row);
      else this.selectedMap.delete(k);
    }
    this.afterSelectionChange();
  }

  toggleAll(checked: boolean): void {
    if (this.selectionMode !== 'multiple') return;
    if (checked) {
      // select only visible rows (displayData)
      (this.displayData || []).forEach((r) => {
        const k = this.identifyKey(r);
        this.selectedMap.set(k, r);
      });
    } else {
      (this.displayData || []).forEach((r) => {
        const k = this.identifyKey(r);
        this.selectedMap.delete(k);
      });
    }
    this.afterSelectionChange();
  }

  refreshSelectionState(): void {
    const totalVisible = (this.displayData || []).length;
    const checkedCount = (this.displayData || []).filter((r) =>
      this.isSelected(r),
    ).length;
    this.allChecked = checkedCount === totalVisible && totalVisible > 0;
    this.indeterminate = checkedCount > 0 && checkedCount < totalVisible;
  }

  afterSelectionChange(): void {
    this.refreshSelectionState();
    this.selectionChange.emit(Array.from(this.selectedMap.values()));
  }

  /* ==============================
     Actions
     ===============================*/
  isActionLoading(key: string): boolean {
    return !!this.actionLoadingMap && !!this.actionLoadingMap[key];
  }

  isActionDisabled(action: TableAction, row: any): boolean {
    if (this.disableActionIf) return this.disableActionIf(action, row);
    return false;
  }

  triggerAction(actionKey: string, row: any): void {
    this.action.emit({ actionKey, row });
  }

  getActionIcon(action: TableAction, row: any): string {
    if (typeof action.icon === 'function') {
      return action.icon(row);
    }
    return action.icon;
  }

  getActionTooltip(action: TableAction, row: any): string {
    if (typeof action.tooltip === 'function') {
      return action.tooltip(row);
    }
    return action.tooltip || '';
  }

  /* ==============================
     Utility to resolve cell value
     ===============================*/
  resolveCell(row: any, key: string): any {
    // support nested keys 'employee.name'
    if (!row || !key) return '';
    if (key.indexOf('.') === -1) return row[key];
    return (
      key.split('.').reduce((acc: any, part: string) => acc?.[part], row) ?? ''
    );
  }

  private loadData(): void {
    if (!this.dataSource) {
      // grid shows blank safely
      this.data = [];
      this.originalData = [];
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    this.hasLoadedOnce = true;
    this.loading = true;

    this.dataSource
      .load()
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (data) => {
          this.data = data ?? [];
          this.originalData = [...this.data];
          this.loading = false;
          this.ensureColumnsFromData(this.data);
          this.applySort();
          this.computeDisplayData();
          this.refreshSelectionState();
          this.cdr.markForCheck();
        },
        error: () => {
          this.data = []; // fail-safe
          this.originalData = [];
          this.loading = false;
          this.ensureColumnsFromData(this.data);
          this.computeDisplayData();
          this.refreshSelectionState();
          this.cdr.markForCheck();
        },
      });
  }

  private ensureColumnsFromData(data: any[]): void {
    if (!this.autoColumns) return;
    if (this.columns && this.columns.length > 0) return;
    if (!data || data.length === 0) return;

    const sample = data[0];
    if (!sample || typeof sample !== 'object') return;

    const keys = Object.keys(sample);
    if (keys.length === 0) return;

    this.columns = keys.map((key) => ({
      key,
      title: this.humanizeKey(key),
      width: this.estimateWidth(key),
    }));

    this.loadColumnPrefs();
  }

  private humanizeKey(key: string): string {
    const withSpaces = key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ');
    return withSpaces
      .split(' ')
      .filter((s) => s.length > 0)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join(' ');
  }

  private estimateWidth(key: string): string {
    const min = 120;
    const max = 280;
    const perChar = 10;
    const width = Math.min(max, Math.max(min, key.length * perChar));
    return `${width}px`;
  }

  private subscribeReload(): void {
    if (this.reloadOn) {
      this.reloadSub = this.reloadOn.subscribe(() => {
        this.loadData();
      });
    }
  }

  // Column Width Resolver
  getColumnWidth(col: TableColumn): string | undefined {
    let widthVal: any = undefined;

    if (Array.isArray(this.columnWidths)) {
      for (const item of this.columnWidths) {
        if (item && typeof item === 'object') {
          if (item[col.key] !== undefined) {
            widthVal = item[col.key];
            break;
          }
          if (item.key === col.key && item.width !== undefined) {
            widthVal = item.width;
            break;
          }
          if (item.name === col.key && item.width !== undefined) {
            widthVal = item.width;
            break;
          }
        }
      }
    } else if (this.columnWidths && typeof this.columnWidths === 'object') {
      if (this.columnWidths[col.key] !== undefined) {
        widthVal = this.columnWidths[col.key];
      }
    }

    const finalWidth = widthVal !== undefined ? widthVal : col.width;
    if (finalWidth === undefined || finalWidth === null) {
      return undefined;
    }

    const strWidth = String(finalWidth).trim();
    if (/^\d+$/.test(strWidth)) {
      return `${strWidth}%`;
    }
    return strWidth;
  }

  // Column Preference Controls
  showColumnPrefs = false;
  userHiddenColumns = new Set<string>();

  toggleColumnPrefs(event: Event): void {
    event.stopPropagation();
    this.showColumnPrefs = !this.showColumnPrefs;
  }

  isColumnVisible(key: string): boolean {
    return !this.userHiddenColumns.has(key.toLowerCase());
  }

  toggleColumnVisibility(key: string, checked: boolean): void {
    const lowKey = key.toLowerCase();
    const parentVisible = this.parentVisibleColumns;

    if (checked) {
      this.userHiddenColumns.delete(lowKey);
    } else {
      this.userHiddenColumns.add(lowKey);

      // Check if all parentVisibleColumns are now hidden
      const anyVisible = parentVisible.some(col => !this.userHiddenColumns.has(col.key.toLowerCase()));
      if (!anyVisible && parentVisible.length > 0) {
        const firstKey = parentVisible[0].key.toLowerCase();
        this.userHiddenColumns.delete(firstKey);
      }
    }
    this.saveColumnPrefs();
    this.cdr.markForCheck();
  }

  get allColumnsVisible(): boolean {
    const parentVisible = this.parentVisibleColumns;
    if (parentVisible.length === 0) return false;
    return parentVisible.every(col => this.isColumnVisible(col.key));
  }

  get someColumnsHidden(): boolean {
    const parentVisible = this.parentVisibleColumns;
    if (parentVisible.length === 0) return false;
    const hiddenCount = parentVisible.filter(col => !this.isColumnVisible(col.key)).length;
    return hiddenCount > 0 && hiddenCount < parentVisible.length;
  }

  toggleAllColumnsVisibility(visible: boolean): void {
    const parentVisible = this.parentVisibleColumns;
    if (visible) {
      parentVisible.forEach(col => {
        this.userHiddenColumns.delete(col.key.toLowerCase());
      });
    } else {
      // Hide all columns EXCEPT the first one
      parentVisible.forEach((col, index) => {
        const lowKey = col.key.toLowerCase();
        if (index === 0) {
          this.userHiddenColumns.delete(lowKey);
        } else {
          this.userHiddenColumns.add(lowKey);
        }
      });
    }
    this.saveColumnPrefs();
    this.cdr.markForCheck();
  }

  isLastVisibleColumn(key: string): boolean {
    const visible = this.visibleColumns;
    return visible.length === 1 && visible[0].key.toLowerCase() === key.toLowerCase();
  }

  getStorageKey(): string {
    // const path = typeof window !== 'undefined' ? window.location.pathname : '';
    // return `ui-grid-prefs-${path}-${this.ref_name || this.title || ''}`;
    return `${this.ref_name}`;
  }

  saveColumnPrefs(): void {
    try {
      const key = this.getStorageKey();
      const hiddenArray = Array.from(this.userHiddenColumns);
      this.localStorageService.setEncryptItem(key, hiddenArray);
    } catch (e) {
      console.warn('Failed to save column preferences to localStorage', e);
    }
  }

  loadColumnPrefs(): void {
    try {
      const key = this.getStorageKey();
      const hiddenArray = this.localStorageService.getDecryptItem<string[]>(key);
      if (hiddenArray && Array.isArray(hiddenArray)) {
        this.userHiddenColumns = new Set(hiddenArray.map(k => String(k).toLowerCase()));
        return;
      }
      this.userHiddenColumns = new Set<string>();
    } catch (e) {
      console.warn('Failed to load column preferences from localStorage', e);
      this.userHiddenColumns = new Set<string>();
    }
  }

  private onDocumentClick = () => {
    if (this.showColumnPrefs) {
      this.showColumnPrefs = false;
      this.cdr.markForCheck();
    }
  };

  // Sorting
  sortKey: string | null = null;
  sortOrder: 'asc' | 'desc' | null = null;
  originalData: any[] = [];

  isColumnSortable(key: string): boolean {
    if (!key) return false;
    const lowKey = key.toLowerCase();

    if (this.nonSortableColumns && Array.isArray(this.nonSortableColumns)) {
      if (this.nonSortableColumns.some(k => String(k).toLowerCase() === lowKey)) {
        return false;
      }
    }

    if (this.sortableColumns === 'all') {
      return true;
    }
    if (Array.isArray(this.sortableColumns)) {
      return this.sortableColumns.some(k => String(k).toLowerCase() === lowKey);
    }
    return false;
  }

  handleSort(key: string): void {
    if (!this.isColumnSortable(key)) return;
    if (this.sortKey !== key) {
      this.sortKey = key;
      this.sortOrder = 'asc';
    } else {
      if (this.sortOrder === 'asc') {
        this.sortOrder = 'desc';
      } else if (this.sortOrder === 'desc') {
        this.sortOrder = null;
        this.sortKey = null;
      } else {
        this.sortOrder = 'asc';
      }
    }
    this.applySort();
  }

  applySort(): void {
    if (!this.sortKey || !this.sortOrder) {
      if (this.originalData && this.originalData.length > 0) {
        this.data = [...this.originalData];
      }
      this.computeDisplayData();
      return;
    }

    const key = this.sortKey;
    const order = this.sortOrder;

    this.data.sort((a, b) => {
      let valA = this.resolveCell(a, key);
      let valB = this.resolveCell(b, key);

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      const isNumA = typeof valA === 'number' || (!isNaN(Number(valA)) && valA !== '');
      const isNumB = typeof valB === 'number' || (!isNaN(Number(valB)) && valB !== '');

      if (isNumA && isNumB) {
        const numA = Number(valA);
        const numB = Number(valB);
        return order === 'asc' ? numA - numB : numB - numA;
      } else {
        const strA = String(valA).trim();
        const strB = String(valB).trim();
        return order === 'asc'
          ? strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' })
          : strB.localeCompare(strA, undefined, { numeric: true, sensitivity: 'base' });
      }
    });

    this.computeDisplayData();
  }
}

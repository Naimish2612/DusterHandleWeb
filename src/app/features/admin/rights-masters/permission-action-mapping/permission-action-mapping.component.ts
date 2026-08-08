import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTreeModule } from 'ng-zorro-antd/tree';
import type {
  NzTreeNodeOptions,
  NzFormatEmitEvent,
  NzTreeNode,
  NzTreeComponent,
} from 'ng-zorro-antd/tree';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { NotificationService } from '../../../../core/infrastructure/notification.service';

interface ActionItem {
  id: string | number;
  value: string;
  group?: string;
}

@Component({
  selector: 'app-permission-action-mapping',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NzFormModule,
    NzDividerModule,
    NzCardModule,
    NzSpinModule,
    NzIconModule,
    NzButtonModule,
    NzInputModule,
    NzTreeModule,
  ],
  standalone: true,
  templateUrl: './permission-action-mapping.component.html',
  styleUrl: './permission-action-mapping.component.scss',
})
export class PermissionActionMappingComponent implements OnInit {
  @ViewChild('tree', { static: false })
  treeComponent!: NzTreeComponent;

  permissionCode!: string;

  actions: ActionItem[] = [];
  treeNodes: NzTreeNodeOptions[] = [];
  checkedKeys: string[] = [];
  expandedKeys: string[] = [];
  halfCheckedKeys: string[] = [];
  searchValue = '';

  selectAll = false;
  loading = false;
  private readonly USE_DUMMY_ACTIONS = true;

  public route = inject(ActivatedRoute);
  public router = inject(Router);
  public loadingService = inject(LoadingService);
  public api = inject(ApiCallService);
  public notification = inject(NotificationService);
  public message = inject(NzMessageService);
  cdr = inject(ChangeDetectorRef);


  treeData: NzTreeNodeOptions[] = [];

  ngOnInit(): void {
    this.permissionCode = this.route.snapshot.paramMap.get('permissionCode')!;
    this.loadActionTree();
  }

  private loadActionTree(): void {
    this.loading = true;
    this.loadingService.showGlobal('');
    
    // Changing URL from a path segment style to match your query parameter setup if needed, 
    // or leave as-is if using route parameter matches.
    this.api
      .get<any>('common', `${API_ENDPOINTS.RIGHTS_MASTER.ACTION_LIST_FOR_TREE}/${this.permissionCode}`)
      .pipe(
        finalize(() => {
          this.loadingService.hideGlobal();
          this.loading = false;
        }),
      )
      .subscribe({
        next: (res) => {
          // 1. Process tree data layout mapping
          this.treeData = this.mapToNzTree(res.data ?? []);
          
          // 2. Extract strictly checked leaf keys to pre-fill checkboxes without parent inheritance side effects
          const initialCheckedKeys: string[] = [];
          this.extractCheckedLeafKeys(res.data ?? [], initialCheckedKeys);
          this.checkedKeys = initialCheckedKeys;

          this.cdr.detectChanges();
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message: err.message || 'Action Fetching failed. Please try again.',
          });
        },
      });
  }
  private extractCheckedLeafKeys(nodes: any[], targetKeys: string[]): void {
    nodes.forEach((node) => {
      const isLeaf = !node.children || node.children.length === 0;
      
      // Only push if it's checked AND a leaf node
      if (node.isChecked && isLeaf) {
        targetKeys.push(node.key.toString());
      }

      if (node.children && node.children.length > 0) {
        this.extractCheckedLeafKeys(node.children, targetKeys);
      }
    });
  }

  /** Convert backend tree → NzTreeNodeOptions */
  private mapToNzTree(nodes: any[]): NzTreeNodeOptions[] {
    return nodes.map((n) => ({
      title: n.title,
      key: n.key.toString(),
      isLeaf: !n.children || n.children.length === 0,
      children: n.children ? this.mapToNzTree(n.children) : [],
    }));
  }

  /** Search logic */
  onSearch(value: string): void {
    this.searchValue = value;
    this.expandedKeys = [];
    this.searchTree(this.treeData, value);
  }

  private searchTree(nodes: NzTreeNodeOptions[], value: string): boolean {
    let found = false;

    nodes.forEach((node) => {
      const match = node.title.toLowerCase().includes(value.toLowerCase());

      const childFound = node.children
        ? this.searchTree(node.children, value)
        : false;

      if (match || childFound) {
        this.expandedKeys.push(node.key as unknown as string);
        found = true;
      }
    });

    return found;
  }

  /** Collect checked action codes */
  // onCheckedKeysChange(keys: any[]): void {
  //   this.checkedKeys = keys;
  // }

  onTreeCheck(event: NzFormatEmitEvent): void {
    if (!this.treeComponent) return;

    this.checkedKeys = [];
    this.halfCheckedKeys = [];

    const nodes = this.treeComponent.getTreeNodes();
    nodes.forEach((node) => this.collectCheckState(node));

    // console.log('Checked:', this.checkedKeys);
    // console.log('Half checked:', this.halfCheckedKeys);
  }

  private collectCheckState(node: NzTreeNode): void {
    if (node.isChecked) {
      this.checkedKeys.push(node.key as any);
    } else if (node.isHalfChecked) {
      this.halfCheckedKeys.push(node.key as any);
    }

    if (node.children) {
      node.children.forEach((child) => this.collectCheckState(child));
    }
  }

  /** Save mapping */
  save(): void {
    if (this.checkedKeys.length === 0) {
      this.message.warning('Please select at least one action.');
      return;
    }

    this.loadingService.showGlobal('');

    const payload = {
      permission_code: this.permissionCode,
      action_codes:[...this.checkedKeys, ...this.halfCheckedKeys],

    };

    this.api
      .post<null>(
        'common',
        API_ENDPOINTS.RIGHTS_MASTER.PERMISSION_ACTION_MAPPING,
        payload,
      )
      .pipe(
        finalize(() => {
          this.loadingService.hideGlobal();
        }),
      )
      .subscribe({
        next: (res) => {
          this.notification.Success({
            title: '',
            message: res.message || 'Permission action mapping successfully.',
          });
          this.router.navigate(['/admin/permission/master']);
        },
        error: (err) => {
          this.notification.Error({
            title: 'Error',
            message:
              err.message ||
              'Permission Action mapping failed. Please try again.',
          });
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/admin/permission/master']);
  }
}
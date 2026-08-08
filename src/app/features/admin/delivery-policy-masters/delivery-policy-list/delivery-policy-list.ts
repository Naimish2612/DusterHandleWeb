import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTableModule } from 'ng-zorro-antd/table';
import { UiGridComponent } from '../../../../shared/ui/ui-grid/ui-grid.component';
import { PermissionService } from '../../../../core/infrastructure/permission.service';
import { ApiCallService } from '../../../../core/infrastructure/api-call.service';
import { LoadingService } from '../../../../core/infrastructure/loading.service';
import { API_ENDPOINTS } from '../../../../core/global-api-endpoints/api-endpoints';
import { map, Subject } from 'rxjs';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NotificationService } from '../../../../core/infrastructure/notification.service';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';

@Component({
  selector: 'app-delivery-policy-list',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    UiGridComponent,
    NzCardModule,
    NzIconModule,
    NzDividerModule,
    NzModalModule,
    NzButtonModule,
    NzTableModule,
    NzInputNumberModule
  ],
  templateUrl: './delivery-policy-list.html',
  styleUrl: './delivery-policy-list.scss',
})
export class DeliveryPolicyList implements OnInit {
  deliveryPolicyGridReload$ = new Subject<void>();
  permission = inject(PermissionService);
  router = inject(Router);
  api = inject(ApiCallService);
  loader = inject(LoadingService);
  message = inject(NzMessageService);
  nzModalService = inject(NzModalService);
  notification = inject(NotificationService)

  deliveryPolicyGridDataSource = {
    load: () =>
      this.api
        .get<any>('common', API_ENDPOINTS.DELIVERY_POLICY.LIST)
        .pipe(map((res) => res.data ?? [])),
  };

  showSlabModal: boolean = false;
  currentPolicyId: number | null = null;
  currentPolicyName: string = '';
  slabsList: any[] = [];
  originalSlabsList: any[] = []; // Store original database rows

  editingSlabIdx: number | null = null;
  editingSlabRangeEnd: number | null = null;
  editingSlabPercentage: number | null = null;

  newSlabRangeStart: number = 0;
  newSlabRangeEnd: number | null = null;
  newSlabPercentage: number | null = null;

  ngOnInit(): void { }

  get hasEditPermission(): boolean {
    return this.permission.allowedActions$().has('update_delivery_policy');
  }
  get hasViewSlabPermisison(): boolean {
    return this.permission.allowedActions$().has('delivery_policy_slab_list');
  }
  get hasEditSlabPermission(): boolean {
    return this.permission.allowedActions$().has('update_delivery_policy_slab');
  }
  get hasAddSlabPermission(): boolean {
    return this.permission.allowedActions$().has('add_delivery_policy_slab');
  }

  get hasTogglePermission(): boolean {
    return this.permission.allowedActions$().has('toggle_delivery_policy_activation');
  }

  navigateToAdd() {
    this.router.navigate(['admin/add/delivery/policy']);
  }

  onAction($event: { actionKey: string; row: any }) {
    const { actionKey, row } = $event;
    if (actionKey === 'edit') {
      this.router.navigate(['admin/add/delivery/policy'], { state: { data: row } });
    }
    if (actionKey === 'viewSlabs') {
      this.currentPolicyId = row.delivery_policy_id;
      this.currentPolicyName = row.policy_name;
      this.loadSlabs(row.delivery_policy_id);
    }
    if (actionKey === 'toggleActive') {
      this.nzModalService.confirm({
        nzTitle: 'Are you sure you want to toggle the activation status of this delivery policy?',
        nzOkText: 'Yes',
        nzCancelText: 'No',
        nzOkDanger: true,
        nzOnOk: () => this.toggleActivation(row),
      });
    }
  }

  toggleActivation(row: any) {
    this.loader.showGlobal('Toggling delivery policy status...');
    this.api
      .post<any>('common', `${API_ENDPOINTS.DELIVERY_POLICY.TOGGLE_STATUS}/${row.delivery_policy_id}`, {})
      .subscribe({
        next: () => {
          this.deliveryPolicyGridReload$.next();
          this.message.success('Delivery policy status updated successfully');
          this.loader.hideGlobal();
        },
        error: (err) => {
          this.loader.hideGlobal();
          this.message.error(err.raw.error.data || 'Failed to toggle delivery policy status');
          console.error('Toggle status failed', err);
        },
      });
  }

  loadSlabs(policyId: number) {
    this.loader.showGlobal('Loading slabs...');
    this.api
      .get<any>('common', `${API_ENDPOINTS.DELIVERY_POLICY.SLAB_LIST_BY_ID}/${policyId}`)
      .subscribe({
        next: (res) => {
          this.loader.hideGlobal();
          this.slabsList = res.data || [];

          this.slabsList.sort((a, b) => a.range_start - b.range_start);

          this.originalSlabsList = JSON.parse(JSON.stringify(this.slabsList));
          if (this.slabsList.length > 0) {
            const lastSlab = this.slabsList[this.slabsList.length - 1];
            this.newSlabRangeStart = lastSlab.range_end + 1;
          } else {
            this.newSlabRangeStart = 0;
          }

          this.cancelEditSlab();
          this.showSlabModal = true;
        },
        error: (err) => {
          this.loader.hideGlobal();
          this.message.error(err.message || 'Failed to load policy slabs');
          console.error('Load slabs failed', err);
        },
      });
  }

  startEditSlab(idx: number, slab: any) {
    this.editingSlabIdx = idx;
    this.editingSlabRangeEnd = slab.range_end;
    this.editingSlabPercentage = slab.percentage;
  }

  cancelEditSlab() {
    this.editingSlabIdx = null;
    this.editingSlabRangeEnd = null;
    this.editingSlabPercentage = null;
  }

  saveEditedSlab(idx: number) {
    if (this.editingSlabRangeEnd === null || this.editingSlabPercentage === null) {
      this.message.warning('Please enter valid inputs');
      return;
    }
    const slabToUpdate = this.slabsList[idx];
    if (this.editingSlabRangeEnd <= slabToUpdate.range_start) {
      this.message.warning('Range End must be greater than Range Start');
      return;
    }
    if (this.editingSlabPercentage < 0) {
      this.message.warning('Percentage cannot be negative');
      return;
    }
    if (this.editingSlabPercentage > 100) {
      this.message.warning('Percentage cannot be greater than 100');
      return;
    }

    // Apply edits locally first (including range adjustments)
    const updatedSlabs = this.slabsList.map((s, i) => {
      if (i === idx) {
        return {
          ...s,
          range_end: this.editingSlabRangeEnd!,
          percentage: this.editingSlabPercentage!,
        };
      }
      return s;
    });

    let nextStart = 0;
    const resolvedSlabs = updatedSlabs.map((s) => {
      const updated = { ...s, range_start: nextStart };
      nextStart = s.range_end + 1;
      return updated;
    });

    // Find all existing slabs that were modified
    const modifiedExisting = resolvedSlabs.filter((s) => {
      if (s.slab_id <= 0) return false;
      const original = this.originalSlabsList.find((o) => o.slab_id === s.slab_id);
      return (
        !original ||
        original.range_start !== s.range_start ||
        original.range_end !== s.range_end ||
        original.percentage !== s.percentage
      );
    });

    const proceedWithSave = () => {
      if (modifiedExisting.length > 0) {
        this.loader.showGlobal('Updating slabs...');
        const saveSlabSequence = (seqIdx: number) => {
          if (seqIdx >= modifiedExisting.length) {
            this.loader.hideGlobal();
            this.message.success('Slab updated successfully');
            this.slabsList = resolvedSlabs;
            this.newSlabRangeStart = nextStart;
            this.originalSlabsList = JSON.parse(JSON.stringify(this.slabsList));
            this.cancelEditSlab();
            return;
          }

          this.api
            .post<any>('common', API_ENDPOINTS.DELIVERY_POLICY.EDIT_SLAB, modifiedExisting[seqIdx])
            .subscribe({
              next: () => saveSlabSequence(seqIdx + 1),
              error: (err) => {
                this.loader.hideGlobal();
                if(err.message == "Validation failed"){
                  console.log(err.raw.error.data)
                  this.message.error(err.raw.error.data || 'Failed to update slab');
                  this.cancelEditSlab();
                }else{
                  this.message.error(err.message || 'Failed to update slab');
                  this.cancelEditSlab();
                }
              },
            });
        };

        saveSlabSequence(0);
      } else {
        // Just local edit (e.g. if it was a new unsaved slab or no values changed)
        this.slabsList = resolvedSlabs;
        this.newSlabRangeStart = nextStart;
        this.cancelEditSlab();
      }
    };

    if (modifiedExisting.length > 0) {
      this.nzModalService.confirm({
        nzTitle: 'Are you sure you want to update this slab?',
        nzContent: 'Updating this slab will automatically recalculate and update the start/end ranges of subsequent slabs to maintain continuity.',
        nzOkText: 'Yes, Update',
        nzCancelText: 'Cancel',
        nzOnOk: () => proceedWithSave(),
      });
    } else {
      proceedWithSave();
    }
  }

  addSlabRow() {
    if (this.newSlabRangeEnd === null || this.newSlabPercentage === null) {
      this.message.warning('Please enter valid Range End and Slab Percentage');
      return;
    }
    if (this.newSlabRangeEnd <= this.newSlabRangeStart) {
      this.message.warning('Range End must be greater than Range Start');
      return;
    }
    if (this.newSlabPercentage < 0) {
      this.message.warning('Percentage cannot be negative');
      return;
    }
    if (this.newSlabPercentage > 100) {
      this.message.warning('Percentage cannot be greater than 100');
      return;
    }

    this.slabsList = [
      ...this.slabsList,
      {
        slab_id: 0, // Mark as new row
        delivery_policy_id: this.currentPolicyId,
        range_start: this.newSlabRangeStart,
        range_end: this.newSlabRangeEnd,
        percentage: this.newSlabPercentage,
      },
    ];

    this.newSlabRangeStart = this.newSlabRangeEnd + 1;
    this.newSlabRangeEnd = null;
    this.newSlabPercentage = null;
  }

  removeSlabRow(idx: number) {
    this.slabsList = this.slabsList.filter((_, i) => i !== idx);

    let nextStart = 0;
    this.slabsList = this.slabsList.map((slab) => {
      const updatedSlab = {
        ...slab,
        range_start: nextStart,
      };
      nextStart = slab.range_end + 1;
      return updatedSlab;
    });

    this.newSlabRangeStart = nextStart;
    this.cancelEditSlab();
  }

  submitSlabs() {
    const newSlabs = this.slabsList.filter((s) => s.slab_id === 0);

    if (newSlabs.length === 0) {
      this.closeSlabModal();
      return;
    }

    this.loader.showGlobal('Saving delivery slabs...');
    this.api
      .post<any>('common', API_ENDPOINTS.DELIVERY_POLICY.CREATE_SLAB, newSlabs)
      .subscribe({
        next: () => {
          this.loader.hideGlobal();
          this.message.success('Delivery slabs saved successfully');
          this.closeSlabModal();
        },
        error: (err) => {
          this.loader.hideGlobal();
          this.message.error(err.message || 'Failed to create new slabs');
        },
      });
  }

  closeSlabModal() {
    this.showSlabModal = false;
    this.currentPolicyId = null;
    this.currentPolicyName = '';
    this.slabsList = [];
    this.originalSlabsList = [];
    this.newSlabRangeStart = 0;
    this.newSlabRangeEnd = null;
    this.newSlabPercentage = null;
    this.cancelEditSlab();
  }

  refresh() {
    this.deliveryPolicyGridReload$.next();
  }
}

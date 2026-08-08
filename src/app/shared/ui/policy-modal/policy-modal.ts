import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { PolicyService, PolicyResponse } from '../../../features/public/services/policy.service';
import { ResponseEntity } from '../../../shared/models/response-entity';

@Component({
    selector: 'app-policy-modal',
    templateUrl: './policy-modal.html',
    styleUrls: ['./policy-modal.scss'],
    standalone: true,
    imports: [CommonModule],
})
export class PolicyModalComponent implements OnChanges, OnDestroy {

    @Input() policyKey: string = '';
    @Input() isVisible: boolean = false;
    @Output() closeModal = new EventEmitter<void>();

    policyData: PolicyResponse | null = null;
    isLoading: boolean = false;
    hasError: boolean = false;
    errorMessage: string = '';
    cdr = inject(ChangeDetectorRef);

    // ✅ Prevents memory leaks & cancels in-flight requests
    private destroy$ = new Subject<void>();

    private policyMeta: Record<string, { icon: string; fallbackTitle: string }> = {
        privacy_policy: { icon: '🔒', fallbackTitle: 'Privacy Policy' },
        terms_of_service: { icon: '📋', fallbackTitle: 'Terms of Service' },
        cookie_policy: { icon: '🍪', fallbackTitle: 'Cookie Policy' },
        help_center: { icon: '❓', fallbackTitle: 'Help Center' }
    };

    constructor(private policyService: PolicyService) { }

    ngOnChanges(changes: SimpleChanges): void {
        const visibilityChanged = changes['isVisible'];
        const keyChanged = changes['policyKey'];

        const modalJustOpened = visibilityChanged?.currentValue === true;
        const keyJustChanged = !!keyChanged?.currentValue;

        // ✅ Case 1: Modal opened — fetch once and return
        if (modalJustOpened && this.policyKey) {
            this.fetchPolicy(this.policyKey);
            return; // ← prevents Case 2 from double-firing
        }

        // ✅ Case 2: Key changed while modal ALREADY open (not during open event)
        if (keyJustChanged && this.isVisible && !modalJustOpened) {
            this.fetchPolicy(keyChanged.currentValue);
        }

        // ✅ Case 3: Modal closed — reset state
        if (visibilityChanged?.currentValue === false) {
            this.resetState();
        }
    }

    fetchPolicy(key: string): void {
        // ✅ Cancel any previous in-flight request
        this.destroy$.next();

        this.isLoading = true;
        this.hasError = false;
        this.policyData = null;

        this.policyService.getPolicyByKey(key)
            .pipe(takeUntil(this.destroy$))   // ✅ auto-cancel on destroy or new call
            .subscribe({
                next: (response: ResponseEntity<PolicyResponse>) => {
                    this.policyData = response.data ?? null;

                    console.log('✅ Policy fetched:', this.policyData);
                    if (!this.policyData) {
                        this.hasError = true;
                        this.errorMessage = 'No content available.';
                    }

                    this.isLoading = false;
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    this.isLoading = false;
                    this.hasError = true;
                    this.errorMessage = err?.error?.message || 'Failed to load content. Please try again.';
                    this.cdr.detectChanges();
                }
            });
    }

    private resetState(): void {
        this.policyData = null;
        this.isLoading = false;
        this.hasError = false;
        this.errorMessage = '';
    }

    get meta() {
        return this.policyMeta[this.policyKey] || { icon: '📄', fallbackTitle: 'Policy' };
    }

    get displayTitle(): string {
        return this.policyData?.title || this.meta.fallbackTitle;
    }

    onClose(): void { this.closeModal.emit(); }

    onOverlayClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('policy-overlay')) {
            this.onClose();
        }
    }

    stopPropagation(event: MouseEvent): void { event.stopPropagation(); }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
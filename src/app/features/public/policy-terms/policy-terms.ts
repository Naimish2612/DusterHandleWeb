import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { PolicyService, PolicyResponse } from '../services/policy.service';
import { ResponseEntity } from '../../../shared/models/response-entity';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
    selector: 'app-policy-terms',
    standalone: true,
    imports: [CommonModule, NzIconModule],
    templateUrl: './policy-terms.html',
    styleUrls: ['./policy-terms.scss']
})
export class PolicyTerms implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private policyService = inject(PolicyService);
    private titleService = inject(Title);
    private cdr = inject(ChangeDetectorRef);

    policyKey: string = '';
    policyData: PolicyResponse | null = null;
    isLoading: boolean = false;
    hasError: boolean = false;
    errorMessage: string = '';

    private destroy$ = new Subject<void>();

    private policyMeta: Record<string, { icon: string; theme: 'outline' | 'fill' | 'twotone'; color?: string; fallbackTitle: string; }> = {
        privacy_policy: { icon: 'lock', theme: 'twotone', color: '#faad14', fallbackTitle: 'Privacy Policy' },
        terms_of_service: { icon: 'file-text', theme: 'twotone', color: '#1890ff', fallbackTitle: 'Terms & Conditions' },
        cookie_policy: { icon: 'smile', theme: 'twotone', color: '#d48806', fallbackTitle: 'Cookie Policy' },
        return_policy: { icon: 'interaction', theme: 'twotone', color: '#52c41a', fallbackTitle: 'Return Policy' },
        refund_policy: { icon: 'wallet', theme: 'twotone', color: '#52c41a', fallbackTitle: 'Refund Policy' },
        replacement_policy: { icon: 'interaction', theme: 'twotone', color: '#722ed1', fallbackTitle: 'Replacement Policy' },
        grievance_redressal_policy: { icon: 'notification', theme: 'twotone', color: '#ff4d4f', fallbackTitle: 'Grievance Redressal Policy' }
    };

    ngOnInit(): void {
        combineLatest([this.route.data, this.route.paramMap])
            .pipe(takeUntil(this.destroy$))
            .subscribe(([data, params]) => {
                const key = data['policyKey'] || params.get('policyKey');
                if (key) {
                    this.policyKey = key;
                    this.fetchPolicy(key);
                } else {
                    this.hasError = true;
                    this.errorMessage = 'Invalid policy specified.';
                }
            });
    }

    fetchPolicy(key: string): void {
        this.destroy$.next(); // Cancel any previous request
        this.isLoading = true;
        this.hasError = false;
        this.policyData = null;

        this.policyService.getPolicyByKey(key)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: ResponseEntity<PolicyResponse>) => {
                    this.policyData = response.data ?? null;

                    this.titleService.setTitle(`${this.displayTitle} | Our Application`);

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

    get meta() {
        return this.policyMeta[this.policyKey] || { icon: 'file-text', theme: 'twotone' as const, color: '#8c8c8c', fallbackTitle: 'Policy' };
    }

    get displayTitle(): string {
        return this.policyData?.title || this.meta.fallbackTitle;
    }

    retry(): void {
        if (this.policyKey) {
            this.fetchPolicy(this.policyKey);
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { BannerItem, BannerService } from '../services/banner.service';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-banner',
    standalone: true,
    imports: [CommonModule, NzSkeletonModule, NzButtonModule, NzIconModule, RouterLink, NzSpinModule],
    templateUrl: './banner.html',
    styleUrl: './banner.scss',
})
export class Banner implements OnInit, OnDestroy {
    banners: BannerItem[] = [];
    currentIndex = 0;
    isLoading = true;
    hasError = false;
    private intervalId!: any;

    readonly skeletonDots = [1, 2, 3];
    constructor(
        private cdr: ChangeDetectorRef,
        private bannerService: BannerService
    ) { }

    ngOnInit(): void {
        this.loadBanners();
    }

    loadBanners(): void {
        this.isLoading = true;
        this.hasError = false;
        this.cdr.detectChanges();

        this.bannerService.getBanners(0, 'Web').subscribe({
            next: () => {
                this.banners = this.bannerService.banners();
                this.isLoading = false;
                // Disable auto slide so panels only change on hover/interaction
                // if (this.banners.length > 0) {
                //     this.startAutoSlide();
                // }
                this.cdr.detectChanges();
            },
            error: (err) => {
                this.isLoading = false;
                this.hasError = true;
                this.cdr.detectChanges();
            },
        });
    }


    startAutoSlide(): void {
        this.intervalId = setInterval(() => {
            this.currentIndex = (this.currentIndex + 1) % this.banners.length;
            this.cdr.detectChanges();
        }, 4000);
    }

    ngOnDestroy(): void {
        clearInterval(this.intervalId);
    }

    next(): void {
        this.currentIndex = (this.currentIndex + 1) % this.banners.length;
    }

    prev(): void {
        this.currentIndex =
            (this.currentIndex - 1 + this.banners.length) % this.banners.length;
    }

    goTo(index: number): void {
        this.currentIndex = index;
    }

    onMobileScroll(track: HTMLElement): void {
        if (!track || !track.clientWidth) return;
        const index = Math.round(track.scrollLeft / track.clientWidth);
        if (index !== this.currentIndex && index >= 0 && index < this.banners.length) {
            this.currentIndex = index;
            this.cdr.detectChanges();
        }
    }
}
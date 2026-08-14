import {
  Component,
  signal,
  computed,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
// @ts-ignore
import { PageFlip } from 'page-flip';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

@Component({
  selector: 'app-catalogue',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, NzToolTipModule],
  templateUrl: './catalogue.html',
  styleUrl: './catalogue.scss',
})
export class Catalogue implements AfterViewInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);

  readonly pdfPath = 'assets/images/pdf/2026 Duster Metal Product PVT. LTD..pdf';

  @ViewChild('flipbookContainer') flipbookContainer?: ElementRef<HTMLDivElement>;

  isFullscreen = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  loadingProgress = signal<number>(0);

  currentPage = signal<number>(0);
  totalPages = signal<number>(0);
  showThumbnails = signal<boolean>(false);

  private pageFlip: PageFlip | null = null;
  private pdfDoc: any = null;
  pageImages: string[] = [];
  private isDestroyed = false;

  pageDisplayString = computed<string>(() => {
    const cur = this.currentPage();
    const total = this.totalPages();
    if (total === 0) return 'Loading Booklet...';
    if (cur === 0) return `Page 1 of ${total} (Cover)`;
    return `Page ${cur + 1} of ${total}`;
  });

  ngAfterViewInit(): void {
    this.initBooklet();
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.pageFlip) {
      try {
        this.pageFlip.destroy();
      } catch (e) {
        // cleanup
      }
    }
  }

  private async renderPageImage(pageNumber: number): Promise<string> {
    if (!this.pdfDoc) return '';
    const page = await this.pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      await page.render({ canvasContext: context, viewport, canvas } as any).promise;
      return canvas.toDataURL('image/jpeg', 0.80);
    }
    return '';
  }

  private async initBooklet(): Promise<void> {
    try {
      this.isLoading.set(true);
      const loadingTask = pdfjsLib.getDocument({
        url: this.pdfPath,
        cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
      });

      this.pdfDoc = await loadingTask.promise;
      if (this.isDestroyed) return;

      const numPages = this.pdfDoc.numPages;
      this.totalPages.set(numPages);

      const images: string[] = [];

      // Render all PDF pages into images with continuous progress bar
      for (let i = 1; i <= numPages; i++) {
        if (this.isDestroyed) return;
        const imgData = await this.renderPageImage(i);
        images.push(imgData);

        this.loadingProgress.set(Math.round((i / numPages) * 100));
        this.cdr.markForCheck();

        // Micro-yield to keep progress UI updating smoothly
        if (i % 4 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      this.pageImages = images;
      this.isLoading.set(false);
      this.cdr.markForCheck();

      setTimeout(() => {
        this.mountPageFlip();
      }, 50);
    } catch (error) {
      console.error('Failed to load PDF FlipBook:', error);
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  private mountPageFlip(): void {
    if (!this.flipbookContainer || !this.pageImages.length || this.isDestroyed) return;

    const element = this.flipbookContainer.nativeElement;

    this.pageFlip = new PageFlip(element, {
      width: 550,
      height: 750,
      size: 'stretch',
      minWidth: 300,
      maxWidth: 1000,
      minHeight: 400,
      maxHeight: 1350,
      maxShadowOpacity: 0.5,
      showCover: true,
      drawShadow: true,
      flippingTime: 700,
      usePortrait: true,
      startPage: 0
    });

    this.pageFlip.loadFromImages(this.pageImages);

    this.pageFlip.on('flip', (e: any) => {
      this.currentPage.set(e.data);
      this.cdr.markForCheck();
    });
  }

  nextPage(): void {
    if (this.pageFlip) {
      this.pageFlip.flipNext();
    }
  }

  prevPage(): void {
    if (this.pageFlip) {
      this.pageFlip.flipPrev();
    }
  }

  firstPage(): void {
    if (this.pageFlip) {
      this.pageFlip.turnToPage(0);
    }
  }

  lastPage(): void {
    if (this.pageFlip && this.totalPages() > 0) {
      this.pageFlip.turnToPage(this.totalPages() - 1);
    }
  }

  goToPage(pageIndex: number): void {
    if (this.pageFlip) {
      this.pageFlip.turnToPage(pageIndex);
      this.showThumbnails.set(false);
    }
  }

  toggleThumbnails(): void {
    this.showThumbnails.update((v) => !v);
  }

  toggleFullscreen(): void {
    this.isFullscreen.update((v) => !v);
  }

  get pagesArray(): number[] {
    const arr: number[] = [];
    for (let i = 0; i < this.totalPages(); i++) {
      arr.push(i);
    }
    return arr;
  }
}

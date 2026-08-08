import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { PolicyModalComponent } from "../../../../shared/ui/policy-modal/policy-modal";

@Component({
  selector: 'app-auth-layout',
  imports: [CommonModule, RouterOutlet, NzIconModule, RouterLink, PolicyModalComponent],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {
  currentYear = new Date().getFullYear();

  // ─── Policy Modal State ───────────────────────────
  isPolicyModalOpen = false;
  activePolicyKey = '';

  openPolicy(key: string): void {
    this.activePolicyKey = key;
    this.isPolicyModalOpen = true;
  }

  closePolicy(): void {
    this.isPolicyModalOpen = false;
    this.activePolicyKey = '';
  }
}

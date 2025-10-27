import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-customization',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customization.html',
  styleUrl: './customization.css'
})
export class CustomizationComponent {
  protected isPanelVisible = signal(true);
  protected zoomLevel = signal(17);
  protected activeView = signal(0); // 0: front, 1: back, 2: neck label

  constructor(private router: Router) {}

  togglePanel(): void {
    this.isPanelVisible.set(!this.isPanelVisible());
  }

  closePanel(): void {
    this.isPanelVisible.set(false);
  }

  zoomIn(): void {
    const current = this.zoomLevel();
    if (current < 200) {
      this.zoomLevel.set(current + 5);
    }
  }

  zoomOut(): void {
    const current = this.zoomLevel();
    if (current > 10) {
      this.zoomLevel.set(current - 5);
    }
  }

  zoomFit(): void {
    this.zoomLevel.set(100);
  }

  selectView(index: number): void {
    this.activeView.set(index);
  }

  goBack(): void {
    this.router.navigate(['/apparel']);
  }

  saveProduct(): void {
    console.log('Saving product...');
    // Implement save logic
  }
}
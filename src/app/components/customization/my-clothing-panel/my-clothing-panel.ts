import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ProductVariant {
  id: number;
  color: string;
  colorHex: string;
  size: string;
  noPrintPrice: number;
  frontPrintPrice: number;
  backPrintPrice: number;
  selected: boolean;
}

@Component({
  selector: 'app-my-clothing-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-clothing-panel.html',
  styleUrl: './my-clothing-panel.css'
})
export class MyClothingPanelComponent {
  @Output() closed = new EventEmitter<void>();

  // Sample variant data matching the screenshot
  variants = signal<ProductVariant[]>([
    { id: 1, color: 'White', colorHex: '#FFFFFF', size: 'small', noPrintPrice: 100.00, frontPrintPrice: 150.00, backPrintPrice: 200.00, selected: false },
    { id: 2, color: 'Black', colorHex: '#000000', size: 'small', noPrintPrice: 100.00, frontPrintPrice: 150.00, backPrintPrice: 200.00, selected: false },
    { id: 3, color: 'Blue', colorHex: '#0066CC', size: 'small', noPrintPrice: 100.00, frontPrintPrice: 150.00, backPrintPrice: 200.00, selected: false },
    { id: 4, color: 'Red', colorHex: '#DC3545', size: 'small', noPrintPrice: 100.00, frontPrintPrice: 150.00, backPrintPrice: 200.00, selected: false },
    { id: 5, color: 'Acid Wash', colorHex: '#E0E0E0', size: 'small', noPrintPrice: 100.00, frontPrintPrice: 150.00, backPrintPrice: 200.00, selected: false },
    { id: 6, color: 'Denim', colorHex: '#5F9EA0', size: 'small', noPrintPrice: 100.00, frontPrintPrice: 150.00, backPrintPrice: 200.00, selected: false }
  ]);

  availableSizes = ['small', 'medium', 'large'];

  onClose(): void {
    this.closed.emit();
  }

  toggleSelection(variant: ProductVariant): void {
    variant.selected = !variant.selected;
    this.variants.set([...this.variants()]);
  }

  onSizeChange(variant: ProductVariant, size: string): void {
    variant.size = size;
    this.variants.set([...this.variants()]);
  }

  onDetailsClick(variant: ProductVariant): void {
    console.log('Product details clicked for:', variant);
    // TODO: Implement product details functionality
  }

  formatPrice(price: number): string {
    return `₱${price.toFixed(2)}`;
  }
}


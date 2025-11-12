import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Layer {
  type: 'text' | 'image';
  name: string;
  color?: string;
  x: number;
  y: number;
}

interface Variant {
  color: string;
  size: string;
  layers: Layer[];
  expanded?: boolean;
}

@Component({
  selector: 'app-layers-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './layers-panel.html',
  styleUrl: './layers-panel.css'
})
export class LayersPanelComponent {
  @Output() closed = new EventEmitter<void>();

  // Sample variants data matching the screenshot
  variants = signal<Variant[]>([
    {
      color: 'White',
      size: 'X-Large',
      layers: [],
      expanded: false
    },
    {
      color: 'Black',
      size: 'Small',
      layers: [],
      expanded: false
    },
    {
      color: 'Denim',
      size: 'Medium',
      layers: [
        { type: 'text', name: 'Nice Day...', color: 'red', x: 1268, y: 67 },
        { type: 'image', name: 'Star', x: 876, y: 302 }
      ],
      expanded: true
    }
  ]);

  availableSizes = ['Small', 'Medium', 'Large', 'X-Large'];

  onClose(): void {
    this.closed.emit();
  }

  toggleVariantExpanded(variant: Variant): void {
    variant.expanded = !variant.expanded;
    this.variants.set([...this.variants()]);
  }

  onSizeChange(variant: Variant, size: string): void {
    variant.size = size;
    this.variants.set([...this.variants()]);
  }

  onLayerClick(layer: Layer): void {
    console.log('Layer clicked:', layer);
    // TODO: Implement layer selection/editing
  }

  getLayerIcon(layer: Layer): string {
    return layer.type === 'text' ? 'Tt' : '🖼️';
  }

  getColorHex(color: string): string {
    const colorMap: { [key: string]: string } = {
      'White': '#FFFFFF',
      'Black': '#000000',
      'Denim': '#5F9EA0',
      'Blue': '#0066CC',
      'Red': '#DC3545',
      'Acid Wash': '#E0E0E0'
    };
    return colorMap[color] || '#CCCCCC';
  }
}


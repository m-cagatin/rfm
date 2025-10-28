import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-patterns-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patterns-panel.html',
  styleUrl: './patterns-panel.css'
})
export class PatternsPanelComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() patternSelected = new EventEmitter<any>();

  protected query = signal('');
  protected selectedCategory = signal('all');

  categories = ['all', 'geometric', 'floral', 'abstract', 'fabric', 'grunge'];

  patterns = [
    { id: 1, name: 'Dots', category: 'geometric', url: 'https://via.placeholder.com/100x100/f8f9fa/333?text=DOTS' },
    { id: 2, name: 'Stripes', category: 'geometric', url: 'https://via.placeholder.com/100x100/4ecdc4/fff?text=LINES' },
    { id: 3, name: 'Floral Vintage', category: 'floral', url: 'https://via.placeholder.com/100x100/ff6b6b/fff?text=FLORAL' },
    { id: 4, name: 'Abstract Flow', category: 'abstract', url: 'https://via.placeholder.com/100x100/667eea/fff?text=FLOW' },
    { id: 5, name: 'Denim Texture', category: 'fabric', url: 'https://via.placeholder.com/100x100/2c3e50/fff?text=DENIM' },
    { id: 6, name: 'Grunge Noise', category: 'grunge', url: 'https://via.placeholder.com/100x100/95a5a6/333?text=GRUNGE' },
    { id: 7, name: 'Hexagon Grid', category: 'geometric', url: 'https://via.placeholder.com/100x100/f39c12/fff?text=HEX' },
    { id: 8, name: 'Marble', category: 'abstract', url: 'https://via.placeholder.com/100x100/ecf0f1/333?text=MARBLE' }
  ];

  filteredPatterns(): any[] {
    let filtered = this.patterns;
    
    const cat = this.selectedCategory();
    if (cat !== 'all') {
      filtered = filtered.filter(p => p.category === cat);
    }
    
    const q = this.query().toLowerCase().trim();
    if (q) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }
    
    return filtered;
  }

  onClose(): void {
    this.closed.emit();
  }

  onSelectPattern(pattern: any): void {
    this.patternSelected.emit(pattern);
  }

  onCategoryChange(category: string): void {
    this.selectedCategory.set(category);
  }
}
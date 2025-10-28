import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-graphics-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './graphics-panel.html',
  styleUrl: './graphics-panel.css'
})
export class GraphicsPanelComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() graphicSelected = new EventEmitter<any>();

  protected query = signal('');
  protected selectedCategory = signal('all');

  categories = ['all', 'icons', 'shapes', 'illustrations', 'arrows'];

  graphics = [
    { id: 1, name: 'Circle', category: 'shapes', svg: '<circle cx="40" cy="40" r="30" fill="#4ecdc4"/>' },
    { id: 2, name: 'Rectangle', category: 'shapes', svg: '<rect x="10" y="20" width="60" height="40" fill="#ff6b6b"/>' },
    { id: 3, name: 'Star', category: 'icons', svg: '<path d="M40,10 L45,25 L60,25 L50,35 L55,50 L40,40 L25,50 L30,35 L20,25 L35,25 Z" fill="#feca57"/>' },
    { id: 4, name: 'Heart', category: 'icons', svg: '<path d="M40,60 C40,60 20,40 20,25 C20,15 30,15 40,25 C50,15 60,15 60,25 C60,40 40,60 40,60 Z" fill="#ff6b6b"/>' },
    { id: 5, name: 'Arrow Right', category: 'arrows', svg: '<path d="M20,40 L50,40 M40,30 L50,40 L40,50" stroke="#333" stroke-width="3" fill="none"/>' },
    { id: 6, name: 'Lightning', category: 'icons', svg: '<path d="M35,10 L25,40 L40,40 L30,70 L50,30 L35,30 Z" fill="#f39c12"/>' }
  ];

  filteredGraphics(): any[] {
    let filtered = this.graphics;
    
    const cat = this.selectedCategory();
    if (cat !== 'all') {
      filtered = filtered.filter(g => g.category === cat);
    }
    
    const q = this.query().toLowerCase().trim();
    if (q) {
      filtered = filtered.filter(g => g.name.toLowerCase().includes(q));
    }
    
    return filtered;
  }

  onClose(): void {
    this.closed.emit();
  }

  onSelectGraphic(graphic: any): void {
    this.graphicSelected.emit(graphic);
  }

  onCategoryChange(category: string): void {
    this.selectedCategory.set(category);
  }
}
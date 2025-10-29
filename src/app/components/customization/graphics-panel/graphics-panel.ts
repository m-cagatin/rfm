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
  protected selectedCategory = signal('shapes');
  protected activeSection = signal('shapes');

  // Shapes with actual SVG
  shapes = [
    { id: 'circle', name: 'Circle', svg: '<circle cx="50" cy="50" r="40" fill="#4ecdc4"/>' },
    { id: 'square', name: 'Square', svg: '<rect x="15" y="15" width="70" height="70" fill="#ff6b6b"/>' },
    { id: 'rectangle', name: 'Rectangle', svg: '<rect x="10" y="25" width="80" height="50" fill="#a29bfe"/>' },
    { id: 'triangle', name: 'Triangle', svg: '<path d="M50,15 L85,85 L15,85 Z" fill="#fdcb6e"/>' },
    { id: 'star', name: 'Star', svg: '<path d="M50,15 L58,40 L85,40 L65,55 L73,85 L50,67 L27,85 L35,55 L15,40 L42,40 Z" fill="#feca57"/>' },
    { id: 'heart', name: 'Heart', svg: '<path d="M50,85 C50,85 15,60 15,40 C15,25 25,20 35,25 C40,28 45,35 50,40 C55,35 60,28 65,25 C75,20 85,25 85,40 C85,60 50,85 50,85 Z" fill="#ff6b6b"/>' },
    { id: 'hexagon', name: 'Hexagon', svg: '<path d="M50,10 L85,30 L85,70 L50,90 L15,70 L15,30 Z" fill="#00b894"/>' },
    { id: 'octagon', name: 'Octagon', svg: '<path d="M30,10 L70,10 L90,30 L90,70 L70,90 L30,90 L10,70 L10,30 Z" fill="#6c5ce7"/>' },
    { id: 'pentagon', name: 'Pentagon', svg: '<path d="M50,10 L90,40 L73,85 L27,85 L10,40 Z" fill="#fab1a0"/>' },
    { id: 'diamond', name: 'Diamond', svg: '<path d="M50,10 L90,50 L50,90 L10,50 Z" fill="#74b9ff"/>' },
    { id: 'arrow-right', name: 'Arrow Right', svg: '<path d="M10,50 L70,50 L70,30 L90,50 L70,70 L70,50 Z" fill="#636e72"/>' },
    { id: 'arrow-left', name: 'Arrow Left', svg: '<path d="M90,50 L30,50 L30,30 L10,50 L30,70 L30,50 Z" fill="#636e72"/>' }
  ];

  // Categories with dummy placeholders
  categories = [
    { id: 'shapes', name: 'Shapes', count: 12 },
    { id: 'icons', name: 'Icons', count: 0 },
    { id: 'illustrations', name: 'Illustrations', count: 0 },
    { id: 'photos', name: 'Photos', count: 0 },
    { id: 'patterns', name: 'Patterns', count: 0 }
  ];

  // Dummy data for other categories
  dummyGraphics = [
    { id: 'dummy-1', name: 'Coming Soon', thumbnail: 'https://via.placeholder.com/150?text=Coming+Soon' },
    { id: 'dummy-2', name: 'Coming Soon', thumbnail: 'https://via.placeholder.com/150?text=Coming+Soon' },
    { id: 'dummy-3', name: 'Coming Soon', thumbnail: 'https://via.placeholder.com/150?text=Coming+Soon' },
    { id: 'dummy-4', name: 'Coming Soon', thumbnail: 'https://via.placeholder.com/150?text=Coming+Soon' }
  ];

  filteredGraphics(): any[] {
    const section = this.activeSection();
    
    // Only shapes have real graphics
    if (section === 'shapes') {
      const q = this.query().toLowerCase().trim();
      if (q) {
        return this.shapes.filter(s => s.name.toLowerCase().includes(q));
      }
      return this.shapes;
    }
    
    // Other categories show dummy placeholders
    return this.dummyGraphics;
  }

  selectCategory(categoryId: string): void {
    this.activeSection.set(categoryId);
    this.selectedCategory.set(categoryId);
  }

  onClose(): void {
    this.closed.emit();
  }

  onSelectGraphic(graphic: any): void {
    this.graphicSelected.emit(graphic);
  }
}
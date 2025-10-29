import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-templates-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './templates-panel.html',
  styleUrl: './templates-panel.css'
})
export class TemplatesPanelComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() templateSelected = new EventEmitter<any>();

  templates = [
    { id: 1, name: 'Minimalist Design', category: 'business', thumbnail: 'https://via.placeholder.com/120x150/f8f9fa/333?text=MIN' },
    { id: 2, name: 'Bold Statement', category: 'casual', thumbnail: 'https://via.placeholder.com/120x150/ff6b6b/fff?text=BOLD' },
    { id: 3, name: 'Vintage Logo', category: 'retro', thumbnail: 'https://via.placeholder.com/120x150/8b4513/fff?text=VINTAGE' },
    { id: 4, name: 'Sports Team', category: 'sports', thumbnail: 'https://via.placeholder.com/120x150/4ecdc4/fff?text=TEAM' },
    { id: 5, name: 'Tech Startup', category: 'business', thumbnail: 'https://via.placeholder.com/120x150/667eea/fff?text=TECH' },
    { id: 6, name: 'Art Gallery', category: 'creative', thumbnail: 'https://via.placeholder.com/120x150/feca57/333?text=ART' }
  ];

  onClose(): void {
    this.closed.emit();
  }

  onSelectTemplate(template: any): void {
    this.templateSelected.emit(template);
  }
}
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-library-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './library-panel.html',
  styleUrl: './library-panel.css'
})
export class LibraryPanelComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() itemSelected = new EventEmitter<any>();

  libraryItems = [
    { id: 1, name: 'Logo Design 1', type: 'image', thumbnail: 'https://via.placeholder.com/80x80/ff6b6b/fff?text=L1' },
    { id: 2, name: 'Background Pattern', type: 'image', thumbnail: 'https://via.placeholder.com/80x80/4ecdc4/fff?text=BG' },
    { id: 3, name: 'Custom Text Style', type: 'text', thumbnail: 'https://via.placeholder.com/80x80/45b7d1/fff?text=TXT' },
    { id: 4, name: 'Icon Set', type: 'graphics', thumbnail: 'https://via.placeholder.com/80x80/96ceb4/fff?text=ICO' }
  ];

  onClose(): void {
    this.closed.emit();
  }

  onSelectItem(item: any): void {
    this.itemSelected.emit(item);
  }
}
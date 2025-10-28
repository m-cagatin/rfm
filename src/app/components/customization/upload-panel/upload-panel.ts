import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';

@Component({
  selector: 'app-upload-panel',
  standalone: true,
  imports: [CommonModule, NgIf],
  templateUrl: './upload-panel.html',
  styleUrl: './upload-panel.css'
})
export class UploadPanelComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<File>();

  protected isDragging = signal(false);
  protected uploading = signal(false);
  protected previewUrl = signal<string | null>(null);
  protected fileName = signal<string | null>(null);
  protected fileSize = signal<number | null>(null);

  constructor() {}

  onClose(): void {
    this.closed.emit();
  }

  onPickDevice(input: HTMLInputElement): void {
    input.click();
  }

  onFileInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (file) {
      this.handleSelectedFile(file);
    }
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      this.handleSelectedFile(file);
    }
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(false);
  }

  private handleSelectedFile(file: File): void {
    this.uploading.set(true);
    this.fileName.set(file.name);
    this.fileSize.set(file.size);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl.set(reader.result as string);
        this.uploading.set(false);
      };
      reader.readAsDataURL(file);
    } else {
      this.previewUrl.set(null);
      this.uploading.set(false);
    }

    // Emit to parent for integration
    this.fileSelected.emit(file);
  }

  removeSelected(): void {
    this.previewUrl.set(null);
    this.fileName.set(null);
    this.fileSize.set(null);
  }

  pickDropbox(): void {
    alert('Dropbox integration coming soon');
  }

  pickDrive(): void {
    alert('Google Drive integration coming soon');
  }
}

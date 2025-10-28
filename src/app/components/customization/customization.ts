import { Component, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UploadPanelComponent } from './upload-panel/upload-panel';
import { TextPanelComponent } from './text-panel/text-panel';
import { LibraryPanelComponent } from './library-panel/library-panel';
import { GraphicsPanelComponent } from './graphics-panel/graphics-panel';
import { TemplatesPanelComponent } from './templates-panel/templates-panel';
import { PatternsPanelComponent } from './patterns-panel/patterns-panel';
import { CanvasService } from '../../services/canvas.service';
import { FontLoaderService } from '../../services/font-loader.service';

@Component({
  selector: 'app-customization',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf, UploadPanelComponent, TextPanelComponent, LibraryPanelComponent, GraphicsPanelComponent, TemplatesPanelComponent, PatternsPanelComponent],
  templateUrl: './customization.html',
  styleUrl: './customization.css'
})
export class CustomizationComponent implements AfterViewInit, OnDestroy {
  @ViewChild('fabricCanvas', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  protected isPanelVisible = signal(true);
  protected zoomLevel = signal(17);
  protected activeView = signal(0); // 0: front, 1: back, 2: neck label
  protected showUpload = signal(false);
  protected showTextPanel = signal(false);
  protected textPanelPos = signal<{ top: number; left: number }>({ top: 100, left: 96 });
  protected showLibraryPanel = signal(false);
  protected showGraphicsPanel = signal(false);
  protected showTemplatesPanel = signal(false);
  protected showPatternsPanel = signal(false);
  protected activePanelPos = signal<{ top: number; left: number }>({ top: 100, left: 96 });

  // Canvas-related signals
  protected showToolbar = signal(false);
  protected selectedFontFamily = signal('Arial');
  protected selectedFontSize = signal(40);
  protected selectedTextColor = signal('#000000');
  protected isBold = signal(false);
  protected isItalic = signal(false);
  protected isUnderline = signal(false);
  protected textAlignment = signal<'left' | 'center' | 'right'>('left');

  // Undo/Redo signals
  protected canUndo = signal(false);
  protected canRedo = signal(false);

  // Canvas size signals
  protected canvasWidth = signal(400);
  protected canvasHeight = signal(500);
  
  // Resize state
  private isResizing = false;
  private resizeDirection: 'e' | 's' | 'se' | null = null;
  private resizeStartX = 0;
  private resizeStartY = 0;
  private resizeStartWidth = 0;
  private resizeStartHeight = 0;

  constructor(
    private router: Router,
    public canvasService: CanvasService,
    private fontLoader: FontLoaderService,
    private ngZone: NgZone
  ) {
    // Setup resize event listeners
    if (typeof document !== 'undefined') {
      document.addEventListener('mousemove', this.onResizeMove.bind(this));
      document.addEventListener('mouseup', this.onResizeEnd.bind(this));
    }
  }

  ngAfterViewInit(): void {
    // Initialize canvas after view is ready
    setTimeout(() => {
      if (this.canvasElement) {
        this.canvasService.initializeCanvas(this.canvasElement.nativeElement, 400, 500);
        
        // Subscribe to selection changes with NgZone to ensure change detection
        this.canvasService.selectedObject$.subscribe((obj) => {
          this.ngZone.run(() => {
            console.log('Selection change detected:', obj?.type || 'null');
            this.updateToolbarFromSelection(obj);
          });
        });
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.canvasService.dispose();
    
    // Clean up resize event listeners
    if (typeof document !== 'undefined') {
      document.removeEventListener('mousemove', this.onResizeMove.bind(this));
      document.removeEventListener('mouseup', this.onResizeEnd.bind(this));
    }
  }

  /**
   * Update toolbar state based on selected object
   */
  private updateToolbarFromSelection(obj: any): void {
    const isText = !!obj && this.canvasService.isTextSelected();
    console.log('Updating toolbar. Is text:', isText, 'Type:', obj?.type);
    
    this.showToolbar.set(isText);
    
    if (obj && isText) {
      // For multi-select, get properties from first text object
      let properties: any;
      
      if (obj.type === 'activeSelection') {
        const objects = obj.getObjects ? obj.getObjects() : obj._objects || [];
        const firstTextObj = objects.find((o: any) => 
          o.type === 'text' || o.type === 'i-text' || o.type === 'textbox' || o.type === 'IText'
        );
        properties = firstTextObj || obj;
      } else {
        properties = obj;
      }
      
      this.selectedFontFamily.set(properties.fontFamily || 'Arial');
      this.selectedFontSize.set(properties.fontSize || 40);
      this.selectedTextColor.set(properties.fill || '#000000');
      this.isBold.set(properties.fontWeight === 'bold');
      this.isItalic.set(properties.fontStyle === 'italic');
      this.isUnderline.set(properties.underline || false);
      this.textAlignment.set(properties.textAlign || 'left');
      
      console.log('✓ Toolbar shown');
    } else {
      console.log('✗ Toolbar hidden');
    }
  }

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

  // Upload modal controls
  openUpload(): void {
    this.showUpload.set(true);
  }

  closeUpload(): void {
    this.showUpload.set(false);
  }

  onFileSelected(file: File): void {
    // TODO: integrate with canvas/print area
    console.log('Selected file:', file?.name, file?.size);
    // Close after selection for now
    this.closeUpload();
  }

  // Text panel controls
  openTextFrom(ev: MouseEvent): void {
    const target = ev.currentTarget as HTMLElement | null;
    if (target) {
      const rect = target.getBoundingClientRect();
      this.textPanelPos.set({ top: Math.round(rect.top + window.scrollY - 8), left: Math.round(rect.right + 12) });
    }
    this.showTextPanel.set(true);
  }
  
  closeText(): void {
    this.showTextPanel.set(false);
  }
  
  onFontSelected(font: string): void {
    console.log('Font selected:', font);
    
    // Load the font first
    this.fontLoader.loadGoogleFont(font).then(() => {
      // If text is selected, apply font to it
      if (this.canvasService.isTextSelected()) {
        this.canvasService.setFontFamily(font);
        this.selectedFontFamily.set(font);
      } else {
        // Otherwise, add new text with this font
        this.canvasService.addText('Enter text', { fontFamily: font });
      }
    });
    
    this.closeText();
  }

  onPreDesignedTextSelected(template: any): void {
    console.log('Pre-designed text selected:', template);
    this.canvasService.addPreDesignedText(template);
    this.closeText();
  }

  // Toolbar actions
  onFontFamilyChange(fontFamily: string): void {
    this.canvasService.setFontFamily(fontFamily);
    this.selectedFontFamily.set(fontFamily);
  }

  onFontSizeChange(size: number): void {
    this.canvasService.setFontSize(size);
    this.selectedFontSize.set(size);
  }

  increaseFontSize(): void {
    const newSize = this.selectedFontSize() + 2;
    this.onFontSizeChange(newSize);
  }

  decreaseFontSize(): void {
    const newSize = Math.max(8, this.selectedFontSize() - 2);
    this.onFontSizeChange(newSize);
  }

  toggleBoldAction(): void {
    this.canvasService.toggleBold();
    this.isBold.set(!this.isBold());
  }

  toggleItalicAction(): void {
    this.canvasService.toggleItalic();
    this.isItalic.set(!this.isItalic());
  }

  toggleUnderlineAction(): void {
    this.canvasService.toggleUnderline();
    this.isUnderline.set(!this.isUnderline());
  }

  setAlignment(align: 'left' | 'center' | 'right'): void {
    this.canvasService.setTextAlign(align);
    this.textAlignment.set(align);
  }

  onTextColorChange(color: string): void {
    this.canvasService.setTextColor(color);
    this.selectedTextColor.set(color);
  }

  /**
   * Delete selected object(s) - completely remade
   */
  deleteSelectedObject(): void {
    console.log('🗑️ Delete button clicked');
    
    // Call the canvas service to delete
    this.canvasService.deleteSelected();
    
    // Toolbar will automatically hide via selection:cleared event
    console.log('Delete request sent to canvas service');
  }

  /**
   * Undo last action
   */
  undoAction(): void {
    this.canvasService.undo();
  }

  /**
   * Redo last undone action
   */
  redoAction(): void {
    this.canvasService.redo();
  }

  /**
   * Start canvas resize
   */
  startResize(event: MouseEvent, direction: 'e' | 's' | 'se'): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.isResizing = true;
    this.resizeDirection = direction;
    this.resizeStartX = event.clientX;
    this.resizeStartY = event.clientY;
    this.resizeStartWidth = this.canvasWidth();
    this.resizeStartHeight = this.canvasHeight();
    
    // Clear any text selection
    this.canvasService.clearSelection();
  }

  /**
   * Handle resize move
   */
  private onResizeMove(event: MouseEvent): void {
    if (!this.isResizing || !this.resizeDirection) return;
    
    const deltaX = event.clientX - this.resizeStartX;
    const deltaY = event.clientY - this.resizeStartY;
    
    let newWidth = this.resizeStartWidth;
    let newHeight = this.resizeStartHeight;
    
    // Apply constraints (min: 200x200, max: 800x800)
    if (this.resizeDirection === 'e' || this.resizeDirection === 'se') {
      newWidth = Math.max(200, Math.min(800, this.resizeStartWidth + deltaX));
    }
    
    if (this.resizeDirection === 's' || this.resizeDirection === 'se') {
      newHeight = Math.max(200, Math.min(800, this.resizeStartHeight + deltaY));
    }
    
    // Update signals
    this.ngZone.run(() => {
      this.canvasWidth.set(newWidth);
      this.canvasHeight.set(newHeight);
      
      // Update canvas size in service
      this.canvasService.resizeCanvas(newWidth, newHeight);
    });
  }

  /**
   * End resize
   */
  private onResizeEnd(event: MouseEvent): void {
    if (this.isResizing) {
      this.isResizing = false;
      this.resizeDirection = null;
    }
  }

  /**
   * Handle clicks outside canvas to deselect
   */
  onMainContentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Check if click is outside canvas area and not on toolbar
    if (!target.closest('.print-area-box') && 
        !target.closest('.text-toolbar') &&
        !target.closest('canvas')) {
      this.canvasService.clearSelection();
    }
  }

  onCanvasAreaClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // If click is directly on canvas-area (not on canvas or print box), deselect
    if (target.classList.contains('canvas-area') || 
        target.classList.contains('tshirt-canvas')) {
      this.canvasService.clearSelection();
    }
  }

  // Library panel
  openLibraryFrom(ev: MouseEvent): void {
    this.closeAllPanels();
    this.calculatePanelPosition(ev);
    this.showLibraryPanel.set(true);
  }
  closeLibrary(): void { this.showLibraryPanel.set(false); }
  onLibraryItemSelected(item: any): void {
    console.log('Library item selected:', item);
    this.closeLibrary();
  }

  // Graphics panel
  openGraphicsFrom(ev: MouseEvent): void {
    this.closeAllPanels();
    this.calculatePanelPosition(ev);
    this.showGraphicsPanel.set(true);
  }
  closeGraphics(): void { this.showGraphicsPanel.set(false); }
  onGraphicSelected(graphic: any): void {
    console.log('Graphic selected:', graphic);
    this.closeGraphics();
  }

  // Templates panel
  openTemplatesFrom(ev: MouseEvent): void {
    this.closeAllPanels();
    this.calculatePanelPosition(ev);
    this.showTemplatesPanel.set(true);
  }
  closeTemplates(): void { this.showTemplatesPanel.set(false); }
  onTemplateSelected(template: any): void {
    console.log('Template selected:', template);
    this.closeTemplates();
  }

  // Patterns panel
  openPatternsFrom(ev: MouseEvent): void {
    this.closeAllPanels();
    this.calculatePanelPosition(ev);
    this.showPatternsPanel.set(true);
  }
  closePatterns(): void { this.showPatternsPanel.set(false); }
  onPatternSelected(pattern: any): void {
    console.log('Pattern selected:', pattern);
    this.closePatterns();
  }

  private closeAllPanels(): void {
    this.showUpload.set(false);
    this.showTextPanel.set(false);
    this.showLibraryPanel.set(false);
    this.showGraphicsPanel.set(false);
    this.showTemplatesPanel.set(false);
    this.showPatternsPanel.set(false);
  }

  private calculatePanelPosition(ev: MouseEvent): void {
    const target = ev.currentTarget as HTMLElement | null;
    if (target) {
      const rect = target.getBoundingClientRect();
      this.activePanelPos.set({ 
        top: Math.round(rect.top + window.scrollY - 8), 
        left: Math.round(rect.right + 12) 
      });
    }
  }
}
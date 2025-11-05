import { Component, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, NgZone, HostListener } from '@angular/core';
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
  protected showToolsPanel = signal(false);
  protected zoomLevel = signal(17);
  protected canvasScale = signal(1.0); // CSS transform scale for Figma-style zoom
  protected isZoomExpanded = signal(false); // Collapsible zoom presets
  
  // Pan state for Figma-style navigation
  protected panOffsetX = signal(0);
  protected panOffsetY = signal(0);
  protected isPanning = signal(false);
  protected spaceKeyPressed = signal(false);
  private panStartX = 0;
  private panStartY = 0;
  private panStartOffsetX = 0;
  private panStartOffsetY = 0;
  
  // Throttling for smooth wheel events
  private wheelUpdateQueued = false;
  private pendingDeltaX = 0;
  private pendingDeltaY = 0;
  
  protected activeView = signal(0); // 0: front, 1: back, 2: neck label
  protected showUpload = signal(false);
  protected showTextPanel = signal(false);
  protected textPanelPos = signal<{ top: number; left: number }>({ top: 100, left: 96 });
  protected showLibraryPanel = signal(false);
  protected showGraphicsPanel = signal(false);
  protected showTemplatesPanel = signal(false);
  protected showPatternsPanel = signal(false);
  protected activePanelPos = signal<{ top: number; left: number }>({ top: 100, left: 96 });

  // Product Configuration
  protected selectedProductType = signal<string>('tshirt');
  protected selectedNeckline = signal<string>('Round neck');
  protected isNBACut = signal(false);
  protected selectedSizeCategory = signal<'regular' | 'kids' | 'custom'>('regular');
  protected selectedSize = signal<string>('M');
  protected selectedColor = signal<string>('#FFFFFF');
  protected sizePriceAdd = signal<number>(0);
  protected basePrice = signal<number>(350);
  
  // Custom size inputs
  protected customChest = signal<number | null>(null);
  protected customLength = signal<number | null>(null);
  protected customWaist = signal<number | null>(null);

  // Size options
  protected regularSizes = [
    { label: 'S', value: 'S', priceAdd: 0 },
    { label: 'M', value: 'M', priceAdd: 0 },
    { label: 'L', value: 'L', priceAdd: 0 },
    { label: 'XL', value: 'XL', priceAdd: 0 },
    { label: 'XXL', value: 'XXL', priceAdd: 50 },
    { label: 'XXXL', value: 'XXXL', priceAdd: 100 },
    { label: 'XXXXL', value: 'XXXXL', priceAdd: 150 },
  ];

  protected kidsSizes = ['K6', 'K7', 'K8', 'K9', 'K10'];

  protected colors = [
    { name: 'White', value: '#FFFFFF' },
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#FF0000' },
    { name: 'Blue', value: '#0000FF' },
    { name: 'Green', value: '#00FF00' },
    { name: 'Yellow', value: '#FFFF00' },
    { name: 'Navy', value: '#000080' },
    { name: 'Gray', value: '#808080' },
  ];

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
  
  // Print area configuration
  protected printAreaMode = signal<'preset' | 'custom'>('preset');
  protected selectedPreset = signal<string>('medium');
  protected printAreaPresets = [
    { id: 'small', label: 'Small (12" × 16")', width: 300, height: 400, description: 'Chest print' },
    { id: 'medium', label: 'Medium (16" × 20")', width: 400, height: 500, description: 'Standard' },
    { id: 'large', label: 'Large (18" × 24")', width: 450, height: 600, description: 'Full front' },
    { id: 'oversized', label: 'Oversized (20" × 28")', width: 500, height: 700, description: 'All-over' },
  ];
  
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
        
        // Enable pan feature (zoom handled by template (wheel) event)
        this.canvasService.enablePanning();
        
        // Subscribe to selection changes with NgZone to ensure change detection
        this.canvasService.selectedObject$.subscribe((obj) => {
          this.ngZone.run(() => {
            console.log('Selection change detected:', obj?.type || 'null');
            this.updateToolbarFromSelection(obj);
          });
        });
        
        // Subscribe to canvas scale changes (mouse wheel zoom)
        this.canvasService.canvasScale$.subscribe((scale) => {
          this.ngZone.run(() => {
            this.canvasScale.set(scale);
            this.zoomLevel.set(Math.round(scale * 100));
          });
        });
      }
    }, 100);
  }

  ngOnDestroy(): void {
    // Save current view state before destroying
    const currentViewName = this.getViewName(this.activeView());
    this.canvasService.saveViewState(currentViewName);
    
    this.canvasService.dispose();
    
    // Clean up resize event listeners
    if (typeof document !== 'undefined') {
      document.removeEventListener('mousemove', this.onResizeMove.bind(this));
      document.removeEventListener('mouseup', this.onResizeEnd.bind(this));
    }
  }

  /**
   * Keyboard shortcuts for zoom and canvas operations
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    // Space key for panning (only if not typing in input)
    if (event.code === 'Space' && 
        !this.spaceKeyPressed() && 
        event.target instanceof HTMLElement &&
        event.target.tagName !== 'INPUT' &&
        event.target.tagName !== 'TEXTAREA' &&
        event.target.tagName !== 'SELECT') {
      event.preventDefault();
      this.spaceKeyPressed.set(true);
    }
    
    // Zoom shortcuts (Ctrl/Cmd + key)
    if (event.ctrlKey || event.metaKey) {
      switch(event.key) {
        case '+':
        case '=': // Plus key without shift
          event.preventDefault();
          this.zoomIn();
          break;
        case '-':
        case '_': // Minus key
          event.preventDefault();
          this.zoomOut();
          break;
        case '0':
          event.preventDefault();
          this.zoomFit();
          break;
        case '1':
          event.preventDefault();
          this.setPresetZoom(100);
          break;
        case '2':
          event.preventDefault();
          this.setPresetZoom(200);
          break;
      }
    }
  }

  /**
   * Handle key up events (Space key release)
   */
  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      this.spaceKeyPressed.set(false);
      this.isPanning.set(false);
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
    // Use service method (will emit scale change via observable)
    this.canvasService.zoomIn();
  }

  zoomOut(): void {
    // Use service method (will emit scale change via observable)
    this.canvasService.zoomOut();
  }

  zoomFit(): void {
    // Reset to 100% scale and center canvas
    this.canvasService.setScale(1.0);
    this.panOffsetX.set(0);
    this.panOffsetY.set(0);
  }

  /**
   * Toggle zoom presets visibility
   */
  toggleZoomPresets(): void {
    this.isZoomExpanded.set(!this.isZoomExpanded());
  }

  /**
   * Set zoom to specific percentage preset
   */
  setPresetZoom(percentage: number): void {
    const scale = percentage / 100;
    this.canvasService.setScale(scale);
  }

  /**
   * Handle manual zoom percentage input
   */
  onZoomInputChange(value: string): void {
    // Remove % sign if present and parse
    const cleanValue = value.replace('%', '').trim();
    const num = parseInt(cleanValue);
    
    // Validate range 10-400
    if (!isNaN(num) && num >= 10 && num <= 400) {
      this.setPresetZoom(num);
    } else {
      // Reset input to current value if invalid
      const currentZoom = Math.round(this.canvasScale() * 100);
      // Input will automatically show current value via binding
    }
  }

  /**
   * Handle mouse wheel / trackpad scroll for Figma-style zoom and pan
   * - Ctrl + Scroll: Zoom to cursor (trackpad pinch or mouse with Ctrl)
   * - Shift + Scroll: Pan left/right
   * - Alt + Scroll: Pan up/down
   * - Plain Scroll: Pan up/down (trackpad two-finger swipe)
   */
  onCanvasWheel(event: WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.ctrlKey) {
      // ZOOM TO CURSOR (Trackpad pinch or Ctrl+Mouse wheel)
      this.handleZoomToPoint(event);
    } else if (event.shiftKey) {
      // PAN LEFT/RIGHT (Shift + Mouse wheel)
      this.handleHorizontalPan(event);
    } else if (event.altKey) {
      // PAN UP/DOWN (Alt + Mouse wheel)
      this.handleVerticalPan(event);
    } else if (Math.abs(event.deltaX) > 0) {
      // TRACKPAD HORIZONTAL SWIPE
      this.handleTrackpadPan(event);
    } else {
      // TRACKPAD VERTICAL SWIPE or plain mouse wheel
      this.handleTrackpadPan(event);
    }
  }

  /**
   * Zoom to cursor position
   */
  private handleZoomToPoint(event: WheelEvent): void {
    const canvasArea = event.currentTarget as HTMLElement;
    const rect = canvasArea.getBoundingClientRect();
    
    // Get mouse position relative to canvas center
    const mouseX = event.clientX - rect.left - rect.width / 2;
    const mouseY = event.clientY - rect.top - rect.height / 2;
    
    // Calculate new scale
    const oldScale = this.canvasScale();
    const delta = event.deltaY;
    let newScale = oldScale * (0.999 ** delta);
    newScale = Math.max(0.1, Math.min(4, newScale));
    
    // Calculate canvas point under cursor (before zoom)
    const canvasPointX = (mouseX - this.panOffsetX()) / oldScale;
    const canvasPointY = (mouseY - this.panOffsetY()) / oldScale;
    
    // Calculate pan adjustment to keep cursor on same point (after zoom)
    const panAdjustX = canvasPointX * (newScale - oldScale);
    const panAdjustY = canvasPointY * (newScale - oldScale);
    
    // Update pan offset before applying scale
    this.panOffsetX.update(x => x - panAdjustX);
    this.panOffsetY.update(y => y - panAdjustY);
    
    // Apply scale
    this.canvasService.setScale(newScale);
  }

  /**
   * Pan horizontally (Shift + Mouse wheel)
   */
  private handleHorizontalPan(event: WheelEvent): void {
    const panAmount = event.deltaY; // Use vertical scroll for horizontal pan
    this.panOffsetX.update(x => x - panAmount);
  }

  /**
   * Pan vertically (Alt + Mouse wheel)
   */
  private handleVerticalPan(event: WheelEvent): void {
    const panAmount = event.deltaY;
    this.panOffsetY.update(y => y - panAmount);
  }

  /**
   * Handle trackpad two-finger swipe (pan in both directions)
   */
  private handleTrackpadPan(event: WheelEvent): void {
    // Accumulate deltas for smooth panning
    this.pendingDeltaX += event.deltaX;
    this.pendingDeltaY += event.deltaY;

    // Throttle with requestAnimationFrame for smooth performance
    if (!this.wheelUpdateQueued) {
      this.wheelUpdateQueued = true;
      requestAnimationFrame(() => {
        this.panOffsetX.update(x => x - this.pendingDeltaX);
        this.panOffsetY.update(y => y - this.pendingDeltaY);
        this.pendingDeltaX = 0;
        this.pendingDeltaY = 0;
        this.wheelUpdateQueued = false;
      });
    }
  }

  /**
   * Pan Methods - Space + Drag to navigate canvas
   */
  
  /**
   * Start panning when Space + Mouse down
   */
  startPan(event: MouseEvent): void {
    if (!this.spaceKeyPressed()) return;
    
    this.isPanning.set(true);
    this.panStartX = event.clientX;
    this.panStartY = event.clientY;
    this.panStartOffsetX = this.panOffsetX();
    this.panStartOffsetY = this.panOffsetY();
  }

  /**
   * Update pan offset while dragging
   */
  onPanMove(event: MouseEvent): void {
    if (!this.isPanning()) return;
    
    const deltaX = event.clientX - this.panStartX;
    const deltaY = event.clientY - this.panStartY;
    
    this.panOffsetX.set(this.panStartOffsetX + deltaX);
    this.panOffsetY.set(this.panStartOffsetY + deltaY);
  }

  /**
   * End panning
   */
  endPan(): void {
    this.isPanning.set(false);
  }

  /**
   * Print Area Configuration Methods
   */
  
  selectPrintAreaPreset(presetId: string): void {
    const preset = this.printAreaPresets.find(p => p.id === presetId);
    if (!preset) return;
    
    this.selectedPreset.set(presetId);
    this.printAreaMode.set('preset');
    
    // Update canvas size to preset dimensions
    this.canvasWidth.set(preset.width);
    this.canvasHeight.set(preset.height);
    this.canvasService.resizeCanvas(preset.width, preset.height);
  }
  
  enableCustomPrintArea(): void {
    this.printAreaMode.set('custom');
    this.selectedPreset.set('');
  }
  
  isResizeHandlesEnabled(): boolean {
    return this.printAreaMode() === 'custom';
  }
  
  updateCanvasWidth(width: number): void {
    if (this.printAreaMode() !== 'custom') return;
    
    const newWidth = Math.max(200, Math.min(800, width));
    this.canvasWidth.set(newWidth);
    this.canvasService.resizeCanvas(newWidth, this.canvasHeight());
  }
  
  updateCanvasHeight(height: number): void {
    if (this.printAreaMode() !== 'custom') return;
    
    const newHeight = Math.max(200, Math.min(800, height));
    this.canvasHeight.set(newHeight);
    this.canvasService.resizeCanvas(this.canvasWidth(), newHeight);
  }

  selectView(index: number): void {
    // Save current view state before switching
    const currentViewName = this.getViewName(this.activeView());
    this.canvasService.saveViewState(currentViewName);
    
    // Switch to new view
    this.activeView.set(index);
    
    // Load new view state
    const newViewName = this.getViewName(index);
    this.canvasService.loadViewState(newViewName);
    
    console.log(`📐 Switched from ${currentViewName} to ${newViewName}`);
  }

  /**
   * Helper to get view name from index
   */
  private getViewName(index: number): string {
    switch (index) {
      case 0: return 'front';
      case 1: return 'back';
      case 2: return 'neck';
      default: return 'front';
    }
  }

  /**
   * Check if a view has content (for visual indicators)
   */
  viewHasContent(index: number): boolean {
    const viewName = this.getViewName(index);
    return this.canvasService.hasViewContent(viewName);
  }

  goBack(): void {
    this.router.navigate(['/apparel']);
  }

  saveProduct(): void {
    console.log('Saving product...');
    // Implement save logic
  }

  // Tools panel controls
  toggleToolsPanel(): void {
    this.showToolsPanel.set(!this.showToolsPanel());
  }

  closeToolsPanel(): void {
    this.showToolsPanel.set(false);
  }

  // Product configuration methods
  onProductTypeChange(): void {
    // Reset neckline when product type changes
    const type = this.selectedProductType();
    if (type === 'tshirt') {
      this.selectedNeckline.set('Round neck');
    } else if (type === 'sando') {
      this.selectedNeckline.set('V-Neck');
    }
  }

  showNecklineOptions(): boolean {
    const type = this.selectedProductType();
    return type === 'tshirt' || type === 'sando';
  }

  getNecklineOptions(): string[] {
    const type = this.selectedProductType();
    if (type === 'tshirt') {
      return ['Chinese Collar', 'V-neck', 'Round neck'];
    } else if (type === 'sando') {
      return ['V-Neck', 'Round Neck'];
    }
    return [];
  }

  selectSizeCategory(category: 'regular' | 'kids' | 'custom'): void {
    this.selectedSizeCategory.set(category);
    // Reset size selection
    if (category === 'regular') {
      this.selectSize('M', 0);
    } else if (category === 'kids') {
      this.selectSize('K6', 0);
    } else {
      this.selectedSize.set('Custom');
      this.sizePriceAdd.set(0);
    }
  }

  selectSize(size: string, priceAdd: number): void {
    this.selectedSize.set(size);
    this.sizePriceAdd.set(priceAdd);
  }

  selectColor(color: string): void {
    this.selectedColor.set(color);
  }

  getTotalPrice(): number {
    return this.basePrice() + this.sizePriceAdd();
  }

  // Upload modal controls
  openUpload(): void {
    this.showUpload.set(true);
  }

  closeUpload(): void {
    this.showUpload.set(false);
  }

  onFileSelected(file: File): void {
    if (!file) return;
    
    console.log('📁 File selected:', file.name, file.size);
    
    // Add image to canvas
    this.canvasService.addImageFromFile(file)
      .then(() => {
        console.log('✓ Image added to canvas successfully');
        this.closeUpload();
      })
      .catch((error) => {
        console.error('❌ Failed to add image:', error);
        alert('Failed to add image: ' + error.message);
      });
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
   * Group selected objects
   */
  groupSelected(): void {
    this.canvasService.groupSelected();
  }

  /**
   * Ungroup selected group
   */
  ungroupSelected(): void {
    this.canvasService.ungroupSelected();
  }

  /**
   * Start canvas resize
   */
  startResize(event: MouseEvent, direction: 'e' | 's' | 'se'): void {
    // Only allow resize in custom mode
    if (!this.isResizeHandlesEnabled()) {
      return;
    }
    
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
    
    // Adjust mouse delta for zoom scale (viewport space → canvas space)
    const scale = this.canvasScale();
    const deltaX = (event.clientX - this.resizeStartX) / scale;
    const deltaY = (event.clientY - this.resizeStartY) / scale;
    
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
    
    // If it's a shape with SVG, add it to canvas
    if (graphic.svg && graphic.id) {
      // Extract color from the SVG fill attribute if possible
      const fillMatch = graphic.svg.match(/fill="([^"]+)"/);
      const defaultColor = fillMatch ? fillMatch[1] : '#4ecdc4';
      
      this.canvasService.addShape(graphic.id, defaultColor);
    }
    
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
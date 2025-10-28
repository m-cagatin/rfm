import { Injectable, signal, effect, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { FontLoaderService } from './font-loader.service';

interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  fill?: string;
  fontWeight?: string;
  fontStyle?: string;
  underline?: boolean;
  textAlign?: string;
  charSpacing?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CanvasService {
  private fabricCanvas: any = null;
  private fabric: any = null;
  
  // Observable for selected object
  private selectedObjectSubject = new BehaviorSubject<any>(null);
  public selectedObject$ = this.selectedObjectSubject.asObservable();
  
  // Signal for reactive UI updates
  public hasSelection = signal(false);
  public isTextSelected = signal(false);

  // Undo/Redo stacks
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private isUndoRedoAction = false;
  public canUndo = signal(false);
  public canRedo = signal(false);

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private fontLoader: FontLoaderService
  ) {}

  /**
   * Initialize Fabric.js and create canvas
   */
  async initializeCanvas(canvasElement: HTMLCanvasElement, width: number = 400, height: number = 500): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      // Dynamically import fabric.js
      this.fabric = await import('fabric');
      
      // Create canvas with better settings
      this.fabricCanvas = new this.fabric.Canvas(canvasElement, {
        width,
        height,
        backgroundColor: 'transparent',
        selection: true,  // Enable multi-selection
        preserveObjectStacking: true,
        enableRetinaScaling: true,
        renderOnAddRemove: true,
        stateful: true,
        snapAngle: 45, // Snap rotation to 45 degree angles
        snapThreshold: 10 // Snap within 10 pixels
      });

      // Add selection event listeners
      this.setupEventListeners();
      
      // Add keyboard shortcuts
      this.setupKeyboardShortcuts();
      this.setupHistoryTracking();
      this.setupAlignmentGuides();

      console.log('Canvas initialized successfully', { width, height });
    } catch (error) {
      console.error('Failed to initialize canvas:', error);
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  private keyboardHandler?: (e: KeyboardEvent) => void;
  
  private setupKeyboardShortcuts(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Remove existing listener if any
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }

    // Create the handler
    this.keyboardHandler = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement;
      const activeObj = this.fabricCanvas?.getActiveObject();
      
      // Check if typing in a form input (but not canvas text editor)
      const isTypingInInput = (activeElement?.tagName === 'INPUT' || 
                               activeElement?.tagName === 'TEXTAREA' ||
                               activeElement?.isContentEditable) &&
                              !activeObj?.isEditing;
      
      // Select All (Ctrl+A / Cmd+A)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // Only prevent default if not editing text
        if (!activeObj?.isEditing) {
          e.preventDefault();
          this.selectAll();
        }
      }
      
      // Delete (Delete / Backspace)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only delete if not typing in an input and not editing canvas text
        if (!isTypingInInput && !activeObj?.isEditing) {
          e.preventDefault();
          this.deleteSelected();
        }
      }

      // Undo (Ctrl+Z / Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (!isTypingInInput) {
          e.preventDefault();
          console.log('Undo triggered');
          this.undo();
        }
      }

      // Redo (Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y)
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || 
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        if (!isTypingInInput) {
          e.preventDefault();
          console.log('Redo triggered');
          this.redo();
        }
      }
    };

    document.addEventListener('keydown', this.keyboardHandler);
  }

  /**
   * Setup history tracking for undo/redo
   */
  private setupHistoryTracking(): void {
    if (!this.fabricCanvas) return;

    // Save initial state
    this.saveState();

    // Track object modifications
    this.fabricCanvas.on('object:added', () => {
      if (!this.isUndoRedoAction) {
        this.saveState();
      }
    });

    this.fabricCanvas.on('object:modified', () => {
      if (!this.isUndoRedoAction) {
        this.saveState();
      }
    });

    this.fabricCanvas.on('object:removed', () => {
      if (!this.isUndoRedoAction) {
        this.saveState();
      }
    });
  }

  /**
   * Save current canvas state to undo stack
   */
  private saveState(): void {
    if (!this.fabricCanvas) return;

    // Include all custom properties when serializing
    const json = JSON.stringify(this.fabricCanvas.toJSON([
      'selectable',
      'hasControls', 
      'hasBorders',
      'lockMovementX',
      'lockMovementY',
      'lockRotation',
      'lockScalingX',
      'lockScalingY',
      'customType'
    ]));
    
    this.undoStack.push(json);
    
    // Limit stack size to prevent memory issues
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }

    // Clear redo stack when new action is performed
    this.redoStack = [];
    
    this.updateUndoRedoSignals();
    console.log('State saved - stack size:', this.undoStack.length);
  }

  /**
   * Update undo/redo signals
   */
  private updateUndoRedoSignals(): void {
    this.canUndo.set(this.undoStack.length > 1);
    this.canRedo.set(this.redoStack.length > 0);
  }

  /**
   * Undo last action
   */
  undo(): void {
    if (!this.fabricCanvas || this.undoStack.length <= 1) {
      console.log('Cannot undo - stack length:', this.undoStack.length);
      return;
    }

    console.log('Undo - stack before:', this.undoStack.length, 'redo:', this.redoStack.length);
    
    this.isUndoRedoAction = true;

    // Move current state to redo stack
    const currentState = this.undoStack.pop();
    if (currentState) {
      this.redoStack.push(currentState);
    }

    // Load previous state
    const previousState = this.undoStack[this.undoStack.length - 1];
    if (previousState) {
      try {
        const json = JSON.parse(previousState);
        this.fabricCanvas.loadFromJSON(json, () => {
          // Re-setup event listeners after loading
          this.setupEventListeners();
          this.fabricCanvas.renderAll();
          this.isUndoRedoAction = false;
          this.updateUndoRedoSignals();
          console.log('✓ Undo completed - stack:', this.undoStack.length, 'redo:', this.redoStack.length);
        });
      } catch (error) {
        console.error('Undo error:', error);
        this.isUndoRedoAction = false;
      }
    } else {
      this.isUndoRedoAction = false;
    }
  }

  /**
   * Redo last undone action
   */
  redo(): void {
    if (!this.fabricCanvas || this.redoStack.length === 0) {
      console.log('Cannot redo - redo stack empty');
      return;
    }

    console.log('Redo - stack before:', this.undoStack.length, 'redo:', this.redoStack.length);

    this.isUndoRedoAction = true;

    // Move state from redo to undo stack
    const nextState = this.redoStack.pop();
    if (nextState) {
      this.undoStack.push(nextState);
      
      try {
        const json = JSON.parse(nextState);
        this.fabricCanvas.loadFromJSON(json, () => {
          // Re-setup event listeners after loading
          this.setupEventListeners();
          this.fabricCanvas.renderAll();
          this.isUndoRedoAction = false;
          this.updateUndoRedoSignals();
          console.log('✓ Redo completed - stack:', this.undoStack.length, 'redo:', this.redoStack.length);
        });
      } catch (error) {
        console.error('Redo error:', error);
        this.isUndoRedoAction = false;
      }
    } else {
      this.isUndoRedoAction = false;
    }
  }

  /**
   * Setup alignment guides (like Figma)
   */
  private setupAlignmentGuides(): void {
    if (!this.fabricCanvas) return;

    let alignmentLines: any[] = [];
    const snapDistance = 5; // Snap within 5 pixels
    const lineColor = '#FF0066'; // Red/pink like Figma
    const lineWidth = 1;

    // Create alignment line
    const createLine = (coords: number[]): any => {
      return new this.fabric.Line(coords, {
        stroke: lineColor,
        strokeWidth: lineWidth,
        selectable: false,
        evented: false,
        strokeDashArray: [5, 5]
      });
    };

    // Clear all alignment lines
    const clearAlignmentLines = () => {
      alignmentLines.forEach(line => this.fabricCanvas.remove(line));
      alignmentLines = [];
      this.fabricCanvas.requestRenderAll();
    };

    // Get canvas center
    const getCanvasCenter = () => ({
      x: this.fabricCanvas.width / 2,
      y: this.fabricCanvas.height / 2
    });

    // Check alignment and snap
    const checkAlignment = (obj: any) => {
      if (!obj || obj.type === 'line') return;

      clearAlignmentLines();

      const canvasCenter = getCanvasCenter();
      const objCenter = obj.getCenterPoint();
      const objBounds = obj.getBoundingRect();
      
      const allObjects = this.fabricCanvas.getObjects().filter((o: any) => 
        o !== obj && o.type !== 'line' && o.visible
      );

      let snapped = false;

      // Check vertical center alignment (canvas)
      if (Math.abs(objCenter.x - canvasCenter.x) < snapDistance) {
        obj.set({ left: obj.left + (canvasCenter.x - objCenter.x) });
        obj.setCoords();
        
        // Draw vertical center line
        const line = createLine([canvasCenter.x, 0, canvasCenter.x, this.fabricCanvas.height]);
        this.fabricCanvas.add(line);
        alignmentLines.push(line);
        snapped = true;
      }

      // Check horizontal center alignment (canvas)
      if (Math.abs(objCenter.y - canvasCenter.y) < snapDistance) {
        obj.set({ top: obj.top + (canvasCenter.y - objCenter.y) });
        obj.setCoords();
        
        // Draw horizontal center line
        const line = createLine([0, canvasCenter.y, this.fabricCanvas.width, canvasCenter.y]);
        this.fabricCanvas.add(line);
        alignmentLines.push(line);
        snapped = true;
      }

      // Check alignment with other objects
      allObjects.forEach((target: any) => {
        const targetCenter = target.getCenterPoint();
        const targetBounds = target.getBoundingRect();

        // Vertical alignment (centers)
        if (Math.abs(objCenter.x - targetCenter.x) < snapDistance) {
          obj.set({ left: obj.left + (targetCenter.x - objCenter.x) });
          obj.setCoords();
          
          const y1 = Math.min(objBounds.top, targetBounds.top);
          const y2 = Math.max(objBounds.top + objBounds.height, targetBounds.top + targetBounds.height);
          const line = createLine([targetCenter.x, y1, targetCenter.x, y2]);
          this.fabricCanvas.add(line);
          alignmentLines.push(line);
          snapped = true;
        }

        // Horizontal alignment (centers)
        if (Math.abs(objCenter.y - targetCenter.y) < snapDistance) {
          obj.set({ top: obj.top + (targetCenter.y - objCenter.y) });
          obj.setCoords();
          
          const x1 = Math.min(objBounds.left, targetBounds.left);
          const x2 = Math.max(objBounds.left + objBounds.width, targetBounds.left + targetBounds.width);
          const line = createLine([x1, targetCenter.y, x2, targetCenter.y]);
          this.fabricCanvas.add(line);
          alignmentLines.push(line);
          snapped = true;
        }

        // Left edge alignment
        if (Math.abs(objBounds.left - targetBounds.left) < snapDistance) {
          obj.set({ left: obj.left + (targetBounds.left - objBounds.left) });
          obj.setCoords();
          
          const y1 = Math.min(objBounds.top, targetBounds.top);
          const y2 = Math.max(objBounds.top + objBounds.height, targetBounds.top + targetBounds.height);
          const line = createLine([targetBounds.left, y1, targetBounds.left, y2]);
          this.fabricCanvas.add(line);
          alignmentLines.push(line);
          snapped = true;
        }

        // Right edge alignment
        const objRight = objBounds.left + objBounds.width;
        const targetRight = targetBounds.left + targetBounds.width;
        if (Math.abs(objRight - targetRight) < snapDistance) {
          obj.set({ left: obj.left + (targetRight - objRight) });
          obj.setCoords();
          
          const y1 = Math.min(objBounds.top, targetBounds.top);
          const y2 = Math.max(objBounds.top + objBounds.height, targetBounds.top + targetBounds.height);
          const line = createLine([targetRight, y1, targetRight, y2]);
          this.fabricCanvas.add(line);
          alignmentLines.push(line);
          snapped = true;
        }

        // Top edge alignment
        if (Math.abs(objBounds.top - targetBounds.top) < snapDistance) {
          obj.set({ top: obj.top + (targetBounds.top - objBounds.top) });
          obj.setCoords();
          
          const x1 = Math.min(objBounds.left, targetBounds.left);
          const x2 = Math.max(objBounds.left + objBounds.width, targetBounds.left + targetBounds.width);
          const line = createLine([x1, targetBounds.top, x2, targetBounds.top]);
          this.fabricCanvas.add(line);
          alignmentLines.push(line);
          snapped = true;
        }

        // Bottom edge alignment
        const objBottom = objBounds.top + objBounds.height;
        const targetBottom = targetBounds.top + targetBounds.height;
        if (Math.abs(objBottom - targetBottom) < snapDistance) {
          obj.set({ top: obj.top + (targetBottom - objBottom) });
          obj.setCoords();
          
          const x1 = Math.min(objBounds.left, targetBounds.left);
          const x2 = Math.max(objBounds.left + objBounds.width, targetBounds.left + targetBounds.width);
          const line = createLine([x1, targetBottom, x2, targetBottom]);
          this.fabricCanvas.add(line);
          alignmentLines.push(line);
          snapped = true;
        }
      });

      if (snapped) {
        this.fabricCanvas.requestRenderAll();
      }
    };

    // Object moving event
    this.fabricCanvas.on('object:moving', (e: any) => {
      checkAlignment(e.target);
    });

    // Clear lines when movement stops
    this.fabricCanvas.on('object:modified', () => {
      clearAlignmentLines();
    });

    this.fabricCanvas.on('selection:cleared', () => {
      clearAlignmentLines();
    });

    this.fabricCanvas.on('mouse:up', () => {
      // Clear lines after a short delay
      setTimeout(() => {
        clearAlignmentLines();
      }, 100);
    });
  }

  /**
   * Select all objects on canvas
   */
  selectAll(): void {
    if (!this.fabricCanvas) return;

    const allObjects = this.fabricCanvas.getObjects();
    if (allObjects.length === 0) return;

    if (allObjects.length === 1) {
      // Single object - just select it
      this.fabricCanvas.setActiveObject(allObjects[0]);
    } else {
      // Multiple objects - create active selection
      const selection = new this.fabric.ActiveSelection(allObjects, {
        canvas: this.fabricCanvas
      });
      this.fabricCanvas.setActiveObject(selection);
    }
    
    this.fabricCanvas.renderAll();
    this.handleSelection(this.fabricCanvas.getActiveObject());
  }

  /**
   * Setup event listeners for canvas interactions
   */
  private setupEventListeners(): void {
    if (!this.fabricCanvas) return;

    // Selection created - when user clicks on an object
    this.fabricCanvas.on('selection:created', (e: any) => {
      console.log('Selection created:', e);
      const obj = e.selected?.[0] || e.target;
      this.handleSelection(obj);
    });

    // Selection updated - when user switches to another object
    this.fabricCanvas.on('selection:updated', (e: any) => {
      console.log('Selection updated:', e);
      const obj = e.selected?.[0] || e.target;
      this.handleSelection(obj);
    });

    // Selection cleared - when user clicks away
    this.fabricCanvas.on('selection:cleared', (e: any) => {
      console.log('Selection cleared');
      this.handleSelection(null);
    });

    // Object modified
    this.fabricCanvas.on('object:modified', (e: any) => {
      console.log('Object modified:', e.target);
      
      // Update coordinates after modification
      if (e.target) {
        e.target.setCoords();
      }
      
      // Reselect to update toolbar
      const obj = this.fabricCanvas.getActiveObject();
      if (obj) {
        this.handleSelection(obj);
      }
    });

    // Mouse down - detect selection immediately
    this.fabricCanvas.on('mouse:down', (e: any) => {
      if (e.target) {
        // Object was clicked - ensure coordinates are up to date
        e.target.setCoords();
        
        console.log('Mouse down on object:', e.target.type);
        this.handleSelection(e.target);
      } else {
        // Empty canvas clicked - clear selection
        this.fabricCanvas.discardActiveObject();
        this.fabricCanvas.renderAll();
        this.handleSelection(null);
      }
    });

    // Mouse up - ensure selection is maintained
    this.fabricCanvas.on('mouse:up', (e: any) => {
      const activeObj = this.fabricCanvas.getActiveObject();
      if (activeObj) {
        this.handleSelection(activeObj);
      }
    });
  }

  /**
   * Handle object selection
   */
  private handleSelection(obj: any): void {
    console.log('handleSelection called with:', obj?.type || 'null');
    this.selectedObjectSubject.next(obj);
    this.hasSelection.set(!!obj);
    
    // Check if it's a text object or an active selection containing text
    let isText = false;
    if (obj) {
      if (obj.type === 'activeSelection' || obj.type === 'activeselection') {
        // Multi-select - check if any selected object is text
        const objects = obj.getObjects ? obj.getObjects() : obj._objects || [];
        isText = objects.some((o: any) => 
          o.type === 'text' || o.type === 'i-text' || o.type === 'textbox' || o.type === 'IText'
        );
      } else {
        // Single select
        isText = obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'IText';
      }
    }
    
    this.isTextSelected.set(isText);
    
    if (obj) {
      console.log('✓ Object(s) selected - showing toolbar:', obj.type);
    } else {
      console.log('✗ No selection - hiding toolbar');
    }
  }

  /**
   * Refresh selection state (useful when state gets out of sync)
   */
  refreshSelection(): void {
    const activeObj = this.fabricCanvas?.getActiveObject();
    this.handleSelection(activeObj || null);
  }

  /**
   * Clear selection (deselect all objects)
   */
  clearSelection(): void {
    if (this.fabricCanvas) {
      this.fabricCanvas.discardActiveObject();
      this.fabricCanvas.renderAll();
      this.handleSelection(null);
    }
  }

  /**
   * Add simple text to canvas
   */
  addText(text: string = 'Enter text', style: TextStyle = {}): void {
    if (!this.fabric || !this.fabricCanvas) return;

    const defaultStyle = {
      left: 100,
      top: 100,
      fontSize: 40,
      fill: '#000000',
      fontFamily: 'Arial',
      editable: true,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      lockUniScaling: false,
      lockScalingFlip: true,
      originX: 'left',
      originY: 'top',
      ...style
    };

    const textObject = new this.fabric.IText(text, defaultStyle);
    
    // Initialize coordinates properly
    textObject.setCoords();
    
    this.fabricCanvas.add(textObject);
    this.fabricCanvas.setActiveObject(textObject);
    this.fabricCanvas.renderAll();
    
    // Update coordinates after render
    setTimeout(() => {
      textObject.setCoords();
      this.fabricCanvas.requestRenderAll();
    }, 50);
    
    // Manually trigger selection event
    setTimeout(() => {
      this.handleSelection(textObject);
    }, 50);
  }

  /**
   * Add pre-designed text template to canvas
   */
  async addPreDesignedText(template: any): Promise<void> {
    if (!this.fabric || !this.fabricCanvas) return;

    // Load font if specified
    if (template.fontFamily) {
      await this.fontLoader.loadGoogleFont(template.fontFamily);
    }

    const textObj = new this.fabric.IText(template.title || 'Text', {
      left: 100,
      top: 100,
      fontSize: template.fontSize || 50,
      fill: template.fill || '#000000',
      fontFamily: template.fontFamily || 'Arial',
      fontWeight: template.fontWeight || 'bold',
      textAlign: template.textAlign || 'center',
      editable: true,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      originX: 'left',
      originY: 'top',
      lockScalingFlip: true
    });

    // Initialize the text object properly
    textObj.setCoords();
    
    // Add main text first
    this.fabricCanvas.add(textObj);
    this.fabricCanvas.renderAll();

    // Add subtitle if exists - wait for main text to render to get proper dimensions
    if (template.subtitle) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get accurate height after rendering
      const textHeight = textObj.getScaledHeight();
      const subtitleTop = textObj.top + textHeight + 10;
      
      const subtitleObj = new this.fabric.IText(template.subtitle, {
        left: 100,
        top: subtitleTop,
        fontSize: template.subtitleSize || 24,
        fill: template.fill || '#000000',
        fontFamily: template.fontFamily || 'Arial',
        fontWeight: 'normal',
        textAlign: template.textAlign || 'center',
        editable: true,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        originX: 'left',
        originY: 'top',
        lockScalingFlip: true
      });
      
      // Initialize subtitle coordinates properly
      subtitleObj.setCoords();
      
      this.fabricCanvas.add(subtitleObj);
      this.fabricCanvas.renderAll();
      
      // Force coordinate update after render
      setTimeout(() => {
        subtitleObj.setCoords();
        this.fabricCanvas.requestRenderAll();
      }, 50);
    }

    this.fabricCanvas.setActiveObject(textObj);
    this.fabricCanvas.renderAll();
    
    // Manually trigger selection with proper coordinate update
    setTimeout(() => {
      textObj.setCoords();
      this.handleSelection(textObj);
    }, 150);
  }

  /**
   * Update selected text object properties
   */
  updateSelectedText(properties: TextStyle): void {
    const activeObject = this.fabricCanvas?.getActiveObject();
    
    if (!activeObject) return;

    // Handle multiple selection
    if (activeObject.type === 'activeSelection' || activeObject.type === 'activeselection') {
      const objects = activeObject.getObjects ? activeObject.getObjects() : activeObject._objects || [];
      objects.forEach((obj: any) => {
        if (obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'IText') {
          obj.set(properties);
          obj.setCoords(); // Update coordinates after property change
        }
      });
    } else if (this.isTextSelected()) {
      // Single selection
      activeObject.set(properties);
      activeObject.setCoords(); // Update coordinates after property change
    }
    
    this.fabricCanvas.renderAll();
  }

  /**
   * Change font family of selected text
   */
  async setFontFamily(fontFamily: string): Promise<void> {
    // Load font first
    await this.fontLoader.loadGoogleFont(fontFamily);
    
    // Then apply to selected text
    this.updateSelectedText({ fontFamily });
  }

  /**
   * Change font size of selected text
   */
  setFontSize(fontSize: number): void {
    this.updateSelectedText({ fontSize });
  }

  /**
   * Toggle bold
   */
  toggleBold(): void {
    const activeObject = this.fabricCanvas?.getActiveObject();
    if (!activeObject || !this.isTextSelected()) return;

    const currentWeight = activeObject.fontWeight;
    const newWeight = currentWeight === 'bold' ? 'normal' : 'bold';
    this.updateSelectedText({ fontWeight: newWeight });
  }

  /**
   * Toggle italic
   */
  toggleItalic(): void {
    const activeObject = this.fabricCanvas?.getActiveObject();
    if (!activeObject || !this.isTextSelected()) return;

    const currentStyle = activeObject.fontStyle;
    const newStyle = currentStyle === 'italic' ? 'normal' : 'italic';
    this.updateSelectedText({ fontStyle: newStyle });
  }

  /**
   * Toggle underline
   */
  toggleUnderline(): void {
    const activeObject = this.fabricCanvas?.getActiveObject();
    if (!activeObject || !this.isTextSelected()) return;

    const currentUnderline = activeObject.underline;
    this.updateSelectedText({ underline: !currentUnderline });
  }

  /**
   * Set text alignment
   */
  setTextAlign(align: 'left' | 'center' | 'right'): void {
    this.updateSelectedText({ textAlign: align });
  }

  /**
   * Set text color
   */
  setTextColor(color: string): void {
    this.updateSelectedText({ fill: color });
  }

  /**
   * Set letter spacing
   */
  setCharSpacing(spacing: number): void {
    this.updateSelectedText({ charSpacing: spacing });
  }

  /**
   * Delete selected object(s) - completely remade
   */
  deleteSelected(): void {
    console.log('=== DELETE FUNCTION STARTED ===');
    
    if (!this.fabricCanvas) {
      console.error('❌ Canvas not initialized');
      return;
    }

    const activeObject = this.fabricCanvas.getActiveObject();
    console.log('Active object:', activeObject);
    console.log('Active object type:', activeObject?.type);
    
    if (!activeObject) {
      console.error('❌ Nothing selected to delete');
      return;
    }

    // Store objects to delete
    let objectsToDelete: any[] = [];

    // CHECK BOTH CASES - Fabric.js uses lowercase 'activeselection'!
    if (activeObject.type === 'activeSelection' || activeObject.type === 'activeselection') {
      console.log('🔵 MULTIPLE SELECTION DETECTED');
      
      // Try different ways to get objects
      const objects1 = activeObject._objects;
      const objects2 = activeObject.getObjects?.();
      
      console.log('_objects:', objects1);
      console.log('getObjects():', objects2);
      console.log('_objects length:', objects1?.length);
      console.log('getObjects() length:', objects2?.length);
      
      objectsToDelete = objects1 ? [...objects1] : (objects2 ? [...objects2] : []);
      console.log(`📦 Found ${objectsToDelete.length} objects to delete`);
      console.log('Objects array:', objectsToDelete);
    } else {
      console.log('🔵 SINGLE SELECTION DETECTED');
      objectsToDelete = [activeObject];
      console.log('Single object to delete:', activeObject);
    }

    if (objectsToDelete.length === 0) {
      console.error('❌ No objects found to delete!');
      return;
    }

    console.log('📊 Canvas objects BEFORE deletion:', this.fabricCanvas.getObjects().length);

    console.log('⏳ Clearing selection...');
    this.fabricCanvas.discardActiveObject();
    console.log('✓ Selection cleared');
    
    console.log('⏳ Removing objects...');
    objectsToDelete.forEach((obj, index) => {
      console.log(`  Removing object ${index + 1}/${objectsToDelete.length}:`, obj.type);
      const removed = this.fabricCanvas.remove(obj);
      console.log(`  Remove returned:`, removed);
    });
    console.log('✓ All objects removed');

    console.log('📊 Canvas objects AFTER deletion:', this.fabricCanvas.getObjects().length);
    console.log('📊 Remaining objects:', this.fabricCanvas.getObjects());

    console.log('⏳ Rendering canvas...');
    this.fabricCanvas.requestRenderAll();
    console.log('✓ Canvas rendered');
    
    console.log('⏳ Updating selection state...');
    this.handleSelection(null);
    console.log('✓ Selection state updated');
    
    console.log('=== DELETE FUNCTION COMPLETED ===');
  }

  /**
   * Get selected object properties
   */
  getSelectedProperties(): any {
    const activeObject = this.fabricCanvas?.getActiveObject();
    if (!activeObject) return null;

    // For multiple selection, return properties of the first text object
    if (activeObject.type === 'activeSelection' || activeObject.type === 'activeselection') {
      const objects = activeObject.getObjects ? activeObject.getObjects() : activeObject._objects || [];
      const firstTextObj = objects.find((obj: any) => 
        obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'IText'
      );
      
      if (firstTextObj) {
        return {
          fontFamily: firstTextObj.fontFamily,
          fontSize: firstTextObj.fontSize,
          fill: firstTextObj.fill,
          fontWeight: firstTextObj.fontWeight,
          fontStyle: firstTextObj.fontStyle,
          underline: firstTextObj.underline,
          textAlign: firstTextObj.textAlign,
          charSpacing: firstTextObj.charSpacing
        };
      }
      return null;
    }

    // Single selection
    return {
      fontFamily: activeObject.fontFamily,
      fontSize: activeObject.fontSize,
      fill: activeObject.fill,
      fontWeight: activeObject.fontWeight,
      fontStyle: activeObject.fontStyle,
      underline: activeObject.underline,
      textAlign: activeObject.textAlign,
      charSpacing: activeObject.charSpacing
    };
  }

  /**
   * Clear canvas
   */
  clearCanvas(): void {
    if (!this.fabricCanvas) return;
    this.fabricCanvas.clear();
    this.fabricCanvas.backgroundColor = 'transparent';
  }

  /**
   * Export canvas as JSON
   */
  toJSON(): any {
    return this.fabricCanvas?.toJSON();
  }

  /**
   * Load canvas from JSON
   */
  loadFromJSON(json: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.fabricCanvas) {
        reject('Canvas not initialized');
        return;
      }

      this.fabricCanvas.loadFromJSON(json, () => {
        this.fabricCanvas.renderAll();
        resolve();
      });
    });
  }

  /**
   * Export canvas as image
   */
  toDataURL(format: string = 'png'): string {
    return this.fabricCanvas?.toDataURL({ format, quality: 1 });
  }

  /**
   * Dispose canvas
   */
  dispose(): void {
    // Clean up keyboard listener
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = undefined;
    }
    
    if (this.fabricCanvas) {
      this.fabricCanvas.dispose();
      this.fabricCanvas = null;
    }
  }

  /**
   * Resize canvas
   */
  resizeCanvas(width: number, height: number): void {
    if (!this.fabricCanvas) return;
    
    this.fabricCanvas.setWidth(width);
    this.fabricCanvas.setHeight(height);
    this.fabricCanvas.requestRenderAll();
  }

  /**
   * Get canvas instance (use with caution)
   */
  getCanvas(): any {
    return this.fabricCanvas;
  }
}

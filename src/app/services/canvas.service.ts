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
      // Setup non-intrusive alignment guides
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

      // Group (Ctrl+G / Cmd+G)
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
        if (!isTypingInInput) {
          e.preventDefault();
          console.log('Group triggered');
          this.groupSelected();
        }
      }

      // Ungroup (Ctrl+Shift+G / Cmd+Shift+G)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'g') {
        if (!isTypingInInput) {
          e.preventDefault();
          console.log('Ungroup triggered');
          this.ungroupSelected();
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
   * Setup alignment guides - Visual guides + gentle snapping when VERY close
   */
  private setupAlignmentGuides(): void {
    if (!this.fabricCanvas) return;

    let alignmentLines: any[] = [];
    const showDistance = 8; // Show guide when within 8 pixels
    const snapDistance = 2; // Snap only when within 2 pixels
    const lineColor = '#FF0066';
    const lineWidth = 1;

    const createLine = (coords: number[]): any => {
      return new this.fabric.Line(coords, {
        stroke: lineColor,
        strokeWidth: lineWidth,
        selectable: false,
        evented: false,
        strokeDashArray: [5, 5],
        excludeFromExport: true,
        isAlignmentGuide: true
      });
    };

    const clearAlignmentLines = () => {
      if (alignmentLines.length === 0) return;
      alignmentLines.forEach(line => this.fabricCanvas.remove(line));
      alignmentLines = [];
    };

    const getCanvasCenter = () => ({
      x: this.fabricCanvas.width / 2,
      y: this.fabricCanvas.height / 2
    });

    // Check alignment - show guides at wider range, snap only when VERY close
    const checkAlignment = (obj: any) => {
      if (!obj || obj.isAlignmentGuide) return;

      clearAlignmentLines();

      const canvasCenter = getCanvasCenter();
      const objCenter = obj.getCenterPoint();
      const objBounds = obj.getBoundingRect();
      
      const allObjects = this.fabricCanvas.getObjects().filter((o: any) => 
        o !== obj && o.type !== 'line' && o.visible && !o.isAlignmentGuide
      );

      let snapped = false;

      // Vertical center alignment (canvas)
      const verticalCenterDist = Math.abs(objCenter.x - canvasCenter.x);
      if (verticalCenterDist < showDistance) {
        // Snap only if VERY close
        if (verticalCenterDist < snapDistance) {
          obj.set({ left: obj.left + (canvasCenter.x - objCenter.x) });
          obj.setCoords();
          snapped = true;
        }
        // Always show guide
        const line = createLine([canvasCenter.x, 0, canvasCenter.x, this.fabricCanvas.height]);
        this.fabricCanvas.add(line);
        alignmentLines.push(line);
      }

      // Horizontal center alignment (canvas)
      const horizontalCenterDist = Math.abs(objCenter.y - canvasCenter.y);
      if (horizontalCenterDist < showDistance) {
        // Snap only if VERY close
        if (horizontalCenterDist < snapDistance) {
          obj.set({ top: obj.top + (canvasCenter.y - objCenter.y) });
          obj.setCoords();
          snapped = true;
        }
        // Always show guide
        const line = createLine([0, canvasCenter.y, this.fabricCanvas.width, canvasCenter.y]);
        this.fabricCanvas.add(line);
        alignmentLines.push(line);
      }

      // Check alignment with other objects
      allObjects.forEach((target: any) => {
        const targetCenter = target.getCenterPoint();
        const targetBounds = target.getBoundingRect();

        // Vertical alignment (centers)
        const verticalObjectDist = Math.abs(objCenter.x - targetCenter.x);
        if (verticalObjectDist < showDistance) {
          if (verticalObjectDist < snapDistance) {
            obj.set({ left: obj.left + (targetCenter.x - objCenter.x) });
            obj.setCoords();
            snapped = true;
          }
          const y1 = Math.min(objBounds.top, targetBounds.top);
          const y2 = Math.max(objBounds.top + objBounds.height, targetBounds.top + targetBounds.height);
          const line = createLine([targetCenter.x, y1, targetCenter.x, y2]);
          this.fabricCanvas.add(line);
          alignmentLines.push(line);
        }

        // Horizontal alignment (centers)
        const horizontalObjectDist = Math.abs(objCenter.y - targetCenter.y);
        if (horizontalObjectDist < showDistance) {
          if (horizontalObjectDist < snapDistance) {
            obj.set({ top: obj.top + (targetCenter.y - objCenter.y) });
            obj.setCoords();
            snapped = true;
          }
          const x1 = Math.min(objBounds.left, targetBounds.left);
          const x2 = Math.max(objBounds.left + objBounds.width, targetBounds.left + targetBounds.width);
          const line = createLine([x1, targetCenter.y, x2, targetCenter.y]);
          this.fabricCanvas.add(line);
          alignmentLines.push(line);
        }

        // Left edge alignment
        const leftEdgeDist = Math.abs(objBounds.left - targetBounds.left);
        if (leftEdgeDist < showDistance) {
          if (leftEdgeDist < snapDistance) {
            obj.set({ left: obj.left + (targetBounds.left - objBounds.left) });
            obj.setCoords();
            snapped = true;
          }
          const y1 = Math.min(objBounds.top, targetBounds.top);
          const y2 = Math.max(objBounds.top + objBounds.height, targetBounds.top + targetBounds.height);
          const line = createLine([targetBounds.left, y1, targetBounds.left, y2]);
          this.fabricCanvas.add(line);
          alignmentLines.push(line);
        }

        // Right edge alignment
        const objRight = objBounds.left + objBounds.width;
        const targetRight = targetBounds.left + targetBounds.width;
        const rightEdgeDist = Math.abs(objRight - targetRight);
        if (rightEdgeDist < showDistance) {
          if (rightEdgeDist < snapDistance) {
            obj.set({ left: obj.left + (targetRight - objRight) });
            obj.setCoords();
            snapped = true;
          }
          const y1 = Math.min(objBounds.top, targetBounds.top);
          const y2 = Math.max(objBounds.top + objBounds.height, targetBounds.top + targetBounds.height);
          const line = createLine([targetRight, y1, targetRight, y2]);
          this.fabricCanvas.add(line);
          alignmentLines.push(line);
        }

        // Top edge alignment
        const topEdgeDist = Math.abs(objBounds.top - targetBounds.top);
        if (topEdgeDist < showDistance) {
          if (topEdgeDist < snapDistance) {
            obj.set({ top: obj.top + (targetBounds.top - objBounds.top) });
            obj.setCoords();
            snapped = true;
          }
          const x1 = Math.min(objBounds.left, targetBounds.left);
          const x2 = Math.max(objBounds.left + objBounds.width, targetBounds.left + targetBounds.width);
          const line = createLine([x1, targetBounds.top, x2, targetBounds.top]);
          this.fabricCanvas.add(line);
          alignmentLines.push(line);
        }

        // Bottom edge alignment
        const objBottom = objBounds.top + objBounds.height;
        const targetBottom = targetBounds.top + targetBounds.height;
        const bottomEdgeDist = Math.abs(objBottom - targetBottom);
        if (bottomEdgeDist < showDistance) {
          if (bottomEdgeDist < snapDistance) {
            obj.set({ top: obj.top + (targetBottom - objBottom) });
            obj.setCoords();
            snapped = true;
          }
          const x1 = Math.min(objBounds.left, targetBounds.left);
          const x2 = Math.max(objBounds.left + objBounds.width, targetBounds.left + targetBounds.width);
          const line = createLine([x1, targetBottom, x2, targetBottom]);
          this.fabricCanvas.add(line);
          alignmentLines.push(line);
        }
      });

      if (alignmentLines.length > 0 || snapped) {
        this.fabricCanvas.renderAll();
      }
    };

    // Throttle the alignment check to reduce frequency
    let isChecking = false;
    this.fabricCanvas.on('object:moving', (e: any) => {
      if (!isChecking) {
        isChecking = true;
        requestAnimationFrame(() => {
          checkAlignment(e.target);
          isChecking = false;
        });
      }
    });

    this.fabricCanvas.on('object:modified', () => {
      clearAlignmentLines();
      this.fabricCanvas.renderAll();
    });

    this.fabricCanvas.on('mouse:up', () => {
      clearAlignmentLines();
      this.fabricCanvas.renderAll();
    });

    this.fabricCanvas.on('selection:cleared', () => {
      clearAlignmentLines();
    });

    this.fabricCanvas.on('selection:created', () => {
      clearAlignmentLines();
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
   * Group selected objects
   */
  groupSelected(): void {
    if (!this.fabric || !this.fabricCanvas) return;

    const activeObject = this.fabricCanvas.getActiveObject();
    
    // Check if multiple objects are selected
    if (!activeObject || (activeObject.type !== 'activeSelection' && activeObject.type !== 'activeselection')) {
      console.log('Please select multiple objects to group');
      return;
    }

    // Get the selected objects
    const selection = activeObject as any;
    const objects = selection.getObjects ? selection.getObjects() : selection._objects || [];
    
    if (objects.length < 2) {
      console.log('Need at least 2 objects to group');
      return;
    }

    // Deselect current selection
    this.fabricCanvas.discardActiveObject();

    // Create a group from the selected objects
    const group = new this.fabric.Group(objects, {
      selectable: true,
      hasControls: true,
      hasBorders: true
    });

    // Remove individual objects from canvas
    objects.forEach((obj: any) => {
      this.fabricCanvas.remove(obj);
    });

    // Add the group to canvas
    this.fabricCanvas.add(group);
    this.fabricCanvas.setActiveObject(group);
    this.fabricCanvas.renderAll();

    console.log('✓ Objects grouped');
  }

  /**
   * Ungroup selected group
   */
  ungroupSelected(): void {
    if (!this.fabric || !this.fabricCanvas) return;

    const activeObject = this.fabricCanvas.getActiveObject();
    
    // Check if it's a group
    if (!activeObject || activeObject.type !== 'group') {
      console.log('Please select a grouped object to ungroup');
      return;
    }

    const group = activeObject as any;
    const items = group.getObjects();

    // Ungroup: get the transformation matrix
    const groupLeft = group.left || 0;
    const groupTop = group.top || 0;
    const groupAngle = group.angle || 0;
    const groupScaleX = group.scaleX || 1;
    const groupScaleY = group.scaleY || 1;

    // Remove the group
    this.fabricCanvas.remove(group);

    // Add individual objects back
    items.forEach((item: any) => {
      // Calculate absolute position
      const itemLeft = groupLeft + (item.left || 0) * groupScaleX;
      const itemTop = groupTop + (item.top || 0) * groupScaleY;

      // Create a clone with proper positioning
      item.set({
        left: itemLeft,
        top: itemTop,
        angle: (item.angle || 0) + groupAngle,
        scaleX: (item.scaleX || 1) * groupScaleX,
        scaleY: (item.scaleY || 1) * groupScaleY,
        selectable: true,
        hasControls: true,
        hasBorders: true
      });

      this.fabricCanvas.add(item);
    });

    this.fabricCanvas.renderAll();
    console.log('✓ Group ungrouped');
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

    textObj.setCoords();
    this.fabricCanvas.add(textObj);

    // If there's a subtitle, create it separately and multi-select both
    if (template.subtitle) {
      // Wait for main text to render to get proper height
      await new Promise(resolve => setTimeout(resolve, 50));
      
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

      subtitleObj.setCoords();
      this.fabricCanvas.add(subtitleObj);
      this.fabricCanvas.renderAll();

      // Multi-select both objects
      setTimeout(() => {
        const selection = new this.fabric.ActiveSelection([textObj, subtitleObj], {
          canvas: this.fabricCanvas
        });
        this.fabricCanvas.setActiveObject(selection);
        this.fabricCanvas.renderAll();
        
        textObj.setCoords();
        subtitleObj.setCoords();
        this.handleSelection(selection);
        console.log('✓ Pre-designed text added with multi-selection');
      }, 100);
    } else {
      // Single text without subtitle
      this.fabricCanvas.setActiveObject(textObj);
      this.fabricCanvas.renderAll();
      
      setTimeout(() => {
        textObj.setCoords();
        this.handleSelection(textObj);
      }, 100);
    }
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
   * Add shape to canvas
   */
  addShape(shapeId: string, color: string = '#4ecdc4'): void {
    if (!this.fabric || !this.fabricCanvas) return;

    let shape: any;
    const left = 150;
    const top = 150;

    switch (shapeId) {
      case 'circle':
        shape = new this.fabric.Circle({
          radius: 50,
          fill: color,
          left,
          top
        });
        break;

      case 'square':
        shape = new this.fabric.Rect({
          width: 100,
          height: 100,
          fill: color,
          left,
          top
        });
        break;

      case 'rectangle':
        shape = new this.fabric.Rect({
          width: 150,
          height: 80,
          fill: color,
          left,
          top
        });
        break;

      case 'triangle':
        shape = new this.fabric.Triangle({
          width: 100,
          height: 100,
          fill: color,
          left,
          top
        });
        break;

      case 'star':
        // Create star using polygon points
        const starPoints = this.getStarPoints(5, 50, 25);
        shape = new this.fabric.Polygon(starPoints, {
          fill: color,
          left,
          top
        });
        break;

      case 'heart':
        // Create heart using SVG path
        const heartPath = 'M50,85 C50,85 15,60 15,40 C15,25 25,20 35,25 C40,28 45,35 50,40 C55,35 60,28 65,25 C75,20 85,25 85,40 C85,60 50,85 50,85 Z';
        shape = new this.fabric.Path(heartPath, {
          fill: color,
          left,
          top,
          scaleX: 1.2,
          scaleY: 1.2
        });
        break;

      case 'hexagon':
        const hexPoints = this.getPolygonPoints(6, 50);
        shape = new this.fabric.Polygon(hexPoints, {
          fill: color,
          left,
          top
        });
        break;

      case 'octagon':
        const octPoints = this.getPolygonPoints(8, 50);
        shape = new this.fabric.Polygon(octPoints, {
          fill: color,
          left,
          top
        });
        break;

      case 'pentagon':
        const pentPoints = this.getPolygonPoints(5, 50);
        shape = new this.fabric.Polygon(pentPoints, {
          fill: color,
          left,
          top
        });
        break;

      case 'diamond':
        shape = new this.fabric.Polygon([
          { x: 50, y: 0 },
          { x: 100, y: 50 },
          { x: 50, y: 100 },
          { x: 0, y: 50 }
        ], {
          fill: color,
          left,
          top
        });
        break;

      case 'arrow-right':
        const arrowRightPath = 'M10,50 L70,50 L70,30 L90,50 L70,70 L70,50 Z';
        shape = new this.fabric.Path(arrowRightPath, {
          fill: color,
          left,
          top,
          scaleX: 1.5,
          scaleY: 1.5
        });
        break;

      case 'arrow-left':
        const arrowLeftPath = 'M90,50 L30,50 L30,30 L10,50 L30,70 L30,50 Z';
        shape = new this.fabric.Path(arrowLeftPath, {
          fill: color,
          left,
          top,
          scaleX: 1.5,
          scaleY: 1.5
        });
        break;

      default:
        console.error('Unknown shape:', shapeId);
        return;
    }

    if (shape) {
      shape.set({
        selectable: true,
        hasControls: true,
        hasBorders: true,
        lockUniScaling: false,
        originX: 'left',
        originY: 'top'
      });

      shape.setCoords();
      this.fabricCanvas.add(shape);
      this.fabricCanvas.setActiveObject(shape);
      this.fabricCanvas.renderAll();

      setTimeout(() => {
        shape.setCoords();
        this.fabricCanvas.requestRenderAll();
      }, 50);

      console.log(`✓ Added ${shapeId} shape to canvas`);
    }
  }

  /**
   * Helper: Get star points
   */
  private getStarPoints(points: number, outerRadius: number, innerRadius: number): any[] {
    const step = Math.PI / points;
    const coords: any[] = [];

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = i * step - Math.PI / 2;
      coords.push({
        x: 50 + radius * Math.cos(angle),
        y: 50 + radius * Math.sin(angle)
      });
    }

    return coords;
  }

  /**
   * Helper: Get regular polygon points
   */
  private getPolygonPoints(sides: number, radius: number): any[] {
    const coords: any[] = [];
    const angleStep = (2 * Math.PI) / sides;

    for (let i = 0; i < sides; i++) {
      const angle = i * angleStep - Math.PI / 2;
      coords.push({
        x: 50 + radius * Math.cos(angle),
        y: 50 + radius * Math.sin(angle)
      });
    }

    return coords;
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

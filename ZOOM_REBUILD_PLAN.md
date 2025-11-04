# Zoom Functionality Rebuild Plan

## Problem Statement

The current zoom implementation only zooms the **Fabric.js canvas content** (text, images, shapes), but doesn't zoom the **entire print area** including:
- The print area box (dashed blue border)
- The "Print Area" label
- The resize handles
- The background container
- The surrounding white canvas area

**User Expectation:** When zooming, the entire design workspace should scale up/down as if viewing through a magnifying glass.

## Current Implementation Issues

1. **Fabric.js Internal Zoom Only**
   - `fabricCanvas.zoomToPoint()` only scales canvas objects
   - HTML container (`.print-area-box`, `.tshirt-canvas`) stays fixed size
   - Creates disconnect between visual elements

2. **Fixed UI Positioning**
   - Panels use `position: fixed` (correctly outside zoom)
   - But canvas container doesn't scale

3. **No Visual Feedback**
   - User zooms but sees no change in overall view
   - Only canvas content would scale (if it worked)

## Solution Architecture

### **Recommended Approach: CSS Transform Zoom**

Instead of using Fabric.js's internal zoom, we'll use CSS `transform: scale()` on the HTML container:

```
.canvas-area (viewport - no transform)
  └── .tshirt-canvas (apply transform: scale() here)
        └── .print-area-box
              └── <canvas> (Fabric.js always at zoom 1.0)
```

**Benefits:**
- ✅ Entire visual area scales together
- ✅ Print area box, labels, handles all zoom
- ✅ Simpler logic - one transform property
- ✅ Smooth CSS transitions
- ✅ Better performance (GPU accelerated)
- ✅ No Fabric.js zoom conflicts

**Tradeoffs:**
- ⚠️ Mouse coordinates need transformation
- ⚠️ Pan logic must account for scale
- ⚠️ Event positions need adjustment

## Implementation Plan

### Phase 1: Update Canvas Service

**File:** `canvas.service.ts`

1. **Remove Fabric.js zoom calls**
   ```typescript
   // OLD: this.fabricCanvas.zoomToPoint(...)
   // NEW: Keep canvas at zoom 1.0, emit scale event
   ```

2. **Add scale state management**
   ```typescript
   private currentScale = signal(1.0);
   
   setScale(scale: number): void {
     const clamped = Math.max(0.1, Math.min(4, scale));
     this.currentScale.set(clamped);
     // Emit to component
   }
   ```

3. **Update zoom methods**
   ```typescript
   zoomIn() { this.setScale(this.currentScale() * 1.1); }
   zoomOut() { this.setScale(this.currentScale() * 0.9); }
   resetZoom() { this.setScale(1.0); }
   ```

4. **Adjust mouse event coordinates**
   ```typescript
   // Transform mouse position based on scale
   private transformMouseCoords(e: MouseEvent, scale: number) {
     return {
       x: e.offsetX / scale,
       y: e.offsetY / scale
     };
   }
   ```

### Phase 2: Update Component

**File:** `customization.ts`

1. **Add scale signal**
   ```typescript
   protected canvasScale = signal(1.0);
   ```

2. **Subscribe to scale changes**
   ```typescript
   ngAfterViewInit() {
     this.canvasService.currentScale$.subscribe(scale => {
       this.canvasScale.set(scale);
       this.zoomLevel.set(Math.round(scale * 100));
     });
   }
   ```

3. **Update zoom button methods**
   - Already call service methods (no change needed)

### Phase 3: Update Template

**File:** `customization.html`

1. **Apply transform to tshirt-canvas**
   ```html
   <div class="tshirt-canvas" 
        [style.transform]="'scale(' + canvasScale() + ')'">
     <!-- existing content -->
   </div>
   ```

### Phase 4: Update Styles

**File:** `customization.css`

1. **Set transform-origin**
   ```css
   .tshirt-canvas {
     transform-origin: center center;
     transition: transform 0.2s ease-out;
   }
   ```

2. **Ensure canvas-area allows overflow**
   ```css
   .canvas-area {
     overflow: auto; /* Allow scrolling when zoomed */
   }
   ```

### Phase 5: Fix Mouse Interactions

1. **Update click handlers** to adjust for scale
2. **Update drag handlers** to adjust for scale
3. **Update resize handlers** to adjust for scale

## Testing Checklist

- [ ] Zoom in (+) scales entire view
- [ ] Zoom out (−) scales entire view
- [ ] Fit (⊡) resets to 100%
- [ ] Mouse wheel zoom works
- [ ] Print area box zooms with canvas
- [ ] Resize handles zoom correctly
- [ ] Text/image placement accurate at all zoom levels
- [ ] Pan (Space+drag) works with zoom
- [ ] Object selection accurate
- [ ] Zoom level display shows correct %
- [ ] Smooth transitions
- [ ] No performance issues
- [ ] View switching preserves zoom level
- [ ] Undo/redo works with zoom

## Edge Cases to Handle

1. **Zoomed + Panned State**
   - Save pan offset separately
   - Restore both zoom and pan on view switch

2. **Mouse Events at High Zoom**
   - Ensure clicks register accurately
   - Test drag operations

3. **Resize Handles at Low Zoom**
   - Handles should still be clickable
   - Visual feedback remains clear

4. **Scroll Behavior**
   - When zoomed > 100%, allow scrolling
   - Center content when zoomed < 100%

## Rollback Plan

If CSS transform approach has issues:
1. Keep backup of current implementation
2. Try Approach B (Hybrid Zoom)
3. Or revert to Fabric.js only zoom (document limitation)

## Success Criteria

✅ User can see entire print area scale up/down
✅ All visual elements zoom together
✅ Mouse interactions remain accurate
✅ Performance is smooth (60fps)
✅ No visual glitches or jumps
✅ Zoom persists across view switches
✅ UI controls remain stable (fixed position)

## Implementation Order

1. Phase 4 (CSS) - Quickest to test visual concept
2. Phase 3 (Template) - Wire up transform
3. Phase 1 (Service) - Update scale logic
4. Phase 2 (Component) - Connect signals
5. Phase 5 (Mouse) - Fix interactions
6. Testing - Full QA pass

## Estimated Effort

- **Planning:** 15 minutes ✅ DONE
- **Implementation:** 45-60 minutes
- **Testing:** 30 minutes
- **Bug fixes:** 30 minutes
- **Total:** ~2-2.5 hours

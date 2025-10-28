# Fabric.js Integration Plan for RFM Design Tool

## Overview
Transform the static T-shirt preview into a fully interactive design canvas using Fabric.js for professional-grade design capabilities.

## Phase 1: Foundation Setup

### 1.1 Install Fabric.js
```bash
npm install fabric @types/fabric
```

### 1.2 Create Canvas Service
- **File**: `src/app/services/fabric-canvas.service.ts`
- **Purpose**: Centralized canvas management with events
- **Features**:
  - Initialize/destroy canvas instances
  - Object manipulation (add/remove/modify)
  - Export to JSON/Image
  - Undo/Redo stack
  - Layer management

### 1.3 Canvas Integration Component
- **File**: `src/app/components/customization/design-canvas/design-canvas.component.ts`
- **Purpose**: Wrap Fabric.js canvas with Angular lifecycle
- **Features**:
  - Responsive canvas sizing
  - Print area boundaries
  - Grid/snap helpers
  - Zoom/pan controls

## Phase 2: Object Integration

### 2.1 Text Objects
- Connect TextPanel font selection → `fabric.Text`
- Properties: font-family, size, color, bold/italic
- Live editing with text input overlay
- Text effects: stroke, shadow, gradient

### 2.2 Image Objects
- Upload panel → `fabric.Image`
- Graphics panel SVG → `fabric.Group`
- Patterns → background or `fabric.Pattern`
- Auto-fit to print area with aspect ratio

### 2.3 Shape Objects  
- Basic shapes from Graphics panel
- Custom SVG import and manipulation
- Vector editing capabilities

## Phase 3: Advanced Features

### 3.1 Layer Management
- Layer panel showing object stack
- Drag to reorder, eye icon to hide/show
- Lock objects to prevent editing

### 3.2 History System
- Implement undo/redo with command pattern
- Canvas state snapshots
- Auto-save to localStorage

### 3.3 Export System
- High-resolution PNG/JPG export
- PDF generation for print
- Save design as JSON template

## Phase 4: UI Enhancements

### 4.1 Object Properties Panel
- Context-sensitive property editor
- Color picker, font controls, transformation
- Alignment and distribution tools

### 4.2 Toolbar Integration
- Selection, move, rotate, scale tools
- Drawing tools (pen, brush, shapes)
- Crop and mask functionality

### 4.3 Template System
- Save current design as reusable template
- Template preview and quick apply
- Version management

## Implementation Priority

### High Priority (Immediate)
1. Install Fabric.js and create canvas service
2. Replace static T-shirt with interactive canvas
3. Connect text panel to add editable text objects
4. Basic upload → image object workflow

### Medium Priority (Week 2)
1. Graphics panel → SVG object integration
2. Basic object manipulation (move, resize, delete)
3. Patterns as backgrounds or fills
4. Export functionality

### Low Priority (Future)
1. Advanced text effects and typography
2. Vector drawing tools
3. Template management system
4. Collaborative editing features

## Technical Considerations

### Canvas Setup
```typescript
// Print area: 3852 × 4398 px at 300 DPI
// Display size: ~400x500px (scaled for screen)
const canvas = new fabric.Canvas('canvas', {
  width: 400,
  height: 500,
  backgroundColor: '#ffffff'
});

// Set actual print dimensions for export
canvas.setDimensions({
  width: 3852,
  height: 4398
}, { backstoreOnly: true });
```

### Object Constraints
- Clip objects to print area boundaries
- Maintain minimum text size for readability
- Image DPI warnings for print quality
- Color space considerations (RGB → CMYK)

### Performance
- Lazy load large images
- Virtualize object lists for large designs
- Optimize re-renders with object caching
- Web Workers for export processing

## File Structure
```
src/app/
├── services/
│   ├── fabric-canvas.service.ts
│   ├── font-loader.service.ts (existing)
│   └── export.service.ts
├── components/customization/
│   ├── design-canvas/
│   │   ├── design-canvas.component.ts
│   │   ├── design-canvas.component.html
│   │   └── design-canvas.component.css
│   ├── properties-panel/
│   │   └── ...
│   └── layers-panel/
│       └── ...
└── models/
    ├── design-object.interface.ts
    └── canvas-state.interface.ts
```

## Integration Points

### Existing Panels → Canvas Actions
- **Upload Panel**: `file` → `fabric.Image`
- **Text Panel**: `font` → `fabric.Text` 
- **Graphics Panel**: `svg` → `fabric.loadSVGFromString()`
- **Patterns Panel**: `image` → `canvas.setBackgroundImage()`
- **Templates Panel**: `json` → `canvas.loadFromJSON()`
- **Library Panel**: saved objects → `canvas.add()`

### Canvas → UI Updates
- Object selection → Properties panel
- Canvas changes → Undo/redo button states
- Export progress → Loading indicators
- Validation errors → Toast notifications

This plan provides a roadmap for turning the current static preview into a professional design tool while maintaining the existing UI investment.
# 🎯 Context Summary: RFM Custom Apparel Designer - Current State

> **Purpose:** Use this as a context prompt when starting a new chat to instantly bring the AI up to speed on the current project state.

---

## 📋 PROJECT OVERVIEW

**Project:** RFM Custom Apparel - Product Customization Designer  
**Tech Stack:** Angular 20.1.0 (Standalone + Signals) + Node.js/Express + MySQL + Fabric.js 6.7.1  
**Current Status:** Core features complete, advanced UX features recently implemented  
**Working Directory:** `c:\xampp\htdocs\rfm`

---

## 🎨 WHAT WE'RE BUILDING

A **full-stack e-commerce platform** for custom apparel with an advanced designer tool where customers can:
- Design custom t-shirts with text, images, graphics, patterns, and templates
- Configure product details (size, color, neckline, print area)
- View live previews with zoom/pan controls
- Place orders with customized designs
- Track order status through production workflow

---

## ✅ FEATURES ALREADY IMPLEMENTED

### **1. Designer Core Features (100% Complete)**
✅ **Canvas System:**
- Fabric.js 6.7.1 canvas with multi-view support (front/back/neck label)
- Text tool with font selection, styling (bold/italic/underline), colors, alignment
- Image upload with drag/drop, resize, rotate, delete
- Graphics library with pre-made clipart
- Templates library for quick designs
- Patterns library for backgrounds
- Undo/redo functionality
- Object selection, deletion, and manipulation
- Export design as JSON and images

✅ **Product Configuration:**
- Product type selection (t-shirt, polo, hoodie, etc.)
- Neckline options (round, v-neck, collar)
- Size selection: Regular (S-XXXXL with price tiers), Kids (K6-K10), Custom measurements
- Color picker with 8 base colors
- Dynamic pricing calculation based on size
- Production cost tracking

### **2. CSS Transform Zoom System (100% Complete) ✨ NEW**
**Status:** Fully implemented November 4-5, 2025 (All 6 phases complete)  
**Documentation:** `ZOOM_IMPLEMENTATION_COMPLETE.md`  
**Plan:** `ZOOM_REBUILD_PLAN.md`

✅ **Implementation Phases Completed:**

**Phase 1: UI Layout Restructure** (Nov 4, 2025)
- Moved all UI panels outside `.canvas-area` to prevent zoom interference
- Changed panels from `position: absolute` to `position: fixed`
- Only `.tshirt-canvas` container scales with zoom
- Tools panel, product info panel, zoom controls, save button all viewport-relative

**Phase 2: CSS Transform Setup** (Nov 4, 2025)
- Applied `transform-origin: center center` to `.tshirt-canvas`
- Added smooth `transition: transform 0.2s ease-out`
- GPU acceleration hint with `will-change: transform`
- Template binding: `[style.transform]="'scale(' + canvasScale() + ')'"`

**Phase 3: Component State Management** (Nov 4, 2025)
- Added `canvasScale = signal(1.0)` for CSS scale value
- Added `zoomLevel = signal(100)` for display percentage
- Created `zoomIn()`, `zoomOut()`, `zoomFit()` methods
- All methods delegate to `canvasService` for centralized state

**Phase 4: Service Layer Observable Pattern** (Nov 4, 2025)
- Created `canvasScaleSubject = new BehaviorSubject<number>(1.0)`
- Exposed `canvasScale$` observable for reactive updates
- Implemented `zoomIn()`, `zoomOut()`, `setScale()`, `getScale()` methods
- Scale clamping: min 0.1 (10%), max 4.0 (400%)
- Component subscribes to scale changes in `ngAfterViewInit()`

**Phase 5: Mouse Wheel/Trackpad Support** (Nov 5, 2025)
- Native DOM `wheel` event on `.canvas-area` (not Fabric.js events)
- Smooth zoom formula: `scale *= 0.999 ** event.deltaY`
- Works universally on desktop mouse wheel AND laptop trackpad
- `preventDefault()` to stop page scroll during zoom

**Phase 6: Coordinate Translation for Mouse Interactions** (Nov 5, 2025)
- Fixed resize handles to work at all zoom levels
- Key formula: `canvasDelta = viewportDelta / scale`
- Applied to `onResizeMove()` method (lines 571-584)
- Mouse coordinates transformed from viewport space to canvas space
- Ensures resize speed is consistent regardless of zoom level

✅ **Features:**
- Figma-style CSS `transform: scale()` zoom (GPU-accelerated)
- Range: 10% to 400% (0.1 to 4.0 scale)
- Native mouse wheel support (desktop + laptop trackpad)
- Zoom controls UI: +/- buttons, percentage display, reset button
- Fixed UI panels unaffected by zoom (tools, product info, controls)
- Coordinate translation for accurate mouse interactions at any zoom level
- Observable pattern: `canvasScale$` BehaviorSubject in CanvasService
- HTML structure: `.tshirt-canvas` container with `[style.transform]` binding

**Key Files:**
- `src/app/components/customization/customization.ts` (lines 27, 144-146, 213-220, 237)
- `src/app/services/canvas.service.ts` (lines 29-30, 1569-1596)
- `src/app/components/customization/customization.html` (zoom controls, wheel event)
- `src/app/components/customization/customization.css` (panel positioning, zoom controls)

**Architecture:**
```typescript
// Service
canvasScaleSubject = new BehaviorSubject<number>(1.0);
canvasScale$ = canvasScaleSubject.asObservable();
zoomIn() / zoomOut() / setScale(scale)

// Component
protected canvasScale = signal(1.0);
canvasService.canvasScale$.subscribe(scale => this.canvasScale.set(scale));

// Template
<div class="tshirt-canvas" 
     [style.transform]="'scale(' + canvasScale() + ')'"
     (wheel)="onMouseWheel($event)">
```

### **3. Print Area Configuration System (100% Complete) ✨ NEW**
**Status:** Fully implemented November 5, 2025  
**Documentation:** `PRINT_AREA_CONFIGURATION_FEATURE.md`

✅ **Features:**
- **Preset Sizes:** 4 common print area presets
  - Small (12" × 16") - 300×400px - Chest print
  - Medium (16" × 20") - 400×500px - Standard ⭐ Default
  - Large (18" × 24") - 450×600px - Full front
  - Oversized (20" × 28") - 500×700px - All-over
- **Custom Mode:** Manual size control via drag handles or input fields
- **Smart UX:** Mode-based locking (preset = handles hidden, custom = handles visible)
- **Live Dimensions:** Real-time width × height display
- **Input Validation:** 200-800px range with constraints
- **Guard Clauses:** Prevents resize in preset mode

**Key Implementation:**
```typescript
// State management (customization.ts lines 96-103)
protected printAreaMode = signal<'preset' | 'custom'>('preset');
protected selectedPreset = signal<string>('medium');
protected printAreaPresets = [/* 4 presets */];

// Methods (lines 247-289)
selectPrintAreaPreset(preset) // Select preset, lock handles
enableCustomPrintArea()       // Unlock custom mode, show handles
isResizeHandlesEnabled()      // Guard for conditional rendering
updateCanvasWidth/Height()    // Update with validation

// Resize guard (line 558)
startResize() {
  if (!this.isResizeHandlesEnabled()) return; // Block in preset mode
}
```

**UI Structure:**
- Print Area Configuration section in product info panel
- Current dimensions display
- 4 preset buttons in grid layout (active state = blue border)
- Custom Size toggle button (active state = green border)
- Conditional width/height inputs (only in custom mode)
- Conditional resize handles (only in custom mode)

### **4. Scrollable Product Info Panel (100% Complete) ✨ NEW**
**Status:** Fixed November 5, 2025  
**Documentation:** `PANEL_SCROLLING_FIX.md`

✅ **Issues Resolved:**
1. **Panel overflow:** Implemented flexbox layout with scrollable wrapper
2. **Scrolling broken:** Fixed inline `[style.display]="'flex'"` override
3. **Covering zoom controls:** Adjusted `max-height: calc(100vh - 180px)`

**Implementation:**
```css
/* customization.css lines 277-290 */
.product-info-panel {
  position: fixed;
  top: 80px;
  left: 100px;
  max-height: calc(100vh - 180px);  /* Top: 80px, Bottom: 100px clearance */
  display: flex;
  flex-direction: column;
}

/* lines 310-345 */
.panel-scroll-content {
  flex: 1;
  overflow-y: auto;  /* Scrollable content */
}

/* Custom scrollbar: 6px thin, rounded */
.panel-scroll-content::-webkit-scrollbar { width: 6px; }
```

**HTML Structure:**
```html
<!-- customization.html line 413 -->
<div class="product-info-panel" 
     [style.display]="isPanelVisible() ? 'flex' : 'none'">
  <div class="panel-scroll-content">
    <!-- All panel content (Product info + Print area config + Production cost) -->
  </div>
</div>
```

### **5. Backend & Database (90% Complete)**
✅ **Implemented:**
- MySQL database on Aiven Cloud
- JWT authentication (customer + admin roles)
- User registration/login with role-based access
- Shopping cart system (secure, persistent)
- Order management with production workflow stages
- Product catalog CRUD operations
- Image upload via Cloudinary
- PayMongo payment integration (test mode working)

🟡 **Partially Implemented:**
- Inventory management (database schema exists, UI not built)
- Admin dashboard (basic functionality, needs enhancement)

---

## 🚧 CURRENTLY BEING WORKED ON

**Status:** Recently completed zoom + print area + scrolling features  
**Last Build:** November 5, 2025 - Successful (1.18 MB bundle)  
**Current Branch:** `admin-dev`

**Latest Changes (November 4-5, 2025):**

**November 4, 2025:**
1. ✅ Phase 1: UI Layout Restructure (panels outside zoom container)
2. ✅ Phase 2: CSS Transform Setup (GPU-accelerated scaling)
3. ✅ Phase 3: Component State Management (signals for reactive zoom)
4. ✅ Phase 4: Service Layer Observable Pattern (BehaviorSubject)

**November 5, 2025:**
5. ✅ Phase 5: Mouse Wheel/Trackpad Support (native events)
6. ✅ Phase 6: Coordinate Translation (resize handles fix)
7. ✅ Print area preset/custom mode configuration
8. ✅ Scrollable product info panel with proper spacing
9. ✅ Panel height adjustment to avoid covering zoom controls

**All features tested and working:** ✅

---

## 📂 KEY FILES TO UNDERSTAND

### **Designer Component:**
```
src/app/components/customization/
├── customization.ts (713 lines)      # Main component logic
├── customization.html (627 lines)    # Template with zoom + panels
├── customization.css (1470 lines)    # Styling with flexbox + scroll
└── [sub-panels]/                     # Text, Graphics, Templates, etc.
```

### **Services:**
```
src/app/services/
├── canvas.service.ts (1806 lines)    # Fabric.js wrapper + zoom state
├── font-loader.service.ts            # Google Fonts integration
├── auth.service.ts                   # JWT authentication
└── cart.service.ts                   # Shopping cart logic
```

### **Backend:**
```
backend/
├── server.js                         # Express API server
├── routes/                           # API endpoints
├── middleware/authMiddleware.js      # JWT verification
└── .env                              # Environment variables
```

---

## 🎯 NEXT TO IMPLEMENT (Priority Order)

### **Priority 1: Advanced Zoom Features** 🎯
**Status:** Foundation complete, enhancements pending

**What to implement:**
- [ ] **Zoom to cursor position** (zoom where mouse is pointing, not center)
- [ ] **Keyboard shortcuts** (Ctrl+Plus, Ctrl+Minus, Ctrl+0 for reset)
- [ ] **Zoom percentage input field** (manual entry, e.g., type "150%")
- [ ] **Preset zoom buttons** (25%, 50%, 100%, 200%, Fit to Screen)
- [ ] **Pan while zoomed** (Space + drag to move viewport)
- [ ] **Zoom animation** (smooth transition instead of instant)

**Implementation notes:**
- Zoom to cursor requires calculating mouse position relative to canvas center
- Keyboard shortcuts: Use `@HostListener('window:keydown')` with Ctrl key detection
- Pan feature: Track Space key state, modify cursor, handle drag with translate offset
- All coordinate translation math already working (see lines 571-584 in customization.ts)

**Files to modify:**
- `customization.ts` - Add keyboard listeners, pan state, cursor zoom logic
- `customization.html` - Add preset buttons, input field
- `customization.css` - Pan cursor styling, transition animations

### **Priority 2: Inventory Management UI** 📦
**Status:** Database ready (table `customizable_product_stock`), no UI

**What to implement:**
- [ ] Admin panel: Stock Management section in product form
- [ ] Size × Color matrix input (grid for entering quantities)
- [ ] Display current stock levels when editing products
- [ ] Low stock warning indicators (< 10 units)
- [ ] Bulk stock update functionality
- [ ] Backend API endpoints: GET/POST/PUT stock data
- [ ] Customer-facing: "In Stock" / "Out of Stock" badges
- [ ] Prevent adding out-of-stock items to cart
- [ ] Auto-deduct stock on order placement

**Database schema (already exists):**
```sql
customizable_product_stock (
  id, product_id, size, color, quantity, created_at, updated_at
)
```

**Implementation approach:**
1. Create stock-management component
2. Build size×color grid UI (Angular reactive forms)
3. Create backend routes: `/api/products/:id/stock`
4. Integrate with order system for auto-deduction
5. Add stock checks in cart validation

### **Priority 3: Designer UX Enhancements** 🎨
- [ ] **Design history/versions** (save multiple designs, restore previous)
- [ ] **Layer panel** (show object stack, reorder, visibility toggles)
- [ ] **Alignment guides** (snap to edges, center lines, object-to-object)
- [ ] **Smart rulers** (dimension indicators when resizing)
- [ ] **Keyboard shortcuts** (Delete, Ctrl+C/V, Arrow keys for nudge)
- [ ] **Object locking** (prevent accidental movement/deletion)
- [ ] **Grouping/ungrouping** (treat multiple objects as one)

### **Priority 4: Product Catalog Features** 🏷️
- [ ] Product reviews and ratings
- [ ] Related products suggestions
- [ ] Recently viewed products
- [ ] Wishlist/favorites
- [ ] Product comparison tool
- [ ] Size guide modal
- [ ] Fabric care instructions

### **Priority 5: Order & Payment** 💳
- [ ] Move PayMongo from test to production keys
- [ ] Webhook handling for payment confirmation
- [ ] Order confirmation emails
- [ ] PDF invoice generation
- [ ] Refund processing UI
- [ ] Order tracking page for customers

---

## 🔧 DEVELOPMENT ENVIRONMENT

### **Setup:**
```bash
# Frontend (Angular)
cd c:\xampp\htdocs\rfm
npm install
npm start  # Port 4200

# Backend (Node.js)
cd backend
npm install
node server.js  # Port 3001

# Database: MySQL on Aiven Cloud (already connected)
```

### **Environment Variables:**
```env
# backend/.env
DB_HOST=mysql-rfm-project.k.aivencloud.com
DB_USER=avnadmin
DB_PASSWORD=***
DB_NAME=defaultdb
DB_PORT=26871
JWT_SECRET=rfm_custom_apparel_super_secret_key...
CLOUDINARY_CLOUD_NAME=***
CLOUDINARY_API_KEY=***
CLOUDINARY_API_SECRET=***
PAYMONGO_TEST_PUBLIC_KEY=pk_test_***
PAYMONGO_TEST_SECRET_KEY=sk_test_***
```

### **Test Accounts:**
```
Customer: test@customer.com / password123
Admin: admin@rfm.com / admin123
```

---

## 📚 IMPORTANT DOCUMENTATION FILES

**Read these for deep understanding:**

1. **ZOOM_IMPLEMENTATION_COMPLETE.md** - Complete zoom system architecture
2. **PRINT_AREA_CONFIGURATION_FEATURE.md** - Print area preset/custom logic
3. **PANEL_SCROLLING_FIX.md** - UI panel layout and scrolling solution
4. **START_HERE.md** - Overall project navigation guide
5. **CURRENT_SYSTEM_STATUS.md** - System health and working features
6. **FUTURE_FEATURES_TODO.md** - Unimplemented features and priorities
7. **DATABASE_SCHEMA_VISUAL.md** - Database structure and relationships

---

## 🎯 CODING PATTERNS & CONVENTIONS

### **Angular Patterns (v20.1.0):**
```typescript
// Signals (reactive state)
protected canvasScale = signal(1.0);
this.canvasScale.set(2.0);
const value = this.canvasScale();

// Observable subscriptions
this.canvasService.canvasScale$.subscribe(scale => {
  this.canvasScale.set(scale);
});

// Conditional rendering
<div *ngIf="isResizeHandlesEnabled()">...</div>
[style.display]="isPanelVisible() ? 'flex' : 'none'"

// Event handlers
(click)="zoomIn()"
(wheel)="onMouseWheel($event)"
```

### **CSS Layout Patterns:**
```css
/* Fixed UI panels outside zoom container */
.tools-panel {
  position: fixed;  /* Not affected by parent transforms */
  z-index: 100;
}

/* Scrollable panel with flexbox */
.panel {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 180px);
}
.panel-content {
  flex: 1;
  overflow-y: auto;
}

/* Zoom container */
.canvas-container {
  transform: scale(var(--zoom-level));
  transform-origin: center center;
}
```

### **Coordinate Translation (Zoom Math):**
```typescript
// When canvas is scaled, translate viewport coordinates to canvas coordinates
onMouseWheel(event: WheelEvent) {
  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  let scale = this.canvasScale();
  scale = Math.max(0.1, Math.min(4.0, scale + delta));
  this.canvasService.setScale(scale);
}

// For resize handles
startResize(event: MouseEvent, direction: 'e' | 's' | 'se') {
  const scale = this.canvasScale();
  // Mouse position in viewport coordinates
  const viewportX = event.clientX;
  const viewportY = event.clientY;
  // Translate to canvas coordinates
  const canvasDeltaX = (viewportX - this.resizeStartX) / scale;
  const canvasDeltaY = (viewportY - this.resizeStartY) / scale;
}
```

---

## 🚀 HOW TO USE THIS CONTEXT

**When starting a new chat, paste this entire document and say:**

> "I'm continuing work on the RFM Custom Apparel Designer project. I've provided the context summary above. Please acknowledge that you understand the current state and let me know you're ready to help with [NEXT FEATURE NAME]."

**Example next tasks:**
- "Implement zoom to cursor position feature"
- "Build the inventory management UI for admin panel"
- "Add keyboard shortcuts for zoom controls"
- "Create layer panel for object management"
- "Build alignment guides and snap-to-grid"

---

## ⚠️ IMPORTANT NOTES

### **What's Working (Don't Break):**
- ✅ CSS transform zoom system (lines 27, 144-146, 213-220 in customization.ts)
- ✅ Print area preset/custom mode (lines 96-103, 247-289 in customization.ts)
- ✅ Scrollable panel layout (lines 277-345 in customization.css)
- ✅ Coordinate translation for resize handles (lines 571-584 in customization.ts)
- ✅ Observable pattern for zoom state (canvas.service.ts lines 29-30, 1569-1596)

### **Build Info:**
- Bundle size: 1.18 MB (warnings for exceeding 1MB budget - acceptable)
- CSS size: 18.37 kB (warning for exceeding 10KB - acceptable due to designer complexity)
- No errors, all warnings are size-related and acceptable

### **Code Quality:**
- Use signals for reactive state (Angular 20.1.0)
- Guard clauses for mode protection
- Modular method separation (< 10 lines per method)
- TypeScript strict mode enabled
- Comments for complex logic (especially coordinate math)

---

**Document Version:** 1.0  
**Created:** November 5, 2025  
**Last Updated:** November 5, 2025  
**Status:** Ready for immediate use in new chat sessions 🚀

---

## 🎯 QUICK START FOR NEW CHAT

**Copy-paste this into new chat:**

```
I'm working on the RFM Custom Apparel Designer project. Here's the current state:

COMPLETED:
✅ CSS transform zoom system (10%-400%, Figma-style)
✅ Print area presets (Small/Medium/Large/Oversized) + custom mode
✅ Scrollable product info panel with proper spacing
✅ Coordinate translation for mouse interactions at any zoom level
✅ Observable pattern for reactive zoom state management

TECH STACK:
- Angular 20.1.0 (Standalone + Signals)
- Fabric.js 6.7.1 for canvas
- Node.js/Express backend
- MySQL on Aiven Cloud

KEY FILES:
- src/app/components/customization/customization.ts (713 lines)
- src/app/components/customization/customization.html (627 lines)
- src/app/components/customization/customization.css (1470 lines)
- src/app/services/canvas.service.ts (1806 lines)

NEXT TO IMPLEMENT (choose one):
1. Zoom to cursor position (zoom where mouse points, not center)
2. Keyboard shortcuts (Ctrl+Plus/Minus/0)
3. Inventory management UI (database ready, no UI yet)
4. Layer panel for object management
5. Alignment guides and snap-to-grid

Full context: See CONTEXT_SUMMARY_FOR_NEW_CHAT.md

I want to implement: [FEATURE NAME]
```

**The AI will understand the full context and can immediately start implementation!** 🎉

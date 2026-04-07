# CanvasIQ — Full Application Documentation

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Architecture](#architecture)
5. [State Management](#state-management)
   - [Store Setup](#store-setup)
   - [canvasSlice](#canvasslice)
   - [selectionSlice](#selectionslice)
   - [historySlice](#historyslice)
   - [historyMiddleware](#historymiddleware)
6. [Drag and Drop](#drag-and-drop)
   - [Sensors](#sensors)
   - [Collision Detection](#collision-detection)
   - [Snap to Grid](#snap-to-grid)
   - [Drop Handling](#drop-handling)
   - [Grid Cell Drop Targeting](#grid-cell-drop-targeting)
7. [Components](#components)
   - [App](#app)
   - [Canvas](#canvas)
   - [CanvasNode](#canvasnode)
   - [ComponentPalette](#componentpalette)
  - [AiAssistantDrawer](#aiassistantdrawer)
   - [Inspector](#inspector)
   - [ContentTab](#contenttab)
   - [StyleTab](#styletab)
   - [LayoutTab](#layouttab)
   - [JsonPreview](#jsonpreview)
   - [PerformanceOverlay](#performanceoverlay)
8. [Data Schema](#data-schema)
   - [ComponentType](#componenttype)
   - [ComponentProps](#componentprops)
   - [ComponentNode](#componentnode)
9. [Undo / Redo](#undo--redo)
10. [Selectors](#selectors)
11. [Keyboard Shortcuts](#keyboard-shortcuts)
12. [Getting Started](#getting-started)

---

## Overview

**CanvasIQ v1.0** is a browser-based visual drag-and-drop UI builder. It lets users compose layouts from a library of pre-built components, inspect and edit their properties in real time, nest components inside containers, and export the final composition as a JSON schema.

Key capabilities:

- Drag components from a palette onto a freeform canvas.
- Drop components inside `Container` to create nested layouts.
- Edit content, style, and layout properties per component via a right-panel inspector.
- Container supports `flex`, `grid`, and `block` display modes with display-specific layout controls.
- Switching display mode auto-applies sensible defaults (gap, direction, columns, etc).
- Grid containers support configurable rows and columns; dropped components land in the exact cell targeted with visual cell-hover feedback during drag.
- Existing grid children can be dragged between cells; explicit `grid-column` / `grid-row` CSS is pinned per child so placement is deterministic.
- `Ctrl+click` (or `Cmd+click` on Mac) on a container drills into its first child.
- Full undo/redo via `Ctrl+Z` / `Ctrl+Shift+Z`, with up to 50 snapshots.
- Live JSON schema preview with one-click copy and fullscreen view (press `Esc` to exit).
- Real-time FPS performance overlay.
- Snap-to-grid drag modifier (8px grid).

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| UI Framework | React | 19 |
| Language | TypeScript | 5.9 |
| Build Tool | Vite | 8 |
| State Management | Redux Toolkit + React Redux | 2.x / 9.x |
| Memoised Selectors | Reselect | 5.x |
| Immutable Updates | Immer (via RTK) | 11.x |
| Drag and Drop | @dnd-kit/core, sortable, utilities | 6.x / 10.x |
| UI Components | MUI (Material UI) | 7.x |
| Styling | Tailwind CSS | 4.x |

---

## Project Structure

```
src/
├── main.tsx                   # App entry point
├── App.tsx                    # Root layout, DnD context, drag event handlers
├── index.css                  # Global styles, CSS variables, viewport reset
│
├── types/
│   └── schema.ts              # ComponentType, ComponentProps, ComponentNode
│
├── store/
│   ├── index.ts               # Store config, rootReducer, undo/redo intercept
│   ├── historyMiddleware.ts   # Snapshots canvas before mutations
│   └── slices/
│       ├── canvasSlice.ts     # Nodes state: add, move, updateProps, delete
│       ├── selectionSlice.ts  # Currently selected node ID
│       ├── historySlice.ts    # Undo/redo past/future stacks
│
├── selectors/
│   └── canvasSelectors.ts     # Memoized node lookup helpers
│
├── hooks/
│   └── useUndoRedo.ts         # Keyboard listener for Ctrl+Z / Ctrl+Shift+Z
│
├── ai/
│   └── placement.ts           # Validates and applies AI placement suggestions
│
├── dnd/
│   ├── collision.ts           # nestingCollisionDetection — smallest-area heuristic
│   ├── modifires.ts           # snapToGrid — 8px grid snapping modifier
│   └── sensor.ts              # useCanvasSensors — pointer + keyboard sensors
│
└── components/
    ├── JsonPreview.tsx         # Live JSON schema viewer with copy button
    ├── canvas/
    │   ├── Canvas.tsx          # Canvas droppable root, renders root nodes
    │   ├── CanvasNode.tsx      # Single draggable+droppable rendered node
    │   └── PerformanceOverlay.tsx  # FPS counter badge
    ├── inspector/
    │   ├── Inspector.tsx       # Right-panel tab container, dynamic tabs
    │   └── tabs/
    │       ├── ContentTab.tsx  # Label, variant editing
    │       ├── StyleTab.tsx    # Color/font for others; bg/border/shadow for Container
    │       └── LayoutTab.tsx   # W/H/Padding + display mode + flex/grid controls
    └── ui/
      ├── ComponentPalette.tsx   # Left-panel draggable component library
      └── AiAssistantDrawer.tsx  # Embedded CopilotKit assistant tab
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        App.tsx                           │
│  DndContext (sensors, modifiers, collision, handlers)    │
│                                                          │
│  ┌────────────────┐ ┌──────────────────┐ ┌─────────────┐ │
│  │ Left Sidebar   │ │     Canvas       │ │  Inspector  │ │
│  │ - Library tab  │ │   (centre-top)   │ │   (right)   │ │
│  │ - Assistant tab│ ├──────────────────┤ └─────────────┘ │
│  └────────────────┘ │   JSON Preview   │                 │
│                     │ (toggleable pane) │                 │
│                     └──────────────────┘                 │
└──────────────────────────────────────────────────────────┘
                          │  dispatch
                          ▼
┌──────────────────────────────────────────────────────────┐
│                   Redux Store                            │
│   canvas ── nodes: Record<id, ComponentNode>             │
│          ── rootIds: string[]                            │
│   selection ── selectedId: string | null                 │
│   history ── past: CanvasSnapshot[]                      │
│           ── future: CanvasSnapshot[]                    │
└──────────────────────────────────────────────────────────┘
```

Data flows in one direction: user interactions dispatch Redux actions → store updates → React components re-render via `useSelector`.

The AI assistant follows the same state path as manual edits:

1. `AiAssistantDrawer` publishes a compact `canvasStructure` tree to CopilotKit.
2. The model calls `suggest_component_placement` with a proposed action.
3. The UI renders a confirmation card instead of applying the change immediately.
4. On confirm, `applyPlacementSuggestion()` dispatches the same Redux actions used by drag-and-drop.
5. The result is undoable through the normal history pipeline.

---

## State Management

### Store Setup

`src/store/index.ts`

The store uses a custom `rootReducer` wrapper that intercepts `undo` and `redo` actions **before** the base reducers run. When undo or redo fires, the canvas state is replaced with the stored snapshot, then `historySlice` updates its own `past[]`/`future[]` stacks.

```ts
// Simplified rootReducer logic
if (action.type === undo.type) {
  return baseReducer({ ...state, canvas: action.payload }, action);
}
```

**Middleware chain**: `default middleware → historyMiddleware`

---

### canvasSlice

`src/store/slices/canvasSlice.ts`

Holds the full canvas in a flat map `nodes: Record<string, ComponentNode>` plus a `rootIds: string[]` for top-level ordering.

| Action | Payload | What it does |
|---|---|---|
| `addNode` | `{ id, type, parentId, newIndex?, position }` | Creates a new node; inserts at `newIndex` in parent's children or rootIds (appends if omitted) |
| `moveNode` | `{ id, newParentId, newIndex, position }` | Unlinks from old parent, relinks to new parent at correct index; handles same-parent reorder correctly |
| `updateProps` | `{ id, props }` | Merges partial props onto the node |
| `deleteNode` | `id: string` | Recursively deletes node and all descendants |

---

### selectionSlice

`src/store/slices/selectionSlice.ts`

Stores a single `selectedId: string | null`. Dispatch `selectNode(id)` to select, `selectNode(null)` to deselect.

---

### historySlice

`src/store/slices/historySlice.ts`

Manages two stacks of canvas snapshots:

- `past[]` — states to go back to (Ctrl+Z)
- `future[]` — states to go forward to (Ctrl+Shift+Z)

Capped at **50 entries** to conserve memory. A new canvas change clears `future[]`.

| Action | Effect |
|---|---|
| `pushHistory(snapshot)` | Appends to `past[]`, clears `future[]` |
| `undo(snapshot)` | Moves snapshot to `future[]`, pops `past[]` |
| `redo(snapshot)` | Moves snapshot to `past[]`, pops `future[]` |

---

### historyMiddleware

`src/store/historyMiddleware.ts`

Intercepts these canvas mutations **before** they alter state, and dispatches `pushHistory` with the current canvas:

- `canvas/addNode`
- `canvas/moveNode`
- `canvas/updateProps`
- `canvas/deleteNode`

---

## Drag and Drop

### Sensors

`src/dnd/sensor.ts` — `useCanvasSensors()`

Two sensors are active:

- **PointerSensor** — activates after 8px movement to prevent accidental drags on click.
- **KeyboardSensor** — enables full keyboard-driven drag and drop for accessibility.

---

### Collision Detection

`src/dnd/collision.ts` — `nestingCollisionDetection`

Custom collision algorithm that finds the **smallest droppable area** containing the pointer. This ensures:

- Dropping onto a nested container targets the inner container, not an ancestor.
- When no droppable is under the pointer, nothing is returned (drop is cancelled).

---

### Snap to Grid

`src/dnd/modifires.ts` — `snapToGrid`

Applied as a DnD modifier. Quantises the drag transform to **8px increments** in both axes, giving a clean grid-aligned layout experience.

---

### Drop Handling

`src/App.tsx` — `handleDragEnd`

Two scenarios on drop:

1. **Palette item → canvas/container** — dispatches `addNode` with `parentId` set to the container ID (or `null` for canvas root). For grid containers, also dispatches `updateProps` with the computed `gridColumn`/`gridRow` cell.
2. **Existing node → new location** — dispatches `moveNode`. For grid containers, also dispatches `updateProps` with `gridColumn`/`gridRow`. When moved outside a grid, those props are cleared (`undefined`).

`getAbsoluteCanvasPosition(nodeId)` walks up the parent chain summing `position.x/y` to get the true canvas-relative position of any node.

---

### Grid Cell Drop Targeting

`src/App.tsx` — `resolveDropTarget`

When a component is dropped onto a grid container, the function:

1. Reads the container's `gridColumns` and `gridRows` props (defaulting to 2×2).
2. Computes the pointer's column and row within the container rect.
3. Converts that to a child array index (`row * columns + col`).
4. Returns `{ parentId, newIndex, position: {x:0,y:0}, gridCell: { col, row } }` — with 1-indexed `col`/`row` ready to be applied as CSS `grid-column` / `grid-row`.

Non-grid drops return `gridCell: null` so no cell props are written.

---

## Components

### App

`src/App.tsx`

Root application shell. Houses the `DndContext` with all sensors, modifiers, and event handlers. Renders a three-column layout:

```
[ Library or AI Assistant ] [ Canvas + JSON Preview ] [ Inspector ]
```

Key responsibilities:

- Switches the left sidebar between `ComponentPalette` and `AiAssistantDrawer`.
- Toggles the live JSON schema pane on and off.
- Resolves drop targets for root, nested, flex, and grid placements.
- Shows a drag overlay preview while a palette item is being dragged.

Contains `AppInner` (inside Redux `Provider`) and the drag overlay preview shown during palette element drag.

---

### Canvas

`src/components/canvas/Canvas.tsx`

The freeform drop surface. Registered as a `useDroppable` target with id `canvas-root`. Renders all top-level `CanvasNode` components from `rootIds`.

---

### CanvasNode

`src/components/canvas/CanvasNode.tsx`

Renders a single node on the canvas. Key behaviours:

- **Draggable** via `useDraggable` from @dnd-kit.
- **Droppable** via `useDroppable` — enabled only for `Container` and `Card` types.
- **Positioning** — uses `position: absolute` for root-level nodes; switches to `position: relative` for children inside a Container so flex/grid layout takes effect.
- **Grid child placement** — when a node's parent is a grid container, `gridColumn` and `gridRow` CSS props are applied so each child lands exactly in its designated cell regardless of sibling count.
- **Grid drop overlay** — while dragging over a grid container, an overlay matching the configured rows×columns is rendered with a highlighted target cell that tracks the dragged item's centre in real time.
- **Rendering** — dispatches a type-aware preview (`Button`, `Input`, `Image`, `Text`, `Card`, `Container`).
- **Styles** — reads all props directly from Redux node state: `color`, `fontSize`, `backgroundColor`, `border*`, `borderRadius`, `boxShadow`, `padding`, `width`, `height`, `display`, `flexDirection`, `justifyContent`, `alignItems`, `gap`, `gridTemplateColumns`, `gridTemplateRows`.
- **Children** — recursively renders child nodes via `node.children.map(id => <CanvasNode id={id} />)`.
- **Selection** — blue 2px outline + shadow ring when selected.
- **Drop highlight** — dashed blue placeholder shown when dragging over a nestable non-grid container.
- **Memoised selector** — each node creates its own `createSelector` instance so only the affected node re-renders on update.

**Keyboard support** on each node:
- `Enter` / `Space` — select
- `Delete` / `Backspace` — delete
- `Escape` — deselect

**Mouse support:**
- Normal click — select this node
- `Ctrl+click` / `Cmd+click` — if node has children, select the first child (drill-down)

---

### ComponentPalette

`src/components/ui/ComponentPalette.tsx`

Left panel list of all available component types. Each item is:

- **Draggable** with id `palette:<ComponentType>` — triggers an `addNode` dispatch on drop.
- **Clickable** — also adds the component directly to canvas root at a staggered position.

Available types: `Button`, `Text`, `Input`, `Card`, `Container`, `Image`.

This component is shown when the left sidebar is on the `Library` tab.

---

### AiAssistantDrawer

`src/components/ui/AiAssistantDrawer.tsx`

CopilotKit-powered assistant panel embedded in the left sidebar. It does not mutate the canvas directly on model output; instead it enforces a human-in-the-loop workflow.

Main responsibilities:

- Publishes `readableCanvas` metadata, including `canvasStructure`, to the model.
- Registers the `suggest_component_placement` tool.
- Normalises tool arguments with `parseSuggestion()`.
- Applies confirmed suggestions through `src/ai/placement.ts`.
- Surfaces backend and quota errors in a user-readable format.
- Supports `New chat`, which clears both the conversation and suggestion state.

The assistant is shown when the left sidebar is on the `AI Assistant` tab.

---

### Inspector

`src/components/inspector/Inspector.tsx`

Right-panel property editor. Shows tabs dynamically based on the selected component type:

| Component | Tabs shown |
|---|---|
| Container | Style, Layout |
| All others | Content, Style, Layout |

Switching between components that have different tab sets automatically falls back to the first visible tab.

---

### ContentTab

`src/components/inspector/tabs/ContentTab.tsx`

Shown for all non-Container components.

| Field | Applies to | Effect |
|---|---|---|
| Label | All | Sets `props.label` — shown as the visible text of the component on canvas |
| Variant | Button only | `contained` / `outlined` / `text` — changes Button visual style |

---

### StyleTab

`src/components/inspector/tabs/StyleTab.tsx`

Adapts to the selected component type:

**Non-container components:**

| Field | Prop | Type |
|---|---|---|
| Color | `color` | CSS color string |
| Font size | `fontSize` | Number (px) |

**Container:**

| Field | Prop | Type |
|---|---|---|
| Background color | `backgroundColor` | CSS color string |
| Border width | `borderWidth` | Number (px) |
| Border style | `borderStyle` | `solid` / `dashed` / `dotted` / `none` |
| Border color | `borderColor` | CSS color string |
| Border radius | `borderRadius` | Number (px) |
| Box shadow | `boxShadow` | CSS box-shadow string |

---

### LayoutTab

`src/components/inspector/tabs/LayoutTab.tsx`

Available for all component types. Container-specific controls appear based on the selected display mode.

**All components:**

| Field | Prop |
|---|---|
| Width | `width` |
| Height | `height` |
| Padding | `padding` |

**Container only — Display selector:** `block` / `flex` / `grid`

Switching display mode auto-populates defaults:
- `flex` → `flexDirection: row`, `gap: 8`, `alignItems: stretch`, `justifyContent: flex-start`
- `grid` → `gridColumns: 2`, `gridRows: 2`, `gap: 8`

**Container — Flex mode extras:**

| Field | Prop |
|---|---|
| Direction | `flexDirection` |
| Justify content | `justifyContent` |
| Align items | `alignItems` |
| Gap | `gap` |

**Container — Grid mode extras:**

| Field | Prop | Notes |
|---|---|---|
| Rows | `gridRows` | Number of explicit rows (min 1) |
| Columns | `gridColumns` | Number of explicit columns (min 1) |
| Gap | `gap` | Spacing between cells (px) |
| Align items | `alignItems` | Cell cross-axis alignment |
| Justify content | `justifyContent` | Cell main-axis alignment |

---

### JsonPreview

`src/components/JsonPreview.tsx`

Bottom-centre panel. Displays the full canvas state as live-updating pretty-printed JSON. Features:

- Node count badge.
- One-click copy to clipboard with a 2-second check-mark confirmation.
- **Fullscreen toggle** — expand button opens an overlay covering the full viewport. `Esc` key or the collapse button exits fullscreen. `document.body` scroll is suppressed while fullscreen is active.
- Dark code theme (green text on near-black background).

The exported schema shape:

```json
{
  "rootIds": ["uuid1", "uuid2"],
  "nodes": {
    "uuid1": {
      "id": "...", "type": "Button", "props": {}, "children": [],
      "parentId": null, "position": { "x": 32, "y": 32 }
    }
  }
}
```

---

### PerformanceOverlay

`src/components/canvas/PerformanceOverlay.tsx`

Fixed-position FPS badge in the top-right corner. Uses `requestAnimationFrame` to count frames and updates once per second. Color-coded:

| FPS | Color |
|---|---|
| ≥ 55 | Green |
| 40–54 | Yellow |
| < 40 | Red |

Non-interactive (`pointerEvents: none`).

---

## Data Schema

### ComponentType

```ts
type ComponentType =
  | 'Button'
  | 'Text'
  | 'Input'
  | 'Card'
  | 'Container'
  | 'Image';
```

---

### ComponentProps

All props are optional. The `[key: string]: unknown` index signature allows arbitrary extra props.

```ts
interface ComponentProps {
  // Content
  label?              : string;
  variant?            : string;         // Button only: 'contained' | 'outlined' | 'text'

  // Text style
  color?              : string;
  fontSize?           : number;

  // Container visual style
  backgroundColor?    : string;
  borderWidth?        : number;
  borderColor?        : string;
  borderStyle?        : 'none' | 'solid' | 'dashed' | 'dotted';
  borderRadius?       : number;
  boxShadow?          : string;

  // Layout (all types)
  padding?            : number;
  width?              : string | number;
  height?             : string | number;

  // Container layout mode
  display?            : 'block' | 'flex' | 'grid';

  // Flex-specific (Container)
  flexDirection?      : 'row' | 'column';
  justifyContent?     : 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?         : 'stretch' | 'flex-start' | 'center' | 'flex-end';
  gap?                : number;

  // Grid-specific — container dimensions
  gridRows?           : number;         // Explicit row count (min 1); default 2
  gridColumns?        : number;         // Explicit column count (min 1); default 2
  gridTemplateColumns?: string;         // Legacy free-form override

  // Grid-specific — child cell placement (set automatically on drop)
  gridColumn?         : number;         // 1-indexed CSS grid-column for this node
  gridRow?            : number;         // 1-indexed CSS grid-row for this node

  [key: string]: unknown;
}
```

---

### ComponentNode

```ts
interface ComponentNode {
  id      : string;                      // UUID
  type    : ComponentType;
  props   : ComponentProps;
  children: string[];                    // Ordered child node IDs
  parentId: string | null;              // null = root-level node
  position: { x: number; y: number };  // Canvas position (px)
}
```

---

## Undo / Redo

The undo system uses a **pre-action snapshot** model:

1. `historyMiddleware` intercepts every canvas-mutating action.
2. Before the action runs, it snapshots the current `canvas` state and pushes it to `history.past[]`.
3. Pressing `Ctrl+Z` (`useUndoRedo` hook) dispatches `undo(past[last])`.
4. The `rootReducer` intercepts the undo action, restores the canvas to that snapshot, and lets `historySlice` move the snapshot to `future[]`.
5. Pressing `Ctrl+Shift+Z` reverses the process.

Snapshots are limited to **50 entries** (oldest are dropped). Any new canvas action clears the redo stack.

---

## Selectors

`src/selectors/canvasSelectors.ts`

| Selector | Returns |
|---|---|
| `selectNodeById(id)` | Memoised `ComponentNode \| null` for a given ID |

`CanvasNode` also creates its own local `makeSelectNode(id)` via `createSelector` inside `useMemo` so each node component subscribes only to its own slice of the nodes map — preventing unnecessary re-renders when unrelated nodes change.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Z` | Undo last canvas change |
| `Ctrl+Shift+Z` | Redo last undone change |
| `Delete` / `Backspace` | Delete selected component |
| `Enter` / `Space` | Select focused component (keyboard navigation) |
| `Escape` | Deselect current component; also exits JSON preview fullscreen |
| `Ctrl+Y` | Redo on Windows-style shortcut |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Run development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build for production

```bash
npm run build
```

Output is in `dist/`.

### Preview production build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

### AI Assistant (CopilotKit)

CanvasIQ includes an embedded AI assistant tab powered by CopilotKit.

Configure runtime access in a local `.env` file:

```bash
VITE_COPILOT_RUNTIME_URL=http://localhost:4000/copilotkit
VITE_COPILOT_AGENT=canvasiq-assistant
# Optional: only needed when using Copilot Cloud features
VITE_COPILOT_PUBLIC_API_KEY=

# Backend runtime (required to avoid ERR_CONNECTION_REFUSED)
OPENAI_API_KEY=
COPILOT_BACKEND_PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
COPILOT_MODEL=gpt-4o-mini
```

Run backend runtime (terminal 1):

```bash
npm run backend
```

Run frontend (terminal 2):

```bash
npm run dev
```

If you see `ERR_CONNECTION_REFUSED`, verify that `http://localhost:4000/health` returns `{ "ok": true }` and that `VITE_COPILOT_RUNTIME_URL` points to `http://localhost:4000/copilotkit`.

Interview demo flow:

1. Open the **AI Assistant** tab in the left sidebar.
2. Ask for a placement idea (for example, “Place a CTA button below the selected card”).
3. The agent proposes a placement card in chat via a frontend tool call.
4. Click **Confirm placement** to apply or **Dismiss** to reject.
5. Use `Ctrl+Z` / `Ctrl+Shift+Z` to demonstrate undo/redo for AI-applied changes.

---

> CanvasIQ v1.0 · React 19 · TypeScript · Vite · Redux Toolkit · dnd-kit · MUI · Tailwind CSS

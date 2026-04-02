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
7. [Components](#components)
   - [App](#app)
   - [Canvas](#canvas)
   - [CanvasNode](#canvasnode)
   - [ComponentPalette](#componentpalette)
   - [Inspector](#inspector)
   - [ContentTab](#contenttab)
   - [StyleTab](#styletab)
   - [LayoutTab](#layouttab)
   - [LayerItem](#layeritem)
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
- Full undo/redo via `Ctrl+Z` / `Ctrl+Shift+Z`, with up to 50 snapshots.
- Live JSON schema preview with one-click copy.
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
│       └── dragSlice.ts       # (reserved, currently empty)
│
├── selectors/
│   └── canvasSelectors.ts     # selectNodeById, selectChildrenOf
│
├── hooks/
│   └── useUndoRedo.ts         # Keyboard listener for Ctrl+Z / Ctrl+Shift+Z
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
    ├── layers/
    │   └── LayerItem.tsx       # Recursive sortable layer tree item
    └── ui/
        └── ComponentPalette.tsx  # Left-panel draggable component library
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        App.tsx                           │
│  DndContext (sensors, modifiers, collision, handlers)    │
│                                                          │
│  ┌──────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ Palette  │  │     Canvas       │  │   Inspector   │  │
│  │ (left)   │  │  (centre-top)    │  │   (right)     │  │
│  └──────────┘  ├──────────────────┤  └───────────────┘  │
│                │   JSON Preview   │                      │
│                │  (centre-bottom) │                      │
│                └──────────────────┘                      │
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
| `addNode` | `{ id, type, parentId, position }` | Creates a new node; adds to parent's children or rootIds |
| `moveNode` | `{ id, newParentId, newIndex, position }` | Unlinks from old parent, relinks to new parent |
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

1. **Palette item → canvas/container** — dispatches `addNode` with `parentId` set to the container ID (or `null` for canvas root). Position is calculated relative to the drop target.
2. **Existing node → new location** — dispatches `moveNode`. Position is computed by subtracting the absolute position of the target parent from the absolute canvas position of the drop.

`getAbsoluteCanvasPosition(nodeId)` walks up the parent chain summing `position.x/y` to get the true canvas-relative position of any node.

---

## Components

### App

`src/App.tsx`

Root application shell. Houses the `DndContext` with all sensors, modifiers, and event handlers. Renders a three-column layout:

```
[ Component Library ] [ Canvas + JSON Preview ] [ Inspector ]
```

Contains `AppInner` (inside Redux `Provider`) and the `PaletteDragPreview` overlay shown during palette element drag.

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
- **Rendering** — dispatches a type-aware preview (`Button`, `Input`, `Image`, `Text`, `Card`, `Container`).
- **Styles** — reads all props directly from Redux node state: `color`, `fontSize`, `backgroundColor`, `border*`, `borderRadius`, `boxShadow`, `padding`, `width`, `height`, `display`, `flexDirection`, `justifyContent`, `alignItems`, `gap`, `gridTemplateColumns`.
- **Children** — recursively renders child nodes via `node.children.map(id => <CanvasNode id={id} />)`.
- **Selection** — blue 2px outline + shadow ring when selected.
- **Drop highlight** — dashed blue placeholder shown when dragging over a nestable container.
- **Memoised selector** — each node creates its own `createSelector` instance so only the affected node re-renders on update.

**Keyboard support** on each node:
- `Enter` / `Space` — select
- `Delete` / `Backspace` — delete
- `Escape` — deselect

---

### ComponentPalette

`src/components/ui/ComponentPalette.tsx`

Left panel list of all available component types. Each item is:

- **Draggable** with id `palette:<ComponentType>` — triggers an `addNode` dispatch on drop.
- **Clickable** — also adds the component directly to canvas root at a staggered position.

Available types: `Button`, `Text`, `Input`, `Card`, `Container`, `Image`.

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

**Container — Flex mode extras:**

| Field | Prop |
|---|---|
| Direction | `flexDirection` |
| Justify content | `justifyContent` |
| Align items | `alignItems` |
| Gap | `gap` |

**Container — Grid mode extras:**

| Field | Prop |
|---|---|
| Grid columns | `gridTemplateColumns` |
| Gap | `gap` |
| Align items | `alignItems` |
| Justify content | `justifyContent` |

---

### LayerItem

`src/components/layers/LayerItem.tsx`

Recursive tree item for a layer panel. Uses `useSortable` from @dnd-kit/sortable to support reordering. Shows component type, short ID, expand/collapse toggle for nodes with children, and indents visually per nesting depth.

---

### JsonPreview

`src/components/JsonPreview.tsx`

Bottom-centre panel. Displays the full canvas state as live-updating pretty-printed JSON. Features:

- Node count badge.
- One-click copy to clipboard with a 2-second check-mark confirmation.
- Dark code theme.

The exported schema shape:

```json
{
  "rootIds": ["uuid1", "uuid2"],
  "nodes": {
    "uuid1": { "id": "...", "type": "Button", "props": {}, "children": [], "parentId": null, "position": { "x": 32, "y": 32 } }
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

  // Container layout
  display?            : 'block' | 'flex' | 'grid';
  flexDirection?      : 'row' | 'column';
  justifyContent?     : 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?         : 'stretch' | 'flex-start' | 'center' | 'flex-end';
  gap?                : number;
  gridTemplateColumns?: string;

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
| `selectChildrenOf(parentId)` | Memoised array of child `ComponentNode` objects |

`CanvasNode` also creates its own local `makeSelectNode(id)` via `createSelector` inside `useMemo` so each node component subscribes only to its own slice of the nodes map — preventing unnecessary re-renders when unrelated nodes change.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Z` | Undo last canvas change |
| `Ctrl+Shift+Z` | Redo last undone change |
| `Delete` / `Backspace` | Delete selected component |
| `Enter` / `Space` | Select focused component (keyboard navigation) |
| `Escape` | Deselect current component |

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

---

> CanvasIQ v1.0 · React 19 · TypeScript · Vite · Redux Toolkit · dnd-kit · MUI · Tailwind CSS

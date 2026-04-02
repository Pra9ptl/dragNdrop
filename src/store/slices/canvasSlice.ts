import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ComponentNode, ComponentProps, ComponentType } from "../../types/schema";

// The full canvas state
interface CanvasState {
  nodes   : Record<string, ComponentNode>; // flat map: id → node
  rootIds : string[];                      // top-level component IDs
}
 
// ─── Initial state ───────────────────────────────────────
 
const initialState: CanvasState = {
  nodes  : {},
  rootIds: [],
};
 
// ─── Slice ───────────────────────────────────────────────
 
export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
 
    // Add a new component to the canvas.
    // If parentId is given, it becomes a child of that component.
    // Otherwise it goes to the root level.
    addNode(state, action: PayloadAction<{
      id      : string;
      type    : ComponentType;
      parentId: string | null;
      position: { x: number; y: number };
    }>) {
      const { id, type, parentId, position } = action.payload;
      state.nodes[id] = {
        id,
        type,
        props   : {},
        children: [],
        parentId,
        position,
      };
      if (parentId) {
        // Add this ID to the parent's children list
        state.nodes[parentId].children.push(id);
      } else {
        // No parent — add to top-level list
        state.rootIds.push(id);
      }
    },
 
    // This is called ONCE when the user drops a component.
    // It moves the node to its new position / parent.
    // During the drag itself, NOTHING in Redux changes.
    moveNode(state, action: PayloadAction<{
      id        : string;
      newParentId: string | null;
      newIndex  : number;
      position  : { x: number; y: number };
    }>) {
      const { id, newParentId, newIndex, position } = action.payload;
      const node = state.nodes[id];
      if (!node) return;
 
      // Step 1: Remove from old parent (or rootIds)
      if (node.parentId) {
        const old = state.nodes[node.parentId];
        old.children = old.children.filter(c => c !== id);
      } else {
        state.rootIds = state.rootIds.filter(c => c !== id);
      }
 
      // Step 2: Update the node's own data
      node.parentId = newParentId;
      node.position = position;
 
      // Step 3: Add to new parent (or rootIds)
      if (newParentId) {
        state.nodes[newParentId].children.splice(newIndex, 0, id);
      } else {
        state.rootIds.splice(newIndex, 0, id);
      }
    },
 
    // Update one or more props on a component.
    // Called every time the user types in the Property Inspector.
    updateProps(state, action: PayloadAction<{
      id   : string;
      props: Partial<ComponentProps>;
    }>) {
      const node = state.nodes[action.payload.id];
      if (!node) return;
      Object.assign(node.props, action.payload.props);
    },
 
    // Delete a component and ALL of its children recursively.
    deleteNode(state, action: PayloadAction<string>) {
      // Collect this node and every descendant ID
      function collectIds(id: string): string[] {
        const node = state.nodes[id];
        if (!node) return [];
        return [id, ...node.children.flatMap(collectIds)];
      }
      const toDelete = collectIds(action.payload);
 
      // Remove from parent or rootIds
      const node = state.nodes[action.payload];
      if (node?.parentId) {
        const parent = state.nodes[node.parentId];
        if (parent) parent.children = parent.children.filter(c => c !== action.payload);
      } else {
        state.rootIds = state.rootIds.filter(id => !toDelete.includes(id));
      }
 
      // Delete every collected node from the map
      toDelete.forEach(id => delete state.nodes[id]);
    },
  },
});
 
export const { addNode, moveNode, updateProps, deleteNode } = canvasSlice.actions;

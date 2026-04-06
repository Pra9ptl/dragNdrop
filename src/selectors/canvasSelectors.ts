// selectors/canvasSelectors.ts
import { createSelector } from 'reselect';
import type { RootState } from '../store';

// Base selector — no memoization needed
const selectNodes = (state: RootState) => state.canvas.nodes;

// Memoized: only re-runs when nodes[id] changes
// This means dragging node A won't re-render node B
export const selectNodeById = (id: string) =>
  createSelector(
    selectNodes,
    (nodes) => nodes[id] ?? null
  );

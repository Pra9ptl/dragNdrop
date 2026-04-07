/**
 * selectors/canvasSelectors.ts - Memoized selectors for canvas lookups
 *
 * The inspector frequently needs the currently selected node. Returning a new
 * selector per id keeps lookups cheap and avoids recomputing unrelated nodes.
 */
import { createSelector } from 'reselect';
import type { RootState } from '../store';

// Base selector for the flat node map.
const selectNodes = (state: RootState) => state.canvas.nodes;

// Factory selector: each caller gets a memoized selector bound to a specific id.
// That means reading node A does not cause recalculation for node B.
export const selectNodeById = (id: string) =>
  createSelector(
    selectNodes,
    (nodes) => nodes[id] ?? null
  );

/**
 * store/index.ts - Redux store assembly and undo/redo-aware root reducer
 *
 * This file wires together the three slices:
 * - canvas: actual component tree and layout state
 * - selection: currently selected node id for the inspector
 * - history: past/future snapshot stacks for undo and redo
 *
 * The important detail here is the custom rootReducer. Undo and redo are not
 * plain history-slice updates; they also need to replace the current canvas
 * branch with a previously captured snapshot before the regular reducers run.
 */
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { canvasSlice }    from './slices/canvasSlice';
import { selectionSlice } from './slices/selectionSlice';
import { historySlice, undo, redo } from './slices/historySlice';
import { historyMiddleware }         from './historyMiddleware';
 
// Base reducer handles normal slice behavior for all branches.
const baseReducer = combineReducers({
  canvas   : canvasSlice.reducer,
  selection: selectionSlice.reducer,
  history  : historySlice.reducer,
});
 
type AppState = ReturnType<typeof baseReducer>;
 
// Intercept undo/redo so the canvas is restored from the supplied snapshot,
// then allow historySlice to update past/future stacks in the same dispatch.
function rootReducer(state: AppState | undefined, action: any): AppState {
 
  if (action.type === undo.type && state) {
    const snapshot = action.payload;
    return baseReducer(
      {
        ...state,
        // Replace only the canvas branch. Selection/history continue through reducers.
        canvas: { nodes: snapshot.nodes, rootIds: snapshot.rootIds },
      },
      action,  // still let historySlice.undo() run to update past/future
    );
  }
 
  if (action.type === redo.type && state) {
    const snapshot = action.payload;
    return baseReducer(
      {
        ...state,
        canvas: { nodes: snapshot.nodes, rootIds: snapshot.rootIds },
      },
      action,
    );
  }
 
  // All non-history actions take the standard slice reducer path.
  return baseReducer(state, action);
}
 
export const store = configureStore({
  reducer   : rootReducer,
  // historyMiddleware snapshots canvas state before mutating actions run.
  middleware : (getDefault) =>
    getDefault().concat(historyMiddleware),
});
 
// Export these — used throughout the app for typing
export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { canvasSlice }    from './slices/canvasSlice';
import { selectionSlice } from './slices/selectionSlice';
import { historySlice, undo, redo } from './slices/historySlice';
import { historyMiddleware }         from './historyMiddleware';
 
// Combine all normal slice reducers
const baseReducer = combineReducers({
  canvas   : canvasSlice.reducer,
  selection: selectionSlice.reducer,
  history  : historySlice.reducer,
});
 
type AppState = ReturnType<typeof baseReducer>;
 
// This wrapper intercepts undo and redo BEFORE the base reducers run.
// When undo fires: replace the canvas with the saved snapshot,
// then let historySlice update its own past[] and future[] lists.
function rootReducer(state: AppState | undefined, action: any): AppState {
 
  if (action.type === undo.type && state) {
    const snapshot = action.payload;
    return baseReducer(
      {
        ...state,
        // Restore canvas to the saved snapshot
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
 
  // Everything else runs through the normal reducers
  return baseReducer(state, action);
}
 
export const store = configureStore({
  reducer   : rootReducer,
  middleware : (getDefault) =>
    getDefault().concat(historyMiddleware),
});
 
// Export these — used throughout the app for typing
export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

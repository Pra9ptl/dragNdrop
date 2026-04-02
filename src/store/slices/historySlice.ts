import { createSlice, type PayloadAction} from '@reduxjs/toolkit';
 
// A snapshot is just the canvas nodes and root IDs at a point in time
interface CanvasSnapshot {
  nodes  : Record<string, any>;
  rootIds: string[];
}
 
interface HistoryState {
  past  : CanvasSnapshot[]; // states you can go BACK to  (Ctrl+Z)
  future: CanvasSnapshot[]; // states you can go FORWARD to (Ctrl+Shift+Z)
}
 
const initialState: HistoryState = { past: [], future: [] };
 
export const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
 
    // Save current canvas state BEFORE a change happens.
    // Clears future[] — once you make a new action,
    // the old redo history is gone.
    pushHistory(state, action: PayloadAction<CanvasSnapshot>) {
      state.past.push(action.payload);
      state.future = [];
      // Limit to 50 snapshots so we don't use too much memory
      if (state.past.length > 50) state.past.shift();
    },
 
    // Called when user presses Ctrl+Z.
    // The actual canvas restoration happens in store/index.ts.
    // This just moves the snapshot between past[] and future[].
    undo(state, action: PayloadAction<CanvasSnapshot>) {
      state.future.push(action.payload); // save current for redo
      state.past.pop();                  // remove the last saved state
    },
 
    // Called when user presses Ctrl+Shift+Z.
    redo(state, action: PayloadAction<CanvasSnapshot>) {
      state.past.push(action.payload);   // save current for undo
      state.future.pop();                // remove the last redo state
    },
  },
});
 
export const { pushHistory, undo, redo } = historySlice.actions;

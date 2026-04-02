import type { Middleware } from '@reduxjs/toolkit';
import { pushHistory }  from './slices/historySlice';
 
// These are the only actions that change the canvas layout.
// We snapshot BEFORE each of these runs.
const CANVAS_MUTATIONS = [
  'canvas/addNode',
  'canvas/moveNode',
  'canvas/updateProps',
  'canvas/deleteNode',
];
 
export const historyMiddleware: Middleware =
  (store) => (next) => (action: any) => {
 
    // If this is a canvas mutation, save the state BEFORE it runs
    if (CANVAS_MUTATIONS.includes(action.type)) {
      const canvas = store.getState().canvas;
      store.dispatch(pushHistory({
        nodes  : canvas.nodes,
        rootIds: canvas.rootIds,
      }));
    }
 
    // Always let the original action through
    return next(action);
  };

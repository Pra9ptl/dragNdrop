import { useEffect }         from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { undo, redo }        from '../store/slices/historySlice';
import type { RootState }    from '../store';
 
export function useUndoRedo() {
  const dispatch = useDispatch();
  const past     = useSelector((s: RootState) => s.history.past);
  const future   = useSelector((s: RootState) => s.history.future);
 
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey; // Ctrl on Windows, Cmd on Mac
 
      // Ctrl+Z = undo (only if there is something in past[])
      if (ctrl && !e.shiftKey && e.key === 'z' && past.length > 0) {
        e.preventDefault();
        // Pass the snapshot we want to restore as the payload
        dispatch(undo(past[past.length - 1]));
      }
 
      // Ctrl+Shift+Z or Ctrl+Y = redo
      const isRedo =
        (ctrl && e.shiftKey && e.key === 'z') ||
        (ctrl && e.key === 'y');
      if (isRedo && future.length > 0) {
        e.preventDefault();
        dispatch(redo(future[future.length - 1]));
      }
    }
 
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch, past, future]); // re-register when history changes
}

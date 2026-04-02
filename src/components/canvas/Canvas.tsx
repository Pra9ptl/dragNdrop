import { useDroppable } from '@dnd-kit/core';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { CanvasNode } from './CanvasNode';

const CANVAS_DROP_ID = 'canvas-root';

interface CanvasProps {
  setCanvasElement?: (node: HTMLDivElement | null) => void;
}

export function Canvas({ setCanvasElement }: CanvasProps) {
  const rootIds = useSelector((s: RootState) => s.canvas.rootIds);
  const { setNodeRef } = useDroppable({ id: CANVAS_DROP_ID });

  function setCanvasNode(node: HTMLDivElement | null) {
    setNodeRef(node);
    setCanvasElement?.(node);
  }

  return (
    <div className='relative w-full h-full bg-gray-50 overflow-auto'
         ref={setCanvasNode}
         role='region' aria-label='Design canvas'>
      {rootIds.map(id => <CanvasNode key={id} id={id} />)}
    </div>
  );
}

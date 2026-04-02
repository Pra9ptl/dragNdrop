import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSelector, useDispatch } from 'react-redux';
import { selectNodeById } from '../../selectors/canvasSelectors';
import { selectNode } from '../../store/slices/selectionSlice';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useState } from 'react';
import type { RootState } from '../../store';

interface LayerItemProps { id: string; depth: number; }

export function LayerItem({ id, depth }: LayerItemProps) {
  const dispatch = useDispatch();
  const node = useSelector(selectNodeById(id));
  const selectedId = useSelector((s: RootState) => s.selection.selectedId);
  const [expanded, setExpanded] = useState(true);

  const { attributes, listeners, setNodeRef,
          transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    paddingLeft: depth * 16,   // visual indent per nesting level
  };

  if (!node) return null;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => dispatch(selectNode(id))}
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded
          ${selectedId === id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
        role='treeitem'
        aria-selected={selectedId === id}
      >
        {node.children.length > 0 && (
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
            {expanded ? <ChevronLeft fontSize='small' /> : <ChevronRight fontSize='small' />}
          </button>
        )}
        <span className='text-sm'>{node.type}</span>
        <span className='text-xs text-gray-400 ml-auto'>{id.slice(0, 6)}</span>
      </div>
      {expanded && node.children.map(childId => (
        <LayerItem key={childId} id={childId} depth={depth + 1} />
      ))}
    </>
  );
}

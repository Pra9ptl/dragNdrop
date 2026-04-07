import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useDispatch, useSelector } from 'react-redux';
import { addNode } from '../../store/slices/canvasSlice';
import type { RootState } from '../../store';
import { COMPONENT_TYPES, type ComponentType } from '../../types/schema';

function PaletteItem({ type, index }: { type: ComponentType; index: number }) {
  const dispatch = useDispatch();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette:${type}`,
  });

  return (
    <button
      ref={setNodeRef}
      type='button'
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.55 : 1,
        width: '100%',
        border: '1px solid #dbe4f0',
        background: isDragging ? '#e0f2fe' : '#f8fafc',
        borderRadius: 10,
        padding: '12px 14px',
        textAlign: 'left',
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: isDragging ? '0 10px 24px rgba(14, 116, 144, 0.18)' : 'none',
      }}
      onClick={() => dispatch(addNode({
        id: crypto.randomUUID(),
        type,
        parentId: null,
        position: { x: 32 + index * 18, y: 32 + index * 18 },
      }))}
      {...attributes}
      {...listeners}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{type}</div>
    </button>
  );
}

export function ComponentPalette() {
  const count = useSelector((state: RootState) => state.canvas.rootIds.length);

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
        Drag or click components into the canvas to create them. Current root components: {count}.
      </div>
      {COMPONENT_TYPES.map((type, index) => (
        <PaletteItem key={type} type={type} index={index} />
      ))}
    </div>
  );
}
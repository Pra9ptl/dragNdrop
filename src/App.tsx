import { Provider }           from 'react-redux';
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useDispatch, useSelector } from 'react-redux';
import { store }              from './store';
import { Canvas }             from './components/canvas/Canvas';
import { Inspector }          from './components/inspector/Inspector';
import { JsonPreview }        from './components/JsonPreview';
import { ComponentPalette }   from './components/ui/ComponentPalette';
import { AiAssistantDrawer }  from './components/ui/AiAssistantDrawer';
import { nestingCollisionDetection } from './dnd/collision';
import { snapToGrid }         from './dnd/modifires';
import { useCanvasSensors }   from './dnd/sensor';
import { useUndoRedo }        from './hooks/useUndoRedo';
import { addNode, moveNode, updateProps } from './store/slices/canvasSlice';
import type { RootState }     from './store';
import type { ComponentType } from './types/schema';
import { useRef, useState }   from 'react';

const CANVAS_DROP_ID = 'canvas-root';
const PALETTE_PREFIX = 'palette:';

function asPositiveInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : null;
}
 
// AppInner is inside the Provider so it can use Redux hooks
function AppInner() {
  useUndoRedo(); // activates Ctrl+Z / Ctrl+Shift+Z globally
  const dispatch = useDispatch();
  const sensors = useCanvasSensors();
  const rootIds = useSelector((state: RootState) => state.canvas.rootIds);
  const nodes = useSelector((state: RootState) => state.canvas.nodes);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [activePaletteType, setActivePaletteType] = useState<ComponentType | null>(null);
  const [schemaOpen, setSchemaOpen] = useState(true);
  const [leftTab, setLeftTab] = useState<'library' | 'assistant'>('library');

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);

    if (activeId.startsWith(PALETTE_PREFIX)) {
      setActivePaletteType(activeId.slice(PALETTE_PREFIX.length) as ComponentType);
    }
  }

  function getDropPosition(event: DragEndEvent) {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const translatedRect = event.active.rect.current.translated ?? event.active.rect.current.initial;

    if (!canvasRect || !translatedRect) {
      return { x: 24 + rootIds.length * 20, y: 24 + rootIds.length * 20 };
    }

    return {
      x: Math.max(0, translatedRect.left - canvasRect.left),
      y: Math.max(0, translatedRect.top - canvasRect.top),
    };
  }

  function getAbsoluteCanvasPosition(nodeId: string): { x: number; y: number } {
    const node = nodes[nodeId];
    if (!node) return { x: 0, y: 0 };

    let x = node.position.x;
    let y = node.position.y;
    let cursor = node.parentId;

    while (cursor) {
      const parent = nodes[cursor];
      if (!parent) break;
      x += parent.position.x;
      y += parent.position.y;
      cursor = parent.parentId;
    }

    return { x, y };
  }

  function getDropPositionForTarget(event: DragEndEvent, targetId: string | null) {
    if (!targetId || targetId === CANVAS_DROP_ID) {
      return getDropPosition(event);
    }

    const canvasPosition = getDropPosition(event);
    const parentPosition = getAbsoluteCanvasPosition(targetId);

    return {
      x: Math.max(0, canvasPosition.x - parentPosition.x),
      y: Math.max(0, canvasPosition.y - parentPosition.y),
    };
  }

  function resolveDropTarget(event: DragEndEvent, overId: string) {
    const parentId = overId === CANVAS_DROP_ID ? null : overId;
    const position = getDropPositionForTarget(event, overId);

    if (!parentId) {
      return { parentId, newIndex: rootIds.length, position, gridCell: null };
    }

    const parentNode = nodes[parentId];
    const isGridParent =
      (parentNode?.type === 'Container' || parentNode?.type === 'Card')
      && parentNode?.props.display === 'grid';

    if (!parentNode) {
      return { parentId, newIndex: 0, position, gridCell: null };
    }

    if (!isGridParent) {
      return { parentId, newIndex: parentNode.children.length ?? 0, position, gridCell: null };
    }

    // For grid containers, children are positioned by the grid layout, not absolutely
    const gridPosition = { x: 0, y: 0 };

    const translatedRect = event.active.rect.current.translated ?? event.active.rect.current.initial;
    const overRect = event.over?.rect;
    if (!translatedRect || !overRect) {
      return { parentId, newIndex: parentNode.children.length, position: gridPosition, gridCell: null };
    }

    const columns = asPositiveInt(parentNode.props.gridColumns) ?? 2;
    const rowsFromProps = asPositiveInt(parentNode.props.gridRows);
    const childCount = parentNode.children.length;
    const rows = rowsFromProps ?? Math.max(1, Math.ceil((childCount + 1) / columns));
    const cellWidth = overRect.width / columns;
    const cellHeight = overRect.height / rows;
    if (cellWidth <= 0 || cellHeight <= 0) {
    return { parentId, newIndex: parentNode.children.length, position: gridPosition, gridCell: null };
    }

    const centerX = translatedRect.left + translatedRect.width / 2;
    const centerY = translatedRect.top + translatedRect.height / 2;
    const col = Math.min(columns - 1, Math.max(0, Math.floor((centerX - overRect.left) / cellWidth)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor((centerY - overRect.top) / cellHeight)));
    const targetIndex = row * columns + col;
    const newIndex = Math.min(childCount, Math.max(0, targetIndex));

    return { parentId, newIndex, position: gridPosition, gridCell: { col: col + 1, row: row + 1 } };
  }

  function resetActiveDrag() {
    setActivePaletteType(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeId = String(active.id);

    if (activeId.startsWith(PALETTE_PREFIX)) {
      if (over) {
        const overId = String(over.id);
        const target = resolveDropTarget(event, overId);
        const newId = crypto.randomUUID();
        dispatch(addNode({
          id: newId,
          type: activeId.slice(PALETTE_PREFIX.length) as ComponentType,
          parentId: target.parentId,
          newIndex: target.newIndex,
          position: target.position,
        }));
        if (target.gridCell) {
          dispatch(updateProps({ id: newId, props: { gridColumn: target.gridCell.col, gridRow: target.gridCell.row } }));
        }
      }

      resetActiveDrag();
      return;
    }

    if (over && active.id !== over.id) {
      const target = resolveDropTarget(event, String(over.id));
      dispatch(moveNode({
        id: activeId,
        newParentId: target.parentId,
        newIndex: target.newIndex,
        position: target.position,
      }));
      if (target.gridCell) {
        dispatch(updateProps({ id: activeId, props: { gridColumn: target.gridCell.col, gridRow: target.gridCell.row } }));
      } else {
        dispatch(updateProps({ id: activeId, props: { gridColumn: undefined, gridRow: undefined } }));
      }
    }

    resetActiveDrag();
  }
 
  return (
    <DndContext
      sensors={sensors}
      modifiers={[snapToGrid]}
      collisionDetection={nestingCollisionDetection}
      onDragStart={handleDragStart}
      onDragCancel={resetActiveDrag}
      onDragEnd={handleDragEnd}
    >
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#f3f4f6',
      }}>
 
        {/* ── TOP BAR ─────────────────────────────────── */}
        <header style={{
          display       : 'flex',
          alignItems    : 'center',
          justifyContent: 'space-between',
          padding       : '0 16px',
          height        : 44,
          background    : '#1A3C5E',
          color         : '#fff',
          flexShrink    : 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.5 }}>
              CanvasIQ
            </span>
            <span style={{ fontSize: 11, color: '#93C5FD', fontFamily: 'monospace' }}>
              v1.0
            </span>
          </div>
          <span style={{ fontSize: 12, color: '#93C5FD' }}>
            Ctrl+Z undo  ·  Ctrl+Shift+Z redo  ·  Delete removes selected
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type='button'
              onClick={() => setSchemaOpen((prev) => !prev)}
              style={{
                border: '1px solid rgba(147, 197, 253, 0.5)',
                background: schemaOpen ? '#0ea5e9' : 'rgba(14, 165, 233, 0.16)',
                color: '#ffffff',
                borderRadius: 8,
                height: 30,
                padding: '0 10px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {schemaOpen ? 'Hide Live Schema' : 'Show Live Schema'}
            </button>
          </div>
        </header>
 
        {/* ── THREE-COLUMN MAIN AREA ──────────────────── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
 
          {/* LEFT: Component library */}
          <aside style={{
            width      : 320,
            background : '#ffffff',
            borderRight: '1px solid #e5e7eb',
            display    : 'flex',
            flexDirection: 'column',
            flexShrink : 0,
            overflow   : 'hidden',
          }}>
            <div style={{ padding: 8, borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
              <button
                type='button'
                onClick={() => setLeftTab('library')}
                style={{
                  flex: 1,
                  border: '1px solid #cbd5e1',
                  background: leftTab === 'library' ? '#dbeafe' : '#ffffff',
                  color: leftTab === 'library' ? '#1d4ed8' : '#334155',
                  borderRadius: 8,
                  height: 32,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Components
              </button>
              <button
                type='button'
                onClick={() => setLeftTab('assistant')}
                style={{
                  flex: 1,
                  border: '1px solid #cbd5e1',
                  background: leftTab === 'assistant' ? '#dbeafe' : '#ffffff',
                  color: leftTab === 'assistant' ? '#1d4ed8' : '#334155',
                  borderRadius: 8,
                  height: 32,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                AI Assistant
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', padding: 8 }}>
              {leftTab === 'library' ? (
                <div style={{ height: '100%', overflowY: 'auto' }}>
                  <ComponentPalette />
                </div>
              ) : (
                <AiAssistantDrawer open={true} embedded onClose={() => setLeftTab('library')} />
              )}
            </div>
          </aside>
 
          {/* CENTRE: Canvas on top, JSON Preview on bottom */}
          <main style={{ display: 'flex', flexDirection: 'column',
                         flex: 1, overflow: 'hidden' }}>
 
            {/* Canvas — 65% of the centre column height */}
            <div style={{
              flex: schemaOpen ? '0 0 65%' : 1,
              position: 'relative',
              overflow: 'hidden',
              borderBottom: schemaOpen ? '1px solid #e5e7eb' : 'none',
            }}>
              <Canvas setCanvasElement={(node) => {
                canvasRef.current = node;
              }} />
            </div>
 
            {/* JSON Preview — remaining 35% */}
            {schemaOpen ? (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <JsonPreview />
              </div>
            ) : null}
          </main>
 
          {/* RIGHT: Property Inspector */}
          <aside style={{
            width      : 256,
            background : '#ffffff',
            borderLeft : '1px solid #e5e7eb',
            flexShrink : 0,
            overflow   : 'hidden',
          }}>
            <Inspector />
          </aside>
        </div>
 
      </div>
      <DragOverlay>
        {activePaletteType ? <PaletteDragPreview type={activePaletteType} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function PaletteDragPreview({ type }: { type: ComponentType }) {
  return (
    <div
      style={{
        minWidth: 120,
        minHeight: 44,
        padding: '10px 14px',
        borderRadius: 8,
        background: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid #93c5fd',
        boxShadow: '0 14px 28px rgba(14, 116, 144, 0.16)',
        color: '#0f172a',
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b' }}>
        {type}
      </div>
      <div style={{ fontSize: 13, marginTop: 4, color: '#0f172a' }}>
        Drop to create component
      </div>
    </div>
  );
}
 
// Wrap in Redux Provider — this makes the store available to all components
export default function App() {
  return (
    <Provider store={store}>
      <AppInner />
    </Provider>
  );
}

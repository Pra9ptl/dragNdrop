import type { CSSProperties, KeyboardEvent, ReactElement } from 'react';
import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { createSelector } from 'reselect';
import { deleteNode } from '../../store/slices/canvasSlice';
import { selectNode } from '../../store/slices/selectionSlice';
import type { RootState } from '../../store';
import type { ComponentType } from '../../types/schema';
 
// ─── Memoized selector ───────────────────────────────────
// This is the performance trick: only this specific node re-renders
// when its own data changes. Other nodes are not affected.
const makeSelectNode = (id: string) =>
  createSelector(
    (s: RootState) => s.canvas.nodes,
    (nodes) => nodes[id] ?? null
  );
 
// ─── Component ───────────────────────────────────────────
interface Props { id: string }

function defaultLabel(type: ComponentType): string {
  switch (type) {
    case 'Button':
      return 'Button';
    case 'Text':
      return 'Text block';
    case 'Input':
      return 'Input placeholder';
    case 'Card':
      return 'Card';
    case 'Container':
      return '';
    case 'Image':
      return 'Image';
    default:
      return type;
  }
}

function toCssGap(value: unknown): string | undefined {
  if (typeof value === 'number') return `${value}px`;
  if (typeof value === 'string' && value.trim()) return value;
  return undefined;
}

function getButtonVariantStyles(variant: string | undefined): CSSProperties {
  if (variant === 'outlined') {
    return {
      background: '#ffffff',
      border: '1px solid #2E75B6',
      color: '#2E75B6',
    };
  }

  if (variant === 'text') {
    return {
      background: 'transparent',
      border: '1px solid transparent',
      color: '#2E75B6',
      boxShadow: 'none',
    };
  }

  return {
    background: '#2E75B6',
    border: '1px solid #2E75B6',
    color: '#ffffff',
  };
}

function normalizeSizeValue(value: unknown): string | number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  return trimmed;
}

function renderNodePreview(type: ComponentType, label: string, variant: string | undefined): ReactElement {
  if (type === 'Button') {
    const buttonStyles = getButtonVariantStyles(variant);
    return (
      <button
        type='button'
        style={{
          ...buttonStyles,
          borderRadius: 6,
          fontSize: 'inherit',
          padding: '8px 12px',
          pointerEvents: 'none',
          width: '100%',
          fontFamily: 'inherit',
        }}
      >
        {label}
      </button>
    );
  }

  if (type === 'Input') {
    return (
      <input
        value=''
        placeholder={label}
        readOnly
        style={{
          width: '100%',
          border: '1px solid #CBD5E1',
          borderRadius: 6,
          padding: '8px 10px',
          color: 'inherit',
          fontSize: 'inherit',
          background: '#fff',
          pointerEvents: 'none',
          fontFamily: 'inherit',
        }}
      />
    );
  }

  if (type === 'Image') {
    return (
      <div
        style={{
          width: '100%',
          minHeight: 90,
          border: '1px dashed #94A3B8',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'inherit',
          fontSize: 'inherit',
          background: '#F8FAFC',
        }}
      >
        {label}
      </div>
    );
  }

  if (type === 'Container') {
    return <div />;
  }

  return <span>{label}</span>;
}
 
export function CanvasNode({ id }: Props) {
  const dispatch = useDispatch();
 
  // Each CanvasNode creates its own memoized selector
  // so it only re-renders when ITS node changes in Redux
  const selectNode_ = useMemo(() => makeSelectNode(id), [id]);
  const node = useSelector(selectNode_);
  const parentNode = useSelector((s: RootState) => {
    if (!node?.parentId) return null;
    return s.canvas.nodes[node.parentId] ?? null;
  });
  const selectedId = useSelector((s: RootState) => s.selection.selectedId);
  const isSelected = selectedId === id;
 
  // Connect to dnd-kit — this makes the element draggable
  const {
    attributes,   // accessibility attributes (aria-*)
    listeners,    // pointer/keyboard event handlers
    setNodeRef,   // attach to the DOM element
    transform,    // live x/y offset during drag
    isDragging,   // true while being dragged
  } = useDraggable({ id });

  const isNestTarget = node?.type === 'Container' || node?.type === 'Card';
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id,
    disabled: !isNestTarget,
  });
 
  if (!node) return null;

  const label = String(node.props.label ?? defaultLabel(node.type));
  const textColor = typeof node.props.color === 'string' && node.props.color
    ? node.props.color
    : '#333333';
  const fontSize = typeof node.props.fontSize === 'number' ? node.props.fontSize : 14;
  const padding = typeof node.props.padding === 'number' ? node.props.padding : 12;
  const backgroundColor = typeof node.props.backgroundColor === 'string' && node.props.backgroundColor
    ? node.props.backgroundColor
    : '#ffffff';
  const borderWidth = typeof node.props.borderWidth === 'number' ? node.props.borderWidth : 1;
  const borderStyle = node.props.borderStyle === 'none' || node.props.borderStyle === 'dashed' || node.props.borderStyle === 'dotted'
    ? node.props.borderStyle
    : 'solid';
  const borderColor = typeof node.props.borderColor === 'string' && node.props.borderColor
    ? node.props.borderColor
    : '#d1d5db';
  const borderRadius = typeof node.props.borderRadius === 'number' ? node.props.borderRadius : 6;
  const customBoxShadow = typeof node.props.boxShadow === 'string' && node.props.boxShadow.trim()
    ? node.props.boxShadow
    : undefined;
  const width = normalizeSizeValue(node.props.width);
  const height = normalizeSizeValue(node.props.height);
  const display = node.type === 'Container'
    ? (node.props.display === 'flex' || node.props.display === 'grid' ? node.props.display : 'block')
    : undefined;
  const gap = node.type === 'Container' ? toCssGap(node.props.gap) : undefined;
  const flexDirection = node.type === 'Container' && node.props.flexDirection === 'column' ? 'column' : 'row';
  const justifyContent = node.type === 'Container' && typeof node.props.justifyContent === 'string'
    ? node.props.justifyContent
    : undefined;
  const alignItems = node.type === 'Container' && typeof node.props.alignItems === 'string'
    ? node.props.alignItems
    : undefined;
  const gridTemplateColumns = node.type === 'Container' && typeof node.props.gridTemplateColumns === 'string'
    ? node.props.gridTemplateColumns
    : undefined;
  const isInContainerFlow = parentNode?.type === 'Container';
 
  // ─── Keyboard handler (A11y) ─────────────────────────
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dispatch(selectNode(id));          // select on Enter/Space
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      dispatch(deleteNode(id));          // delete on Delete/Backspace
    }
    if (e.key === 'Escape') {
      dispatch(selectNode(null));        // deselect on Escape
    }
  }
 
  // ─── Styles ──────────────────────────────────────────
  const style: CSSProperties = {
    transform    : CSS.Translate.toString(transform), // moves element during drag
    opacity      : isDragging ? 0.45 : 1,
    position     : isInContainerFlow ? 'relative' : 'absolute',
    left         : isInContainerFlow ? undefined : node.position.x,
    top          : isInContainerFlow ? undefined : node.position.y,
    minWidth     : 90,
    minHeight    : 38,
    width,
    height,
    padding,
    background   : backgroundColor,
    border       : borderStyle === 'none' ? 'none' : `${Math.max(0, borderWidth)}px ${borderStyle} ${borderColor}`,
    borderRadius,
    cursor       : isDragging ? 'grabbing' : 'grab',
    userSelect   : 'none',
    color        : textColor,
    fontSize,
    display,
    flexDirection,
    justifyContent,
    alignItems,
    gridTemplateColumns,
    gap,
    // Blue outline when selected, dashed grey otherwise
    outline      : isSelected ? '2px solid #2E75B6' : '1px dashed #CCCCCC',
    outlineOffset: 3,
    boxShadow    : isSelected
      ? `0 0 0 4px rgba(46,117,182,0.15)${customBoxShadow ? `, ${customBoxShadow}` : ''}`
      : (customBoxShadow ?? '0 1px 3px rgba(0,0,0,0.08)'),
    transition   : 'box-shadow 0.15s, outline 0.15s',
    overflow     : isNestTarget ? 'visible' : undefined,
  };

  function setCombinedNodeRef(element: HTMLDivElement | null) {
    setNodeRef(element);
    setDroppableRef(element);
  }
 
  return (
    <div
      ref={setCombinedNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      // ── Accessibility attributes ──────────────────────
      role='button'
      tabIndex={0}
      aria-label={`${node.type} component. ${isSelected ? 'Selected.' : 'Press Enter to select.'} Press Delete to remove.`}
      aria-selected={isSelected}
      aria-grabbed={isDragging}
      // ── Event handlers ────────────────────────────────
      onKeyDown={handleKeyDown}
      onClick={() => dispatch(selectNode(id))}
    >
      <div>
        {renderNodePreview(node.type, label, typeof node.props.variant === 'string' ? node.props.variant : undefined)}
      </div>
      {isNestTarget && isOver && (
        <div
          style={{
            marginTop: 8,
            border: '1px dashed #2E75B6',
            borderRadius: 6,
            minHeight: 24,
            background: 'rgba(46,117,182,0.08)',
            pointerEvents: 'none',
          }}
        />
      )}
      {node.children.map((childId) => (
        <CanvasNode key={childId} id={childId} />
      ))}
    </div>
  );
}

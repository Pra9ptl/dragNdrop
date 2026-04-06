import type { CSSProperties, KeyboardEvent, MouseEvent, ReactElement } from 'react';
import { useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDndContext, useDraggable, useDroppable } from '@dnd-kit/core';
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

function positiveInt(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : undefined;
}

function renderNodePreview(
  type: ComponentType,
  label: string,
  variant: string | undefined,
  imageSrc: string | undefined,
  imageAlt: string | undefined
): ReactElement {
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
    const hasSrc = typeof imageSrc === 'string' && imageSrc.trim().length > 0;

    if (hasSrc) {
      return (
        <img
          src={imageSrc}
          alt={imageAlt ?? label}
          style={{
            width: '100%',
            height: '100%',
            minHeight: 90,
            objectFit: 'cover',
            borderRadius: 6,
            pointerEvents: 'none',
            display: 'block',
          }}
        />
      );
    }

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
          pointerEvents: 'none',
        }}
      >
        {label}
      </div>
    );
  }

  if (type === 'Card') {
    return (
      <div
        style={{
          width: '100%',
          fontWeight: 600,
          color: 'inherit',
          pointerEvents: 'none',
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
  const nodeElementRef = useRef<HTMLDivElement | null>(null);
  const { active } = useDndContext();
 
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

  const isContainerLike = node?.type === 'Container' || node?.type === 'Card';
  const isNestTarget = isContainerLike;
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
  const display = isContainerLike
    ? (node.props.display === 'flex' || node.props.display === 'grid' ? node.props.display : 'block')
    : undefined;
  const gap = isContainerLike ? toCssGap(node.props.gap) : undefined;
  const flexDirection = isContainerLike && node.props.flexDirection === 'column' ? 'column' : 'row';
  const justifyContent = isContainerLike && typeof node.props.justifyContent === 'string'
    ? node.props.justifyContent
    : undefined;
  const alignItems = isContainerLike && typeof node.props.alignItems === 'string'
    ? node.props.alignItems
    : undefined;
  const gridRows = isContainerLike ? positiveInt(node.props.gridRows) : undefined;
  const gridColumns = isContainerLike ? positiveInt(node.props.gridColumns) : undefined;
  const isGridContainer = isContainerLike && display === 'grid';
  const activeRect = active?.rect.current.translated ?? active?.rect.current.initial;
  const resolvedGridColumns = gridColumns ?? 2;
  const resolvedGridRows = gridRows ?? Math.max(1, Math.ceil((node.children.length + 1) / resolvedGridColumns));
  const gridTemplateColumns = isContainerLike
    ? (isGridContainer
      ? `repeat(${resolvedGridColumns}, minmax(0, 1fr))`
      : (typeof node.props.gridTemplateColumns === 'string' ? node.props.gridTemplateColumns : undefined))
    : undefined;
  const gridTemplateRows = isContainerLike && isGridContainer
    ? `repeat(${resolvedGridRows}, minmax(0, 1fr))`
    : undefined;
  const totalCells = Math.max(1, resolvedGridRows * resolvedGridColumns);
  let hoverCellIndex: number | null = null;

  if (isGridContainer && isOver && activeRect && nodeElementRef.current) {
    const rect = nodeElementRef.current.getBoundingClientRect();
    const cellWidth = rect.width / resolvedGridColumns;
    const cellHeight = rect.height / resolvedGridRows;

    if (cellWidth > 0 && cellHeight > 0) {
      const centerX = activeRect.left + activeRect.width / 2;
      const centerY = activeRect.top + activeRect.height / 2;
      const col = Math.min(
        resolvedGridColumns - 1,
        Math.max(0, Math.floor((centerX - rect.left) / cellWidth))
      );
      const row = Math.min(
        resolvedGridRows - 1,
        Math.max(0, Math.floor((centerY - rect.top) / cellHeight))
      );
      hoverCellIndex = Math.min(totalCells - 1, Math.max(0, row * resolvedGridColumns + col));
    }
  }
  const isInContainerFlow = parentNode?.type === 'Container' || parentNode?.type === 'Card';
  const isInGridContainer = (parentNode?.type === 'Container' || parentNode?.type === 'Card')
    && parentNode?.props.display === 'grid';
  const childGridColumn = isInGridContainer && typeof node.props.gridColumn === 'number' ? node.props.gridColumn : undefined;
  const childGridRow    = isInGridContainer && typeof node.props.gridRow    === 'number' ? node.props.gridRow    : undefined;
 
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

  // ─── Click handler ───────────────────────────────────
  function handleClick(e: MouseEvent<HTMLDivElement>) {
    // Stop bubbling so parent CanvasNode handlers cannot override child selection.
    e.stopPropagation();
    dispatch(selectNode(id));
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
    gridTemplateRows,
    gap,
    gridColumn : childGridColumn,
    gridRow    : childGridRow,
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
    nodeElementRef.current = element;
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
      onClick={handleClick}
    >
      <div>
        {renderNodePreview(
          node.type,
          label,
          typeof node.props.variant === 'string' ? node.props.variant : undefined,
          typeof node.props.imageSrc === 'string' ? node.props.imageSrc : undefined,
          typeof node.props.imageAlt === 'string' ? node.props.imageAlt : undefined
        )}
      </div>
      {isGridContainer && isOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            gridTemplateColumns: `repeat(${resolvedGridColumns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${resolvedGridRows}, minmax(0, 1fr))`,
            pointerEvents: 'none',
            zIndex: 2,
            borderRadius,
            overflow: 'hidden',
          }}
        >
          {Array.from({ length: totalCells }).map((_, index) => (
            <div
              key={index}
              style={{
                border: '1px dashed rgba(46,117,182,0.55)',
                background: index === hoverCellIndex
                  ? 'rgba(46,117,182,0.24)'
                  : 'rgba(46,117,182,0.06)',
                transition: 'background 0.1s ease',
              }}
            />
          ))}
        </div>
      )}
      {isNestTarget && isOver && !isGridContainer && (
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

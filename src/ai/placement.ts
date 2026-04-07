import { addNode, moveNode, updateProps } from '../store/slices/canvasSlice';
import type { AppDispatch } from '../store';
import type { ComponentType } from '../types/schema';

export type PlacementMode = 'create' | 'move';

export interface PlacementSuggestion {
  mode: PlacementMode;
  componentType?: ComponentType;
  existingNodeId?: string;
  targetParentId: string | null;
  newIndex?: number;
  position?: { x: number; y: number };
  gridCell?: { col: number; row: number } | null;
  rationale?: string;
}

export interface ApplyPlacementResult {
  ok: boolean;
  message: string;
  affectedId?: string;
}

interface CanvasInputs {
  nodes: Record<string, { children: string[] }>;
  rootIds: string[];
}

function normalizeIndex(nextIndex: number | undefined, maxLength: number): number {
  if (typeof nextIndex !== 'number' || Number.isNaN(nextIndex)) {
    return maxLength;
  }

  return Math.max(0, Math.min(maxLength, Math.floor(nextIndex)));
}

function normalizePosition(
  candidate: PlacementSuggestion['position'],
  fallbackOffset: number,
): { x: number; y: number } {
  if (!candidate) {
    return { x: 24 + fallbackOffset * 16, y: 24 + fallbackOffset * 16 };
  }

  const x = Number.isFinite(candidate.x) ? Math.max(0, Math.floor(candidate.x)) : 24;
  const y = Number.isFinite(candidate.y) ? Math.max(0, Math.floor(candidate.y)) : 24;
  return { x, y };
}

function normalizeGridCell(
  gridCell: PlacementSuggestion['gridCell'] | undefined,
): { col: number; row: number } | null {
  if (!gridCell) return null;
  const col = Number.isFinite(gridCell.col) ? Math.max(1, Math.floor(gridCell.col)) : 1;
  const row = Number.isFinite(gridCell.row) ? Math.max(1, Math.floor(gridCell.row)) : 1;
  return { col, row };
}

export function applyPlacementSuggestion(
  dispatch: AppDispatch,
  canvas: CanvasInputs,
  suggestion: PlacementSuggestion,
): ApplyPlacementResult {
  const { nodes, rootIds } = canvas;

  if (suggestion.targetParentId && !nodes[suggestion.targetParentId]) {
    return { ok: false, message: 'Target parent does not exist on the canvas.' };
  }

  const parentChildren = suggestion.targetParentId
    ? (nodes[suggestion.targetParentId]?.children ?? [])
    : rootIds;

  const normalizedIndex = normalizeIndex(suggestion.newIndex, parentChildren.length);
  const normalizedPosition = normalizePosition(suggestion.position, rootIds.length);
  const normalizedGridCell = normalizeGridCell(suggestion.gridCell);

  if (suggestion.mode === 'move') {
    if (!suggestion.existingNodeId) {
      return { ok: false, message: 'Move suggestion is missing existingNodeId.' };
    }

    if (!nodes[suggestion.existingNodeId]) {
      return { ok: false, message: 'The component to move no longer exists.' };
    }

    dispatch(
      moveNode({
        id: suggestion.existingNodeId,
        newParentId: suggestion.targetParentId,
        newIndex: normalizedIndex,
        position: normalizedPosition,
      }),
    );

    if (normalizedGridCell) {
      dispatch(
        updateProps({
          id: suggestion.existingNodeId,
          props: { gridColumn: normalizedGridCell.col, gridRow: normalizedGridCell.row },
        }),
      );
    } else {
      dispatch(
        updateProps({
          id: suggestion.existingNodeId,
          props: { gridColumn: undefined, gridRow: undefined },
        }),
      );
    }

    return {
      ok: true,
      affectedId: suggestion.existingNodeId,
      message: 'Placement applied by moving the selected component.',
    };
  }

  if (!suggestion.componentType) {
    return { ok: false, message: 'Create suggestion is missing componentType.' };
  }

  const newId = crypto.randomUUID();
  dispatch(
    addNode({
      id: newId,
      type: suggestion.componentType,
      parentId: suggestion.targetParentId,
      newIndex: normalizedIndex,
      position: normalizedPosition,
    }),
  );

  if (normalizedGridCell) {
    dispatch(
      updateProps({
        id: newId,
        props: { gridColumn: normalizedGridCell.col, gridRow: normalizedGridCell.row },
      }),
    );
  }

  return {
    ok: true,
    affectedId: newId,
    message: `Placed a new ${suggestion.componentType} component.`,
  };
}

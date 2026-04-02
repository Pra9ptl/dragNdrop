import type { Modifier } from "@dnd-kit/core";

const GRID_SIZE = 8;

export const snapToGrid: Modifier = ({ transform }) => ({
  ...transform,
  x: Math.round(transform.x / GRID_SIZE) * GRID_SIZE,
  y: Math.round(transform.y / GRID_SIZE) * GRID_SIZE,
});

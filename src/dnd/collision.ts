import { type CollisionDetection, type DroppableContainer } from '@dnd-kit/core';

export const nestingCollisionDetection: CollisionDetection = ({
  droppableContainers, pointerCoordinates
}) => {
  if (!pointerCoordinates) return [];

  const { x, y } = pointerCoordinates;
  let bestMatch: DroppableContainer | null = null;
  let smallestArea = Infinity;

  // Find the smallest container that contains the pointer
  // Smallest = most nested = most specific target
  for (const container of droppableContainers) {
    const rect = container.rect.current;
    if (!rect) continue;
    const isInside =
      x >= rect.left && x <= rect.right &&
      y >= rect.top  && y <= rect.bottom;
    if (isInside) {
      const area = rect.width * rect.height;
      if (area < smallestArea) {
        smallestArea = area;
        bestMatch = container;
      }
    }
  }

  return bestMatch ? [{ id: bestMatch.id }] : [];
};

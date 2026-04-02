import { PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

export function useCanvasSensors() {
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,   // prevents accidental drag on click
      },
    }),
    useSensor(KeyboardSensor, {   // A11y: keyboard drag support
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
}

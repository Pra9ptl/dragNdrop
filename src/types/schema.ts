// Every component type that can exist on the canvas
export type ComponentType =
  | 'Button'
  | 'Text'
  | 'Input'
  | 'Card'
  | 'Container'
  | 'Image';
 
// The props a component can have
export interface ComponentProps {
  label?    : string;
  variant?  : string;
  imageSrc? : string;
  imageAlt? : string;
  color?    : string;
  fontSize? : number;
  backgroundColor?: string;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  borderRadius?: number;
  boxShadow?: string;
  padding?  : number;
  width?    : string | number;
  height?   : string | number;
  display?  : 'block' | 'flex' | 'grid';
  gap?      : number;
  flexDirection?: 'row' | 'column';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'stretch' | 'flex-start' | 'center' | 'flex-end';
  gridRows?: number;
  gridColumns?: number;
  gridTemplateColumns?: string;
  gridColumn?: number;  // child placement: which column in parent grid (1-indexed)
  gridRow?: number;     // child placement: which row in parent grid (1-indexed)
  [key: string]: unknown; // allows any extra prop
}
 
// One component on the canvas
export interface ComponentNode {
  id       : string;
  type     : ComponentType;
  props    : ComponentProps;
  children : string[];          // IDs of child components
  parentId : string | null;     // null = top-level on canvas
  position : { x: number; y: number };
}

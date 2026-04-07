/**
 * ContentTab - Content-oriented inspector controls
 *
 * This tab only exposes props that affect what a component says or displays,
 * not how it is laid out. The available fields vary by component type.
 */
import { MenuItem, TextField } from '@mui/material';
import { useDispatch } from 'react-redux';
import { updateProps } from '../../../store/slices/canvasSlice';
import type { ComponentNode } from '../../../types/schema';

interface Props { node: ComponentNode; }

export function ContentTab({ node }: Props) {
  const dispatch = useDispatch();
  // Containers are structural only, so they intentionally do not expose a label field.
  const showLabelField = node.type !== 'Container';

  return (
    <div className='space-y-3'>
      {showLabelField && (
        <TextField
          label='Label' fullWidth size='small'
          value={node.props.label ?? ''}
          onChange={e => dispatch(updateProps({
            id: node.id,
            props: { label: e.target.value }
          }))}
        />
      )}
      {node.type === 'Button' && (
        // Button variant maps directly to the preview styling in CanvasNode.
        <TextField
          label='Variant' fullWidth size='small' select
          value={node.props.variant ?? 'contained'}
          onChange={e => dispatch(updateProps({
            id: node.id, props: { variant: e.target.value }
          }))}
        >
          {['contained','outlined','text'].map(v =>
            <MenuItem key={v} value={v}>{v}</MenuItem>
          )}
        </TextField>
      )}
      {node.type === 'Image' && (
        // Images need both source and alt text so preview and accessibility stay in sync.
        <>
          <TextField
            label='Image URL'
            fullWidth
            size='small'
            value={String(node.props.imageSrc ?? '')}
            onChange={e => dispatch(updateProps({
              id: node.id,
              props: { imageSrc: e.target.value }
            }))}
          />
          <TextField
            label='Alt text'
            fullWidth
            size='small'
            value={String(node.props.imageAlt ?? '')}
            onChange={e => dispatch(updateProps({
              id: node.id,
              props: { imageAlt: e.target.value }
            }))}
          />
        </>
      )}
    </div>
  );
}

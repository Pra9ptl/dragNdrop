import { MenuItem, TextField } from '@mui/material';
import { useDispatch } from 'react-redux';
import { updateProps } from '../../../store/slices/canvasSlice';
import type { ComponentNode } from '../../../types/schema';

interface Props { node: ComponentNode; }

export function ContentTab({ node }: Props) {
  const dispatch = useDispatch();
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

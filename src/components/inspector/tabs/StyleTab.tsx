import { MenuItem, TextField } from '@mui/material';
import { useDispatch } from 'react-redux';
import { updateProps } from '../../../store/slices/canvasSlice';
import type { ComponentNode } from '../../../types/schema';

interface Props { node: ComponentNode; }

export function StyleTab({ node }: Props) {
  const dispatch = useDispatch();
  const isContainerLike = node.type === 'Container' || node.type === 'Card';

  return (
    <div className='space-y-3'>
      {!isContainerLike && (
        <>
          <TextField
            label='Color'
            fullWidth
            size='small'
            value={String(node.props.color ?? '')}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: { color: event.target.value },
            }))}
          />
          <TextField
            label='Font size'
            fullWidth
            size='small'
            type='number'
            value={String(node.props.fontSize ?? '')}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: {
                fontSize: event.target.value === '' ? undefined : Number(event.target.value),
              },
            }))}
          />
        </>
      )}

      {isContainerLike && (
        <>
          <TextField
            label='Background color'
            fullWidth
            size='small'
            value={String(node.props.backgroundColor ?? '')}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: { backgroundColor: event.target.value },
            }))}
          />
          <TextField
            label='Border width'
            fullWidth
            size='small'
            type='number'
            value={String(node.props.borderWidth ?? '')}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: {
                borderWidth: event.target.value === '' ? undefined : Number(event.target.value),
              },
            }))}
          />
          <TextField
            label='Border style'
            fullWidth
            size='small'
            select
            value={node.props.borderStyle ?? 'solid'}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: { borderStyle: event.target.value as 'none' | 'solid' | 'dashed' | 'dotted' },
            }))}
          >
            <MenuItem value='solid'>solid</MenuItem>
            <MenuItem value='dashed'>dashed</MenuItem>
            <MenuItem value='dotted'>dotted</MenuItem>
            <MenuItem value='none'>none</MenuItem>
          </TextField>
          <TextField
            label='Border color'
            fullWidth
            size='small'
            value={String(node.props.borderColor ?? '')}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: { borderColor: event.target.value },
            }))}
          />
          <TextField
            label='Border radius'
            fullWidth
            size='small'
            type='number'
            value={String(node.props.borderRadius ?? '')}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: {
                borderRadius: event.target.value === '' ? undefined : Number(event.target.value),
              },
            }))}
          />
          <TextField
            label='Box shadow'
            fullWidth
            size='small'
            value={String(node.props.boxShadow ?? '')}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: { boxShadow: event.target.value },
            }))}
          />
        </>
      )}
    </div>
  );
}
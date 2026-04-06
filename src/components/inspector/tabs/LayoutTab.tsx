import { MenuItem, TextField } from '@mui/material';
import { useDispatch } from 'react-redux';
import { updateProps } from '../../../store/slices/canvasSlice';
import type { ComponentNode } from '../../../types/schema';

interface Props { node: ComponentNode; }

export function LayoutTab({ node }: Props) {
  const dispatch = useDispatch();
  const isContainerLike = node.type === 'Container' || node.type === 'Card';
  const display = node.props.display === 'flex' || node.props.display === 'grid'
    ? node.props.display
    : 'block';
  const gridRows = typeof node.props.gridRows === 'number' && node.props.gridRows > 0
    ? node.props.gridRows
    : 2;
  const gridColumns = typeof node.props.gridColumns === 'number' && node.props.gridColumns > 0
    ? node.props.gridColumns
    : 2;

  return (
    <div className='space-y-3'>
      <TextField
        label='Width'
        fullWidth
        size='small'
        value={String(node.props.width ?? '')}
        onChange={(event) => dispatch(updateProps({
          id: node.id,
          props: { width: event.target.value },
        }))}
      />
      <TextField
        label='Height'
        fullWidth
        size='small'
        value={String(node.props.height ?? '')}
        onChange={(event) => dispatch(updateProps({
          id: node.id,
          props: { height: event.target.value },
        }))}
      />
      <TextField
        label='Padding'
        fullWidth
        size='small'
        type='number'
        value={String(node.props.padding ?? '')}
        onChange={(event) => dispatch(updateProps({
          id: node.id,
          props: {
            padding: event.target.value === '' ? undefined : Number(event.target.value),
          },
        }))}
      />
      {isContainerLike && (
        <TextField
          label='Display'
          fullWidth
          size='small'
          select
          value={display}
          onChange={(event) => {
            const newDisplay = event.target.value as 'block' | 'flex' | 'grid';
            dispatch(updateProps({
              id: node.id,
              props: {
                display: newDisplay,
                ...(newDisplay === 'flex' ? {
                  flexDirection: node.props.flexDirection ?? 'row',
                  gap          : node.props.gap ?? 8,
                  alignItems   : node.props.alignItems ?? 'stretch',
                  justifyContent: node.props.justifyContent ?? 'flex-start',
                } : {}),
                ...(newDisplay === 'grid' ? {
                  gridColumns: node.props.gridColumns ?? 2,
                  gridRows   : node.props.gridRows ?? 2,
                  gap        : node.props.gap ?? 8,
                } : {}),
              },
            }));
          }}
        >
          <MenuItem value='block'>block</MenuItem>
          <MenuItem value='flex'>flex</MenuItem>
          <MenuItem value='grid'>grid</MenuItem>
        </TextField>
      )}
      {isContainerLike && display === 'flex' && (
        <>
          <TextField
            label='Direction'
            fullWidth
            size='small'
            select
            value={node.props.flexDirection ?? 'row'}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: { flexDirection: event.target.value as 'row' | 'column' },
            }))}
          >
            <MenuItem value='row'>row</MenuItem>
            <MenuItem value='column'>column</MenuItem>
          </TextField>
          <TextField
            label='Justify content'
            fullWidth
            size='small'
            select
            value={node.props.justifyContent ?? 'flex-start'}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: { justifyContent: event.target.value as 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly' },
            }))}
          >
            <MenuItem value='flex-start'>flex-start</MenuItem>
            <MenuItem value='center'>center</MenuItem>
            <MenuItem value='flex-end'>flex-end</MenuItem>
            <MenuItem value='space-between'>space-between</MenuItem>
            <MenuItem value='space-around'>space-around</MenuItem>
            <MenuItem value='space-evenly'>space-evenly</MenuItem>
          </TextField>
          <TextField
            label='Align items'
            fullWidth
            size='small'
            select
            value={node.props.alignItems ?? 'stretch'}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: { alignItems: event.target.value as 'stretch' | 'flex-start' | 'center' | 'flex-end' },
            }))}
          >
            <MenuItem value='stretch'>stretch</MenuItem>
            <MenuItem value='flex-start'>flex-start</MenuItem>
            <MenuItem value='center'>center</MenuItem>
            <MenuItem value='flex-end'>flex-end</MenuItem>
          </TextField>
          <TextField
            label='Gap'
            fullWidth
            size='small'
            type='number'
            value={String(node.props.gap ?? '')}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: {
                gap: event.target.value === '' ? undefined : Number(event.target.value),
              },
            }))}
          />
        </>
      )}
      {isContainerLike && display === 'grid' && (
        <>
          <TextField
            label='Rows'
            fullWidth
            size='small'
            type='number'
            inputProps={{ min: 1 }}
            value={String(gridRows)}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: {
                gridRows: event.target.value === ''
                  ? undefined
                  : Math.max(1, Number(event.target.value)),
              },
            }))}
          />
          <TextField
            label='Columns'
            fullWidth
            size='small'
            type='number'
            inputProps={{ min: 1 }}
            value={String(gridColumns)}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: {
                gridColumns: event.target.value === ''
                  ? undefined
                  : Math.max(1, Number(event.target.value)),
              },
            }))}
          />
          <TextField
            label='Gap'
            fullWidth
            size='small'
            type='number'
            value={String(node.props.gap ?? '')}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: {
                gap: event.target.value === '' ? undefined : Number(event.target.value),
              },
            }))}
          />
          <TextField
            label='Align items'
            fullWidth
            size='small'
            select
            value={node.props.alignItems ?? 'stretch'}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: { alignItems: event.target.value as 'stretch' | 'flex-start' | 'center' | 'flex-end' },
            }))}
          >
            <MenuItem value='stretch'>stretch</MenuItem>
            <MenuItem value='flex-start'>start</MenuItem>
            <MenuItem value='center'>center</MenuItem>
            <MenuItem value='flex-end'>end</MenuItem>
          </TextField>
          <TextField
            label='Justify content'
            fullWidth
            size='small'
            select
            value={node.props.justifyContent ?? 'flex-start'}
            onChange={(event) => dispatch(updateProps({
              id: node.id,
              props: { justifyContent: event.target.value as 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly' },
            }))}
          >
            <MenuItem value='flex-start'>start</MenuItem>
            <MenuItem value='center'>center</MenuItem>
            <MenuItem value='flex-end'>end</MenuItem>
            <MenuItem value='space-between'>space-between</MenuItem>
            <MenuItem value='space-around'>space-around</MenuItem>
            <MenuItem value='space-evenly'>space-evenly</MenuItem>
          </TextField>
        </>
      )}
    </div>
  );
}
import { Tabs, Tab, Box } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { selectNodeById } from '../../selectors/canvasSelectors';
import { ContentTab } from './tabs/ContentTab';
import { StyleTab } from './tabs/StyleTab';
import { LayoutTab } from './tabs/LayoutTab';

type InspectorTab = 'content' | 'style' | 'layout';

export function Inspector() {
  const [tab, setTab] = useState<InspectorTab>('content');
  const selectedId = useSelector((s: RootState) => s.selection.selectedId);
  const node = useSelector(selectNodeById(selectedId ?? ''));

  const hasContentTab = node?.type !== 'Container';
  const visibleTabs = useMemo<InspectorTab[]>(() => {
    return hasContentTab ? ['content', 'style', 'layout'] : ['style', 'layout'];
  }, [hasContentTab]);

  useEffect(() => {
    if (!visibleTabs.includes(tab)) {
      setTab(visibleTabs[0]);
    }
  }, [tab, visibleTabs]);

  if (!node) return (
    <div className='p-4 text-gray-400 text-sm'>
      Select a component to inspect
    </div>
  );

  return (
    <div className='h-full flex flex-col bg-white border-l border-gray-200'>
      <div className='px-3 py-2 border-b border-gray-200'>
        <span className='text-xs font-semibold text-gray-500 uppercase'>
          {node.type} — {selectedId?.slice(0, 8)}
        </span>
      </div>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant='fullWidth'
            sx={{ minHeight: 36, borderBottom: 1, borderColor: 'divider' }}>
        {hasContentTab && (
          <Tab value='content' label='Content' sx={{ minHeight: 36, fontSize: 12 }} />
        )}
        <Tab value='style' label='Style' sx={{ minHeight: 36, fontSize: 12 }} />
        <Tab value='layout' label='Layout' sx={{ minHeight: 36, fontSize: 12 }} />
      </Tabs>
      <Box className='flex-1 overflow-y-auto p-3'>
        {tab === 'content' && hasContentTab && <ContentTab node={node} />}
        {tab === 'style' && <StyleTab node={node} />}
        {tab === 'layout' && <LayoutTab node={node} />}
      </Box>
    </div>
  );
}

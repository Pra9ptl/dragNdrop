import { useEffect, useState }  from 'react';
import { useSelector }          from 'react-redux';
import IconButton               from '@mui/material/IconButton';
import Tooltip                  from '@mui/material/Tooltip';
import ContentCopyIcon          from '@mui/icons-material/ContentCopy';
import CheckIcon                from '@mui/icons-material/Check';
import OpenInFullIcon           from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon      from '@mui/icons-material/CloseFullscreen';
import type { RootState } from '../store';
 
export function JsonPreview() {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
 
  // Read directly from Redux — updates live on every change
  const nodes   = useSelector((s: RootState) => s.canvas.nodes);
  const rootIds = useSelector((s: RootState) => s.canvas.rootIds);
 
  const schema   = { rootIds, nodes };
  const jsonText = JSON.stringify(schema, null, 2);
  const nodeCount = Object.keys(nodes).length;
 
  async function handleCopy() {
    await navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsFullscreen(false);
      }
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);
 
  return (
    <div style={{
      display       : 'flex',
      flexDirection : 'column',
      height        : '100%',
      background    : '#0d1117',
      ...(isFullscreen
        ? {
            position: 'fixed',
            inset: 0,
            zIndex: 1400,
            height: '100vh',
          }
        : {}),
    }}>
 
      {/* Top bar with title and copy button */}
      <div style={{
        display       : 'flex',
        alignItems    : 'flex-start',
        justifyContent: 'space-between',
        padding       : '6px 12px',
        background    : '#161b22',
        borderBottom  : '1px solid #30363d',
        flexShrink    : 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#8b949e',
                       textTransform: 'uppercase', letterSpacing: 1 }}>
          Live JSON Schema
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#58a6ff' }}>
            {nodeCount} component{nodeCount !== 1 ? 's' : ''}
          </span>
          <Tooltip title={copied ? 'Copied!' : 'Copy JSON'}>
            <IconButton size='small' onClick={handleCopy}
              sx={{ color: '#8b949e', '&:hover': { color: '#e6edf3' } }}>
              {copied
                ? <CheckIcon fontSize='small' sx={{ color: '#3fb950' }} />
                : <ContentCopyIcon fontSize='small' />}
            </IconButton>
          </Tooltip>
          <Tooltip title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Open fullscreen'}>
            <IconButton
              size='small'
              onClick={() => setIsFullscreen(prev => !prev)}
              sx={{ color: '#8b949e', '&:hover': { color: '#e6edf3' } }}
            >
              {isFullscreen
                ? <CloseFullscreenIcon fontSize='small' />
                : <OpenInFullIcon fontSize='small' />}
            </IconButton>
          </Tooltip>
        </div>
      </div>
 
      {/* JSON output area */}
      <pre style={{
        flex      : 1,
        overflow  : 'auto',
        margin    : 0,
        padding   : '16px',
        fontSize  : 12,
        fontFamily: 'Courier New, monospace',
        lineHeight: 1.6,
        color     : '#3fb950',   // green text on dark background
        textAlign: 'left',
      }}>
        {nodeCount === 0
          ? '// Drag a component onto the canvas to see the schema'
          : jsonText}
      </pre>
 
    </div>
  );
}

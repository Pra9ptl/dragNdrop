/**
 * components/JsonPreview.tsx - Live JSON view of the current canvas schema
 *
 * This panel mirrors the Redux canvas state as formatted JSON so users can see
 * the exact structure being built: rootIds plus the flat nodes map.
 *
 * It supports two convenience features:
 * - copy to clipboard for quick export/debugging
 * - fullscreen mode for inspecting larger trees
 */
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
 
  // Read live canvas state so the preview updates immediately after any mutation.
  const nodes   = useSelector((s: RootState) => s.canvas.nodes);
  const rootIds = useSelector((s: RootState) => s.canvas.rootIds);
 
  const schema   = { rootIds, nodes };
  const jsonText = JSON.stringify(schema, null, 2);
  const nodeCount = Object.keys(nodes).length;
 
  // Clipboard feedback is temporary so the user gets visual confirmation.
  async function handleCopy() {
    await navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    // Escape is the expected way to close fullscreen panels.
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

    // Prevent background page scrolling while preview is fullscreen.
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
 
      {/* Header with schema metadata and actions. */}
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
 
      {/* Preformatted output keeps the structure readable and copy-friendly. */}
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

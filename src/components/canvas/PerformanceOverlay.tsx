/**
 * components/canvas/PerformanceOverlay.tsx - Lightweight FPS monitor
 *
 * This component samples requestAnimationFrame once per frame and publishes a
 * rounded FPS value once per second. It is intentionally simple and cheap so it
 * can stay mounted during canvas interaction without distorting the numbers.
 */
import { useEffect, useRef, useState } from 'react';
 
export function PerformanceOverlay() {
  const [fps, setFps]   = useState(60);
  const frameCount      = useRef(0);                  // frames accumulated in the current sample window
  const lastTime        = useRef(performance.now());  // timestamp of last FPS commit
  const rafId           = useRef(0);                  // current RAF id for cleanup
 
  useEffect(() => {
    function tick() {
      frameCount.current += 1;
      const now     = performance.now();
      const elapsed = now - lastTime.current;
 
      // Update React state only once per second to keep this overlay low-overhead.
      if (elapsed >= 1000) {
        const currentFps = Math.round((frameCount.current * 1000) / elapsed);
        setFps(currentFps);
        frameCount.current = 0;
        lastTime.current   = now;
      }
 
      rafId.current = requestAnimationFrame(tick);
    }
 
    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, []);
 
  // Simple color bands are enough to spot obvious regressions while dragging.
  const color =
    fps >= 55 ? '#22c55e' :
    fps >= 40 ? '#f59e0b' :
    '#ef4444';
 
  return (
    <div style={{
      position    : 'fixed',
      top         : 12,
      right       : 12,
      zIndex      : 9999,
      background  : 'rgba(0,0,0,0.80)',
      color,
      padding     : '4px 12px',
      borderRadius: 6,
      fontFamily  : 'monospace',
      fontSize    : 13,
      fontWeight  : 'bold',
      pointerEvents: 'none',
      userSelect  : 'none',
    }}>
      {fps} FPS
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
 
export function PerformanceOverlay() {
  const [fps, setFps]   = useState(60);
  const frameCount      = useRef(0);           // how many frames since last check
  const lastTime        = useRef(performance.now()); // timestamp of last check
  const rafId           = useRef(0);           // animation frame ID (for cleanup)
 
  useEffect(() => {
    function tick() {
      frameCount.current += 1;
      const now     = performance.now();
      const elapsed = now - lastTime.current;
 
      // Once a full second has passed, calculate and display FPS
      if (elapsed >= 1000) {
        const currentFps = Math.round((frameCount.current * 1000) / elapsed);
        setFps(currentFps);          // this is the only setState call — once/second
        frameCount.current = 0;
        lastTime.current   = now;
      }
 
      rafId.current = requestAnimationFrame(tick); // schedule next frame
    }
 
    rafId.current = requestAnimationFrame(tick); // start the loop
    return () => cancelAnimationFrame(rafId.current); // cleanup on unmount
  }, []);
 
  // Green = good (55+), Yellow = ok (40+), Red = poor
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
      pointerEvents: 'none',   // won't block any clicks or drags
      userSelect  : 'none',
    }}>
      {fps} FPS
    </div>
  );
}

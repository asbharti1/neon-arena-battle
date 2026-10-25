import { useRef } from 'react';

export default function MobileControls({ inputRef, onFire, onDodge }) {
  const stick = useRef(null);
  const update = (event) => {
    const el = stick.current; if (!el) return;
    const box = el.getBoundingClientRect(); const dx = event.clientX - (box.left + box.width / 2); const dy = event.clientY - (box.top + box.height / 2);
    const range = box.width * 0.34; const length = Math.hypot(dx, dy); const scale = Math.min(1, range / (length || 1));
    inputRef.current.moveX = (dx * scale) / range; inputRef.current.moveZ = (dy * scale) / range;
    el.style.setProperty('--stick-x', `${dx * scale}px`); el.style.setProperty('--stick-y', `${dy * scale}px`);
  };
  const stop = () => { inputRef.current.moveX = 0; inputRef.current.moveZ = 0; inputRef.current.touchActive = false; if (stick.current) { stick.current.style.setProperty('--stick-x', '0px'); stick.current.style.setProperty('--stick-y', '0px'); } };
  return <div className="mobile-controls" aria-label="Touch game controls">
    <div ref={stick} className="touch-stick" onPointerDown={(e) => { inputRef.current.touchActive = true; e.currentTarget.setPointerCapture(e.pointerId); update(e); }} onPointerMove={(e) => e.buttons && update(e)} onPointerUp={stop} onPointerCancel={stop}><i /></div>
    <div className="touch-actions"><button className="dodge-button" onPointerDown={(e) => { e.preventDefault(); onDodge(); }}>DODGE</button><button className="fire-button" onPointerDown={(e) => { e.preventDefault(); onFire(); }}>PULSE</button></div>
  </div>;
}

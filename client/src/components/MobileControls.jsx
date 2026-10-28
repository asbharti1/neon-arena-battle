import { useRef } from 'react';

export default function MobileControls({ inputRef, onFire, onDodge }) {
  const stick = useRef(null);
  const activePointer = useRef(null);

  const update = (clientX, clientY) => {
    const el = stick.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const dx = clientX - (box.left + box.width / 2);
    const dy = clientY - (box.top + box.height / 2);
    const range = box.width * 0.38;
    const length = Math.hypot(dx, dy);
    const scale = length > range ? range / length : 1;
    const nx = (dx * scale) / range;
    const nz = (dy * scale) / range;

    inputRef.current.moveX = nx;
    inputRef.current.moveZ = nz;
    inputRef.current.touchActive = true;

    el.style.setProperty('--stick-x', `${dx * scale}px`);
    el.style.setProperty('--stick-y', `${dy * scale}px`);

    // Dynamically aim towards movement vector
    if (length > 10) {
      inputRef.current.aimX = dx / length;
      inputRef.current.aimZ = dy / length;
    }
  };

  const stop = () => {
    activePointer.current = null;
    inputRef.current.moveX = 0;
    inputRef.current.moveZ = 0;
    inputRef.current.touchActive = false;
    if (stick.current) {
      stick.current.style.setProperty('--stick-x', '0px');
      stick.current.style.setProperty('--stick-y', '0px');
    }
  };

  return (
    <div className="mobile-controls" aria-label="Touch game controls">
      <div
        ref={stick}
        className="touch-stick"
        onPointerDown={(e) => {
          activePointer.current = e.pointerId;
          inputRef.current.touchActive = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          update(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activePointer.current === e.pointerId) {
            update(e.clientX, e.clientY);
          }
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
      >
        <i />
      </div>
      <div className="touch-actions">
        <button
          className="dodge-button"
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            navigator.vibrate?.([15]);
            onDodge();
          }}
        >
          DODGE
        </button>
        <button
          className="fire-button"
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            navigator.vibrate?.([20]);
            onFire();
          }}
        >
          PULSE
        </button>
      </div>
    </div>
  );
}

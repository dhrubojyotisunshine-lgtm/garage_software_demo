import { useEffect, useRef, useState } from 'react';

/**
 * Single floating tooltip for the whole app. It listens (via event delegation)
 * for hover/focus on any element carrying a `data-tip` attribute and renders a
 * styled bubble near it. The `useAutoTooltips` hook populates `data-tip` on every
 * button / link / icon control (and migrates existing native `title`s).
 */
export default function TooltipLayer() {
  const [tip, setTip] = useState(null); // { text, x, y, above }
  const timer = useRef(0);
  const current = useRef(null);

  useEffect(() => {
    const hide = () => { clearTimeout(timer.current); current.current = null; setTip(null); };

    const show = (el) => {
      const text = el.getAttribute('data-tip');
      if (!text) return;
      current.current = el;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (current.current !== el || !el.isConnected) return;
        const r = el.getBoundingClientRect();
        const above = r.top > 46;
        setTip({
          text,
          x: Math.round(r.left + r.width / 2),
          y: Math.round(above ? r.top - 8 : r.bottom + 8),
          above,
        });
      }, 110);
    };

    const onOver = (e) => {
      const el = e.target.closest?.('[data-tip]');
      if (el && el !== current.current) show(el);
    };
    const onOut = (e) => {
      const from = e.target.closest?.('[data-tip]');
      if (!from) return;
      const to = e.relatedTarget?.closest?.('[data-tip]');
      if (to === from) return; // moving within the same control
      hide();
    };

    document.addEventListener('pointerover', onOver);
    document.addEventListener('pointerout', onOut);
    document.addEventListener('focusin', onOver);
    document.addEventListener('focusout', onOut);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
      document.removeEventListener('focusin', onOver);
      document.removeEventListener('focusout', onOut);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('blur', hide);
    };
  }, []);

  if (!tip) return null;

  return (
    <div
      style={{
        position: 'fixed', left: tip.x, top: tip.y, zIndex: 99999, pointerEvents: 'none',
        transform: `translate(-50%, ${tip.above ? '-100%' : '0'})`,
      }}
    >
      <div
        style={{
          position: 'relative', background: '#0f172a', color: '#fff',
          fontSize: 12, fontWeight: 500, lineHeight: 1.35, padding: '5px 9px',
          borderRadius: 6, maxWidth: 260, textAlign: 'center',
          boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
          animation: 'ttnTipIn 90ms ease-out',
        }}
      >
        {tip.text}
        <span
          style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            ...(tip.above
              ? { top: '100%', borderTop: '5px solid #0f172a' }
              : { bottom: '100%', borderBottom: '5px solid #0f172a' }),
          }}
        />
      </div>
      <style>{`@keyframes ttnTipIn { from { opacity: 0; transform: translateY(${tip.above ? '2px' : '-2px'}); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

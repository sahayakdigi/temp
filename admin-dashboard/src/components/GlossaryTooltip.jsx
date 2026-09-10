import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * GlossaryTooltip — wraps any label/text with an info icon that shows
 * the definition on hover. Import from this file and use as:
 *   <GlossaryTooltip term="LR" label="LR No." />
 *   or wrap children:
 *   <GlossaryTooltip term="GRN">Goods Receipt (GRN)</GlossaryTooltip>
 */
export default function GlossaryTooltip({ term, label, children, glossary }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);
  const tooltipRef = useRef(null);

  const entry = glossary[term];
  if (!entry) return <span>{children || label}</span>;

  const handleMouseEnter = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: Math.min(rect.left, window.innerWidth - 340)
      });
    }
    setVisible(true);
  };

  const handleMouseLeave = () => setVisible(false);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {children || label}
      <span
        ref={iconRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', color: 'var(--accent-cyan)', opacity: 0.75, transition: 'opacity 0.2s' }}
        title=""
      >
        <HelpCircle size={13} />
      </span>

      {visible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 9999,
            width: '320px',
            background: 'rgba(10,12,18,0.97)',
            border: '1px solid var(--accent-cyan-glow)',
            borderRadius: '10px',
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(22,199,255,0.15)',
            pointerEvents: 'none',
            backdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
              {entry.term}
            </span>
            <span style={{
              fontSize: '0.6rem',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(22,199,255,0.1)',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Trade Term
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
            {entry.definition}
          </p>
        </div>
      )}
    </span>
  );
}

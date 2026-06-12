import { useCallback, useEffect, useState } from 'react';
import { pickReason, type WhyReason } from '../data/whyItMatters';

// Floating "why is this important?" button — available on every feature.
// Each press (and each re-roll) surfaces a different big-picture reason.
export function WhyItMatters({
  featureId,
  rng,
}: {
  featureId: string;
  rng?: () => number;
}) {
  const [reason, setReason] = useState<WhyReason | null>(null);

  const open = useCallback(() => {
    setReason(pickReason(featureId, undefined, rng));
  }, [featureId, rng]);

  const reroll = useCallback(() => {
    setReason((prev) => pickReason(featureId, prev ?? undefined, rng));
  }, [featureId, rng]);

  const close = useCallback(() => setReason(null), []);

  // A reason from one feature shouldn't linger into the next tab.
  useEffect(() => setReason(null), [featureId]);

  useEffect(() => {
    if (!reason) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [reason, close]);

  return (
    <>
      <button
        type="button"
        className="wim-fab"
        onClick={open}
        title="למה זה חשוב? — התמונה הגדולה"
      >
        <span className="wim-fab-icon" aria-hidden="true">
          💡
        </span>
        <span className="wim-fab-label">למה זה חשוב?</span>
      </button>

      {reason && (
        <div
          className="wim-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="למה זה חשוב"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="wim-card">
            <button
              type="button"
              className="wim-close"
              onClick={close}
              aria-label="סגירה"
            >
              ✕
            </button>
            <p className="wim-kicker">🌍 התמונה הגדולה</p>
            <h3 className="wim-title">{reason.title}</h3>
            <p className="wim-body">{reason.body}</p>
            <div className="wim-actions">
              <button type="button" className="wim-reroll" onClick={reroll}>
                🎲 עוד סיבה
              </button>
              <button type="button" className="wim-done" onClick={close}>
                הבנתי ←
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

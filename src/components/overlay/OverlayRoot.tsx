import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { OverlayRequest } from './OverlayProvider';

interface OverlayRootProps {
  overlay: OverlayRequest | null;
  onClose: () => void;
}

export function OverlayRoot({ overlay, onClose }: OverlayRootProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartRef = useRef(0);
  const touchTrackingRef = useRef(false);

  useEffect(() => {
    if (!overlay) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [overlay, onClose]);

  useEffect(() => {
    if (!overlay) {
      setDragOffset(0);
      touchTrackingRef.current = false;
    }
  }, [overlay]);

  if (!overlay) return null;

  const isBottomSheet = window.matchMedia('(max-width: 767px)').matches;
  const sizeClass = `overlay-panel-size-${overlay.size || 'md'}`;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (overlay.closeOnBackdrop === false) return;
    onClose();
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isBottomSheet) return;
    if (!panelRef.current || panelRef.current.scrollTop > 0) {
      touchTrackingRef.current = false;
      return;
    }

    touchTrackingRef.current = true;
    touchStartRef.current = event.touches[0]?.clientY || 0;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchTrackingRef.current || !isBottomSheet) return;
    const currentY = event.touches[0]?.clientY || 0;
    const delta = Math.max(0, currentY - touchStartRef.current);
    setDragOffset(Math.min(delta, 180));
  };

  const handleTouchEnd = () => {
    if (!touchTrackingRef.current || !isBottomSheet) return;
    const shouldClose = dragOffset > 96;
    touchTrackingRef.current = false;
    setDragOffset(0);
    if (shouldClose) onClose();
  };

  return createPortal(
    <div className="overlay-root" onClick={handleBackdropClick} aria-hidden={false}>
      <div
        className={`overlay-panel ${sizeClass}`}
        role="dialog"
        aria-modal="true"
        aria-label={overlay.title}
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={dragOffset > 0 ? { transform: `translateY(${dragOffset}px)` } : undefined}
      >
        <header className="overlay-head">
          <h3 className="overlay-title">{overlay.title}</h3>
          <button type="button" className="overlay-close" onClick={onClose} aria-label="Close overlay">
            ×
          </button>
        </header>
        <div className="overlay-body">{overlay.content}</div>
      </div>
    </div>,
    document.body
  );
}

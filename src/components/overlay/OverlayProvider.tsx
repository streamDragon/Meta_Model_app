import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { OverlayRoot } from './OverlayRoot';

export type OverlaySize = 'sm' | 'md' | 'lg' | 'xl';

export interface OverlayRequest {
  type?: string;
  title: string;
  size?: OverlaySize;
  closeOnBackdrop?: boolean;
  content: React.ReactNode;
}

export interface OverlayContextValue {
  openOverlay: (request: OverlayRequest) => void;
  closeOverlay: () => void;
  activeOverlay: OverlayRequest | null;
}

export const OverlayContext = createContext<OverlayContextValue | null>(null);

interface OverlayProviderProps {
  children: React.ReactNode;
}

export function OverlayProvider({ children }: OverlayProviderProps) {
  const [activeOverlay, setActiveOverlay] = useState<OverlayRequest | null>(null);

  const openOverlay = useCallback((request: OverlayRequest) => {
    setActiveOverlay(request);
  }, []);

  const closeOverlay = useCallback(() => {
    setActiveOverlay(null);
  }, []);

  useEffect(() => {
    if (!activeOverlay) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [activeOverlay]);

  const value = useMemo<OverlayContextValue>(
    () => ({ openOverlay, closeOverlay, activeOverlay }),
    [openOverlay, closeOverlay, activeOverlay]
  );

  return (
    <OverlayContext.Provider value={value}>
      {children}
      <OverlayRoot overlay={activeOverlay} onClose={closeOverlay} />
    </OverlayContext.Provider>
  );
}

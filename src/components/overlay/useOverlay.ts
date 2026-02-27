import { useContext } from 'react';
import { OverlayContext, type OverlayContextValue } from './OverlayProvider';

export function useOverlay(): OverlayContextValue {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error('useOverlay must be used inside OverlayProvider');
  }
  return context;
}

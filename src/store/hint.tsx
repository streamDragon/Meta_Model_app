import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface HintContextValue {
  hint: string | null;
  showHint: (text: string) => void;
  closeHint: () => void;
}

const HintContext = createContext<HintContextValue | null>(null);

const HINT_TIMEOUT_MS = 6000;

export function HintProvider({ children }: { children: ReactNode }) {
  const [hint, setHint] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeHint = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHint(null);
  }, []);

  const showHint = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setHint(text);
    timer.current = setTimeout(() => setHint(null), HINT_TIMEOUT_MS);
  }, []);

  const value = useMemo(
    () => ({ hint, showHint, closeHint }),
    [hint, showHint, closeHint],
  );

  return <HintContext.Provider value={value}>{children}</HintContext.Provider>;
}

export function useHint(): HintContextValue {
  const ctx = useContext(HintContext);
  if (!ctx) throw new Error('useHint must be used inside HintProvider');
  return ctx;
}

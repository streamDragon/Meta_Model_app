import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// Bridge for cross-feature triggers like "practice this category" on the
// Categories page, which navigates to the trainer AND starts a session.
interface PracticeLaunchValue {
  request: { categoryId: string; token: number } | null;
  launchPractice: (categoryId: string) => void;
  consume: () => void;
}

const PracticeLaunchContext = createContext<PracticeLaunchValue | null>(null);

export function PracticeLaunchProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<PracticeLaunchValue['request']>(null);

  const launchPractice = useCallback((categoryId: string) => {
    setRequest({ categoryId, token: Date.now() });
    window.location.hash = 'practice';
  }, []);

  const consume = useCallback(() => setRequest(null), []);

  const value = useMemo(
    () => ({ request, launchPractice, consume }),
    [request, launchPractice, consume],
  );

  return (
    <PracticeLaunchContext.Provider value={value}>
      {children}
    </PracticeLaunchContext.Provider>
  );
}

export function usePracticeLaunch(): PracticeLaunchValue {
  const ctx = useContext(PracticeLaunchContext);
  if (!ctx)
    throw new Error('usePracticeLaunch must be used inside PracticeLaunchProvider');
  return ctx;
}

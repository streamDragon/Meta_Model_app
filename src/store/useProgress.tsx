import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  applySession,
  applyXP,
  emptyProgress,
  normalizeProgress,
  STORAGE_KEY,
  type BadgeAward,
  type UserProgress,
} from './progress';

interface ProgressContextValue {
  progress: UserProgress;
  addXP: (amount: number) => void;
  recordSession: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

function loadStoredProgress(): UserProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeProgress(JSON.parse(raw)) : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

function storeProgress(p: UserProgress) {
  try {
    // schemaVersion travels with the stored blob (normalizeProgress ignores
    // unknown fields, so legacy blobs without it still load fine).
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, ...p }));
  } catch {
    // storage unavailable (private mode etc.) — keep in-memory state only
  }
}

export function ProgressProvider({
  children,
  onBadges,
}: {
  children: ReactNode;
  onBadges?: (badges: BadgeAward[]) => void;
}) {
  const [progress, setProgress] = useState<UserProgress>(loadStoredProgress);
  const announcedBadgeIds = useRef(new Set(progress.badges.map((badge) => badge.id)));

  useEffect(() => {
    const nextBadgeIds = new Set(progress.badges.map((badge) => badge.id));
    const newBadges = progress.badges.filter(
      (badge) => !announcedBadgeIds.current.has(badge.id),
    );
    announcedBadgeIds.current = nextBadgeIds;
    if (newBadges.length > 0) onBadges?.(newBadges);
  }, [onBadges, progress.badges]);

  const addXP = useCallback(
    (amount: number) => {
      setProgress((current) => {
        const result = applyXP(current, amount);
        storeProgress(result.progress);
        return result.progress;
      });
    },
    [],
  );

  const recordSession = useCallback(() => {
      setProgress((current) => {
        const result = applySession(current);
        storeProgress(result.progress);
        return result.progress;
      });
  }, []);

  const value = useMemo(
    () => ({ progress, addXP, recordSession }),
    [progress, addXP, recordSession],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}

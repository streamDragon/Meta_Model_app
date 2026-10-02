import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { emptyLearning, loadLearning, recordConversation, saveLearning, type ConversationLearning, type LearningSession } from '../lib/conversationLearning';
interface LearningContextValue {
  learning: ConversationLearning;
  stored: boolean;
  complete: (session: LearningSession) => { xp: number; recorded: boolean };
  markTransfer: (id: string, transfer: LearningSession['transfer']) => void;
  clear: () => void;
}
const Context = createContext<LearningContextValue | null>(null);
export function ConversationLearningProvider({ children }: { children: ReactNode }) {
  const [learning, setLearning] = useState(loadLearning);
  const current = useRef(learning);
  const [stored, setStored] = useState(true);
  const update = useCallback((next: ConversationLearning) => {
    current.current = next;
    setLearning(next);
    setStored(saveLearning(next));
  }, []);
  const complete = useCallback((session: LearningSession) => {
    const result = recordConversation(current.current, session);
    if (result.recorded) update(result.data);
    return { xp: result.xp, recorded: result.recorded };
  }, [update]);
  const markTransfer = useCallback((id: string, transfer: LearningSession['transfer']) => {
    update({ ...current.current, sessions: current.current.sessions.map((s) => s.id === id ? { ...s, transfer } : s) });
  }, [update]);
  const clear = useCallback(() => update(emptyLearning()), [update]);
  const value = useMemo(() => ({ learning, stored, complete, markTransfer, clear }), [learning, stored, complete, markTransfer, clear]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useConversationLearning() {
  const value = useContext(Context);
  if (!value) throw new Error('ConversationLearningProvider required');
  return value;
}

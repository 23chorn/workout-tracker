import { createContext, useContext, useState } from 'react';

export type RMMode = 'e10RM' | 'e1RM';

const KEY = 'lift-rm-mode';

const RMModeContext = createContext<{
  rmMode: RMMode;
  setRMMode: (m: RMMode) => void;
}>({ rmMode: 'e10RM', setRMMode: () => {} });

export function RMModeProvider({ children }: { children: React.ReactNode }) {
  const [rmMode, setRMModeState] = useState<RMMode>(() =>
    localStorage.getItem(KEY) === 'e1RM' ? 'e1RM' : 'e10RM'
  );

  const setRMMode = (m: RMMode) => {
    localStorage.setItem(KEY, m);
    setRMModeState(m);
  };

  return (
    <RMModeContext.Provider value={{ rmMode, setRMMode }}>
      {children}
    </RMModeContext.Provider>
  );
}

export function useRMMode() {
  return useContext(RMModeContext);
}

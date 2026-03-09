import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useRealTime } from './RealTimeContext';

type CommunicationSummary = {
  unreadMessages: number;
  workforcePresence: {
    online: number;
    onShift: number;
    inVisit: number;
    busy: number;
  };
  viewerRole?: string;
};

type CommunicationContextType = {
  summary: CommunicationSummary;
  refreshSummary: () => Promise<void>;
};

const defaultSummary: CommunicationSummary = {
  unreadMessages: 0,
  workforcePresence: {
    online: 0,
    onShift: 0,
    inVisit: 0,
    busy: 0,
  },
  viewerRole: '',
};

const CommunicationContext = createContext<CommunicationContextType | undefined>(undefined);

export function CommunicationProvider({ children }: { children: React.ReactNode }) {
  const { on } = useRealTime();
  const { isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<CommunicationSummary>(defaultSummary);

  const refreshSummary = async () => {
    try {
      const response = (await api.getWorkforceSummary()) as any;
      setSummary(response?.data || defaultSummary);
    } catch (err) {
      console.error('Failed to load communication summary:', err);
      setSummary(defaultSummary);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setSummary(defaultSummary);
      return;
    }

    void refreshSummary();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const unsubs = [
      on('CHAT_MESSAGE_CREATED', () => {
        void refreshSummary();
      }),
      on('CHAT_READ_UPDATED', () => {
        void refreshSummary();
      }),
      on('PRESENCE_UPDATED', () => {
        void refreshSummary();
      }),
      on('VISIT_STATUS_CHANGED', () => {
        void refreshSummary();
      }),
    ];

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [isAuthenticated, on]);

  const value = useMemo(
    () => ({
      summary,
      refreshSummary,
    }),
    [summary]
  );

  return (
    <CommunicationContext.Provider value={value}>
      {children}
    </CommunicationContext.Provider>
  );
}

export function useCommunication() {
  const context = useContext(CommunicationContext);
  if (!context) {
    throw new Error('useCommunication must be used within CommunicationProvider');
  }
  return context;
}

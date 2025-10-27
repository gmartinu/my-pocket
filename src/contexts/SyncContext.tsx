import React, { createContext, useState, useContext, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export type SyncStatus = 'synced' | 'syncing' | 'error';

interface SyncContextData {
  syncStatus: SyncStatus;
  isOnline: boolean;
  setSyncStatus: (status: SyncStatus) => void;
  startSyncing: () => void;
  finishSyncing: () => void;
  syncError: (errorMessage?: string) => void;
  errorMessage: string | null;
}

const SyncContext = createContext<SyncContextData>({} as SyncContextData);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [isOnline, setIsOnline] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  const startSyncing = () => {
    setSyncStatus('syncing');
    setErrorMessage(null);
  };

  const finishSyncing = () => {
    setSyncStatus('synced');
    setErrorMessage(null);
  };

  const syncError = (errorMsg?: string) => {
    setSyncStatus('error');
    setErrorMessage(errorMsg || 'Error syncing data');
  };

  return (
    <SyncContext.Provider
      value={{
        syncStatus,
        isOnline,
        setSyncStatus,
        startSyncing,
        finishSyncing,
        syncError,
        errorMessage,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextData {
  const context = useContext(SyncContext);

  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }

  return context;
}

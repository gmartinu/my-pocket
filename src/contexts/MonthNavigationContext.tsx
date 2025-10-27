import React, { createContext, useState, useContext, useCallback } from 'react';
import {
  getCurrentMonthId,
  getNextMonthId,
  getPreviousMonthId,
} from '../utils/dateUtils';

// Month Navigation Context Data
export interface MonthNavigationContextData {
  currentMonthId: string;
  goToNextMonth: () => void;
  goToPreviousMonth: () => void;
  goToMonth: (monthId: string) => void;
}

// Create context
const MonthNavigationContext = createContext<MonthNavigationContextData>(
  {} as MonthNavigationContextData
);

// Provider component
export function MonthNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentMonthId, setCurrentMonthId] = useState(getCurrentMonthId());

  const goToNextMonth = useCallback(() => {
    setCurrentMonthId((prev) => getNextMonthId(prev));
  }, []);

  const goToPreviousMonth = useCallback(() => {
    setCurrentMonthId((prev) => getPreviousMonthId(prev));
  }, []);

  const goToMonth = useCallback((monthId: string) => {
    setCurrentMonthId(monthId);
  }, []);

  return (
    <MonthNavigationContext.Provider
      value={{
        currentMonthId,
        goToNextMonth,
        goToPreviousMonth,
        goToMonth,
      }}
    >
      {children}
    </MonthNavigationContext.Provider>
  );
}

// Hook to use month navigation context
export function useMonthNavigation(): MonthNavigationContextData {
  const context = useContext(MonthNavigationContext);

  if (!context) {
    throw new Error(
      'useMonthNavigation must be used within a MonthNavigationProvider'
    );
  }

  return context;
}

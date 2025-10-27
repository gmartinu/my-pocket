export type RecurrenceFrequency = 'mensal' | 'semanal' | 'quinzenal' | 'anual';

export interface RecurringExpenseConfig {
  isRecurring: boolean;
  frequency?: RecurrenceFrequency;
  startDate?: Date;
  endDate?: Date; // Optional - if not set, recurs indefinitely
}

export interface RecurrenceInfo {
  label: string;
  icon: string;
  description: string;
}

export const RECURRENCE_OPTIONS: { [key in RecurrenceFrequency]: RecurrenceInfo } = {
  mensal: {
    label: 'Mensal',
    icon: 'calendar-month',
    description: 'Repete todo mês',
  },
  semanal: {
    label: 'Semanal',
    icon: 'calendar-week',
    description: 'Repete toda semana',
  },
  quinzenal: {
    label: 'Quinzenal',
    icon: 'calendar-range',
    description: 'Repete a cada 15 dias',
  },
  anual: {
    label: 'Anual',
    icon: 'calendar',
    description: 'Repete todo ano',
  },
};

/**
 * Calculate the next occurrence date based on frequency
 */
export const getNextOccurrence = (
  currentDate: Date,
  frequency: RecurrenceFrequency
): Date => {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'semanal':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'quinzenal':
      nextDate.setDate(nextDate.getDate() + 15);
      break;
    case 'mensal':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'anual':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  return nextDate;
};

/**
 * Check if a recurring expense should be included in a given month
 */
export const shouldIncludeInMonth = (
  config: RecurringExpenseConfig,
  targetMonth: Date
): boolean => {
  if (!config.isRecurring || !config.startDate) return false;

  const start = new Date(config.startDate);
  const end = config.endDate ? new Date(config.endDate) : null;

  // Check if target month is before start date
  if (targetMonth < start) return false;

  // Check if target month is after end date
  if (end && targetMonth > end) return false;

  return true;
};

/**
 * Copy recurring expenses to a new month
 */
export const copyRecurringExpenses = (
  expenses: any[],
  targetMonth: Date
): any[] => {
  return expenses
    .filter((expense) => {
      const config = expense.recurring as RecurringExpenseConfig | undefined;
      return config && shouldIncludeInMonth(config, targetMonth);
    })
    .map((expense) => ({
      ...expense,
      pago: false, // Reset payment status for new month
      dataPagamento: null,
    }));
};

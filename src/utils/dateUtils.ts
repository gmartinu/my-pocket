/**
 * Get current month ID in YYYY-MM format
 */
export function getCurrentMonthId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Format month ID to readable name
 * @param monthId - Format: "YYYY-MM"
 * @returns Formatted name like "Outubro 2025"
 */
export function formatMonthName(monthId: string): string {
  const [year, month] = monthId.split('-').map(Number);
  const date = new Date(year, month - 1, 1);

  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Get next month ID
 */
export function getNextMonthId(currentMonthId: string): string {
  const [year, month] = currentMonthId.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

/**
 * Get previous month ID
 */
export function getPreviousMonthId(currentMonthId: string): string {
  const [year, month] = currentMonthId.split('-').map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

/**
 * Validate month ID format
 */
export function isValidMonthId(monthId: string): boolean {
  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(monthId)) return false;

  const [year, month] = monthId.split('-').map(Number);
  return year > 2000 && year < 3000 && month >= 1 && month <= 12;
}

/**
 * Get month and year from monthId
 */
export function parseMonthId(monthId: string): { year: number; month: number } {
  const [year, month] = monthId.split('-').map(Number);
  return { year, month };
}

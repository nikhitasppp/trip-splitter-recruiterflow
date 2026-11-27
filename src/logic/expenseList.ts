import type { Category, Expense, Member, Paise } from '../types';

/*
 * Helpers for the expenses table on the Expenses page.
 */

export const ALL_CATEGORIES = 'All';

export type CategoryFilter = Category | typeof ALL_CATEGORIES;

export function filterByCategory(expenses: Expense[], filter: CategoryFilter): Expense[] {
  if (filter === ALL_CATEGORIES) return expenses;
  return expenses.filter((expense) => expense.category === filter);
}

/** Newest date first. YYYY-MM-DD dates sort correctly as plain text. */
export function sortNewestFirst(expenses: Expense[]): Expense[] {
  return [...expenses].sort((a, b) => b.date.localeCompare(a.date));
}

export function sumAmounts(expenses: Expense[]): Paise {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

export function getMemberName(members: Member[], memberId: string): string {
  return members.find((member) => member.id === memberId)?.name ?? 'Unknown member';
}

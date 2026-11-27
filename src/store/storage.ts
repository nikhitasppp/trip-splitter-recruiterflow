import { sampleExpenses, sampleMembers } from '../data/sampleData';
import { isExpenseList } from '../logic/expenseGuards';
import type { Expense } from '../types';

export const EXPENSES_STORAGE_KEY = 'trip-splitter:expenses';

/** Saved expenses, or the sample data if nothing is saved or it can't be read. */
export function loadExpenses(): Expense[] {
  try {
    const saved = localStorage.getItem(EXPENSES_STORAGE_KEY);
    if (saved === null) return sampleExpenses;

    const parsed: unknown = JSON.parse(saved);
    // Members are fixed, so saved expenses are checked against the trip's five members.
    return isExpenseList(parsed, sampleMembers) ? parsed : sampleExpenses;
  } catch {
    // JSON.parse throws on broken text, and localStorage throws if storage is blocked.
    return sampleExpenses;
  }
}

export function saveExpenses(expenses: Expense[]): void {
  try {
    localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
  } catch (error) {
    // Storage can be full or blocked. The app keeps working; changes just won't survive a reload.
    console.warn('Could not save expenses to localStorage', error);
  }
}

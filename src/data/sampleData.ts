import { isExpenseList } from '../logic/expenseGuards';
import type { Expense, Member } from '../types';
import sampleData from './sample-data.json';

export const sampleMembers: Member[] = sampleData.members;

/**
 * TypeScript types a JSON import loosely (category is just `string`, not
 * Category), so the expenses go through the same runtime check as
 * localStorage data instead of an `as` cast.
 */
function readSampleExpenses(): Expense[] {
  const expenses: unknown = sampleData.expenses;
  if (!isExpenseList(expenses, sampleMembers)) {
    throw new Error('src/data/sample-data.json does not match the Expense type');
  }
  return expenses;
}

export const sampleExpenses: Expense[] = readSampleExpenses();

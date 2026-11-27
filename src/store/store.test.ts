import { describe, expect, it } from 'vitest';
import { sampleExpenses } from '../data/sampleData';
import type { NewExpense } from '../types';
import { EXPENSES_STORAGE_KEY, loadExpenses } from './storage';
import { createAppStore } from './store';
import { addExpense, deleteExpense } from './tripSlice';

const lunch: NewExpense = {
  description: 'Lunch',
  amount: 90000,
  paidBy: 'm2',
  date: '2026-03-16',
  category: 'Food',
  split: { type: 'equal', memberIds: ['m1', 'm2', 'm3'] },
};

describe('trip slice', () => {
  it('adds an expense with a new unique id', () => {
    const store = createAppStore();

    store.dispatch(addExpense(lunch));
    store.dispatch(addExpense(lunch));

    const added = store.getState().trip.expenses.slice(-2);
    expect(added[0]).toMatchObject(lunch);
    expect(added[0]?.id).toEqual(expect.any(String));
    expect(added[0]?.id).not.toBe(added[1]?.id);
  });

  it('deletes an expense by id', () => {
    const store = createAppStore();

    store.dispatch(deleteExpense('e1'));

    const ids = store.getState().trip.expenses.map((expense) => expense.id);
    expect(ids).toEqual(['e2', 'e3', 'e4', 'e5', 'e6']);
  });
});

describe('localStorage persistence', () => {
  it('starts from the sample data when nothing is saved', () => {
    expect(loadExpenses()).toEqual(sampleExpenses);
  });

  it('starts from the sample data when saved data is not valid JSON', () => {
    localStorage.setItem(EXPENSES_STORAGE_KEY, '{not json');

    expect(loadExpenses()).toEqual(sampleExpenses);
  });

  it('starts from the sample data when saved data has the wrong shape', () => {
    localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify([{ id: 'e1', amount: '12' }]));

    expect(loadExpenses()).toEqual(sampleExpenses);
  });

  it('starts from the sample data when a saved split does not add up', () => {
    const scubaWithBadShares = {
      id: 'e3',
      description: 'Scuba diving',
      amount: 1050000,
      paidBy: 'm3',
      date: '2026-03-13',
      category: 'Activities',
      // Adds up to ₹10,000, not ₹10,500: loading it would break the balances.
      split: { type: 'exact', shares: { m3: 350000, m4: 350000, m5: 300000 } },
    };
    localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify([scubaWithBadShares]));

    expect(loadExpenses()).toEqual(sampleExpenses);
  });

  it('keeps an empty list if the user deleted everything', () => {
    localStorage.setItem(EXPENSES_STORAGE_KEY, '[]');

    expect(loadExpenses()).toEqual([]);
  });

  it('keeps added and deleted expenses after a reload', () => {
    const firstVisit = createAppStore();
    firstVisit.dispatch(addExpense(lunch));
    firstVisit.dispatch(deleteExpense('e1'));

    // A new store reads localStorage again, like reloading the page.
    const afterReload = createAppStore();

    const descriptions = afterReload.getState().trip.expenses.map((expense) => expense.description);
    expect(descriptions).toContain('Lunch');
    expect(descriptions).not.toContain('Villa booking');
    expect(afterReload.getState().trip.expenses).toEqual(firstVisit.getState().trip.expenses);
  });
});

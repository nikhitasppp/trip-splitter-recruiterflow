import { describe, expect, it } from 'vitest';
import { sampleExpenses, sampleMembers } from '../data/sampleData';
import type { Expense, Paise } from '../types';
import { computeBalances, describeBalance } from './balances';

const members = sampleMembers;

function sumOfBalances(balances: Record<string, Paise>): Paise {
  return Object.values(balances).reduce((sum, balance) => sum + balance, 0);
}

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 'x1',
    description: 'Test expense',
    amount: 30000,
    paidBy: 'm1',
    date: '2026-03-12',
    category: 'Food',
    split: { type: 'equal', memberIds: ['m1', 'm2', 'm3'] },
    ...overrides,
  };
}

describe('computeBalances', () => {
  it('credits the payer with what they paid minus their own share', () => {
    const balances = computeBalances(members, [makeExpense({ amount: 30000, paidBy: 'm1' })]);

    // Aarav paid ₹300 and his share is ₹100, so he gets back ₹200.
    expect(balances.m1).toBe(20000);
  });

  it('charges each participant their share', () => {
    const balances = computeBalances(members, [makeExpense({ amount: 30000, paidBy: 'm1' })]);

    expect(balances.m2).toBe(-10000);
    expect(balances.m3).toBe(-10000);
  });

  it('handles a payer who is not part of the split', () => {
    // Meera buys ₹1,000 of groceries for Aarav, Diya and Kabir.
    const groceries = makeExpense({
      amount: 100000,
      paidBy: 'm4',
      split: { type: 'equal', memberIds: ['m1', 'm2', 'm3'] },
    });

    const balances = computeBalances(members, [groceries]);

    expect(balances).toEqual({ m1: -33334, m2: -33333, m3: -33333, m4: 100000, m5: 0 });
  });

  it('leaves members who are not involved settled up', () => {
    const balances = computeBalances(members, [makeExpense({})]);

    expect(balances.m4).toBe(0);
    expect(balances.m5).toBe(0);
  });

  it('settles up a member who paid exactly their share', () => {
    // Diya pays ₹500 for herself and Kabir; Kabir pays ₹500 for both of them.
    const balances = computeBalances(members, [
      makeExpense({ amount: 50000, paidBy: 'm2', split: { type: 'equal', memberIds: ['m2', 'm3'] } }),
      makeExpense({ amount: 50000, paidBy: 'm3', split: { type: 'equal', memberIds: ['m2', 'm3'] } }),
    ]);

    expect(balances.m2).toBe(0);
    expect(balances.m3).toBe(0);
  });

  it('works out the sample trip correctly', () => {
    expect(computeBalances(members, sampleExpenses)).toEqual({
      m1: 1855420, // Aarav gets back ₹18,554.20
      m2: -369578, // Diya owes ₹3,695.78
      m3: 55408, // Kabir gets back ₹554.08
      m4: -811250, // Meera owes ₹8,112.50
      m5: -730000, // Rohan owes ₹7,300.00
    });
  });

  it('gives everyone 0 when there are no expenses', () => {
    expect(computeBalances(members, [])).toEqual({ m1: 0, m2: 0, m3: 0, m4: 0, m5: 0 });
  });
});

describe('balances always add up to exactly ₹0', () => {
  it('for the sample data', () => {
    expect(sumOfBalances(computeBalances(members, sampleExpenses))).toBe(0);
  });

  it('for awkward amounts across all three split types', () => {
    const expenses: Expense[] = [
      makeExpense({ id: 'a', amount: 10000, paidBy: 'm1', split: { type: 'equal', memberIds: ['m1', 'm2', 'm3'] } }),
      makeExpense({ id: 'b', amount: 99999, paidBy: 'm2', split: { type: 'equal', memberIds: ['m1', 'm2', 'm3', 'm4', 'm5'] } }),
      makeExpense({ id: 'c', amount: 1, paidBy: 'm3', split: { type: 'equal', memberIds: ['m4', 'm5'] } }),
      makeExpense({ id: 'd', amount: 12345, paidBy: 'm4', split: { type: 'percent', shares: { m1: 33.33, m2: 33.33, m5: 33.34 } } }),
      makeExpense({ id: 'e', amount: 70001, paidBy: 'm5', split: { type: 'percent', shares: { m2: 12.5, m3: 87.5 } } }),
      makeExpense({ id: 'f', amount: 25050, paidBy: 'm1', split: { type: 'exact', shares: { m2: 25000, m4: 50 } } }),
    ];

    expect(sumOfBalances(computeBalances(members, expenses))).toBe(0);
  });

  it('after an expense is removed', () => {
    const withoutVilla = sampleExpenses.filter((expense) => expense.id !== 'e1');

    expect(sumOfBalances(computeBalances(members, withoutVilla))).toBe(0);
  });
});

describe('describeBalance', () => {
  it('describes positive, negative and zero balances', () => {
    expect(describeBalance(1855420)).toBe('gets back ₹18,554.20');
    expect(describeBalance(-369578)).toBe('owes ₹3,695.78');
    expect(describeBalance(0)).toBe('settled up');
  });
});

import { describe, expect, it } from 'vitest';
import { sampleExpenses, sampleMembers } from '../data/sampleData';
import { isExpenseList } from './expenseGuards';

/** A valid saved expense. Each test below breaks exactly one thing about it. */
const valid = {
  id: 'x1',
  description: 'Lunch',
  amount: 90000,
  paidBy: 'm2',
  date: '2026-03-16',
  category: 'Food',
  split: { type: 'equal', memberIds: ['m1', 'm2', 'm3'] },
};

function accepts(savedExpenses: unknown): boolean {
  return isExpenseList(savedExpenses, sampleMembers);
}

describe('isExpenseList: valid data', () => {
  it('accepts the sample data', () => {
    expect(accepts(sampleExpenses)).toBe(true);
  });

  it('accepts valid equal, exact and percentage splits', () => {
    expect(
      accepts([
        valid,
        { ...valid, id: 'x2', split: { type: 'exact', shares: { m1: 30000, m2: 60000 } } },
        { ...valid, id: 'x3', split: { type: 'percent', shares: { m1: 33.33, m2: 33.33, m3: 33.34 } } },
      ]),
    ).toBe(true);
  });

  it('accepts an empty list (the user deleted everything)', () => {
    expect(accepts([])).toBe(true);
  });
});

describe('isExpenseList: invalid amounts', () => {
  it.each([
    ['a negative amount', { ...valid, amount: -90000 }],
    ['a zero amount', { ...valid, amount: 0 }],
    ['fractions of a paisa', { ...valid, amount: 900.5 }],
    ['an amount saved as text', { ...valid, amount: '90000' }],
    ['an amount over ₹10,00,000', { ...valid, amount: 100_000_001 }],
  ])('rejects %s', (_label, expense) => {
    expect(accepts([expense])).toBe(false);
  });
});

describe('isExpenseList: invalid exact splits (amount ₹900)', () => {
  const exact = (shares: Record<string, unknown>) => ({ ...valid, split: { type: 'exact', shares } });

  it.each([
    ['shares that add up to less than the amount', exact({ m1: 30000, m2: 50000 })],
    ['shares that add up to more than the amount', exact({ m1: 30000, m2: 70000 })],
    ['a negative share, even if the total matches', exact({ m1: 100000, m2: -10000 })],
    ['a share with fractions of a paisa', exact({ m1: 30000.5, m2: 59999.5 })],
    ['a share for someone not on the trip', exact({ m1: 30000, m9: 60000 })],
    ['a share saved as text', exact({ m1: '30000', m2: 60000 })],
  ])('rejects %s', (_label, expense) => {
    expect(accepts([expense])).toBe(false);
  });
});

describe('isExpenseList: invalid percentage splits', () => {
  const percent = (shares: Record<string, unknown>) => ({ ...valid, split: { type: 'percent', shares } });

  it.each([
    ['a total of 99.99%', percent({ m1: 33.33, m2: 33.33, m3: 33.33 })],
    ['a total of 100.01%', percent({ m1: 50, m2: 50.01 })],
    ['more than 2 decimals', percent({ m1: 33.333, m2: 66.667 })],
    ['a share over 100% balanced by a negative one', percent({ m1: 150, m2: -50 })],
    ['a share for someone not on the trip', percent({ m1: 50, m9: 50 })],
  ])('rejects %s', (_label, expense) => {
    expect(accepts([expense])).toBe(false);
  });
});

describe('isExpenseList: invalid equal splits', () => {
  const equal = (memberIds: unknown[]) => ({ ...valid, split: { type: 'equal', memberIds } });

  it.each([
    ['the same member twice', equal(['m1', 'm1', 'm2'])],
    ['someone not on the trip', equal(['m1', 'm9'])],
    ['nobody at all', equal([])],
  ])('rejects %s', (_label, expense) => {
    expect(accepts([expense])).toBe(false);
  });
});

describe('isExpenseList: invalid fields', () => {
  it.each([
    ['a payer not on the trip', { ...valid, paidBy: 'm9' }],
    ['a date in the wrong format', { ...valid, date: '16-03-2026' }],
    ['a date that does not exist', { ...valid, date: '2026-02-30' }],
    ['a blank description', { ...valid, description: '   ' }],
    ['an empty id', { ...valid, id: '' }],
    ['an unknown category', { ...valid, category: 'Shopping' }],
    ['an unknown split type', { ...valid, split: { type: 'shares', shares: { m1: 1 } } }],
  ])('rejects %s', (_label, expense) => {
    expect(accepts([expense])).toBe(false);
  });
});

describe('isExpenseList: the list as a whole', () => {
  it('rejects two expenses with the same id', () => {
    expect(accepts([valid, { ...valid, description: 'Dinner' }])).toBe(false);
  });

  it('rejects the whole list when one expense is invalid', () => {
    expect(accepts([valid, { ...valid, id: 'x2', amount: -1 }])).toBe(false);
  });

  it('rejects anything that is not a list', () => {
    expect(accepts(valid)).toBe(false);
    expect(accepts(null)).toBe(false);
  });
});

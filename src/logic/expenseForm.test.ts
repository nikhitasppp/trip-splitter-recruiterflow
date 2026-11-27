import { describe, expect, it } from 'vitest';
import { sampleMembers } from '../data/sampleData';
import {
  createEmptyFormValues,
  validateExpenseForm,
  type ExpenseFormErrors,
  type ExpenseFormValues,
} from './expenseForm';

const members = sampleMembers;
const TODAY = '2026-03-20';

/** A form that passes every rule; each test changes only what it is testing. */
function validValues(overrides: Partial<ExpenseFormValues> = {}): ExpenseFormValues {
  return {
    ...createEmptyFormValues(members),
    description: 'Lunch at the fort',
    amount: '1250.50',
    paidBy: 'm1',
    date: '2026-03-16',
    category: 'Food',
    ...overrides,
  };
}

function errorsFor(values: ExpenseFormValues): ExpenseFormErrors {
  const result = validateExpenseForm(values, members, TODAY);
  return result.ok ? {} : result.errors;
}

describe('validateExpenseForm', () => {
  it('turns a valid form into an expense with the amount in paise', () => {
    const result = validateExpenseForm(validValues(), members, TODAY);

    expect(result).toEqual({
      ok: true,
      expense: {
        description: 'Lunch at the fort',
        amount: 125050,
        paidBy: 'm1',
        date: '2026-03-16',
        category: 'Food',
        split: { type: 'equal', memberIds: ['m1', 'm2', 'm3', 'm4', 'm5'] },
      },
    });
  });

  it('reports every broken rule at once for an empty form', () => {
    expect(errorsFor(createEmptyFormValues(members))).toEqual({
      description: 'Description is required',
      amount: 'Amount is required',
      paidBy: 'Choose who paid',
      date: 'Date is required',
      category: 'Choose a category',
    });
  });

  describe('description', () => {
    it('trims spaces and treats spaces alone as empty', () => {
      expect(errorsFor(validValues({ description: '   ' })).description).toBe(
        'Description is required',
      );
    });

    it('allows 60 characters but not 61', () => {
      expect(errorsFor(validValues({ description: 'a'.repeat(60) })).description).toBeUndefined();
      expect(errorsFor(validValues({ description: 'a'.repeat(61) })).description).toBe(
        'Description must be 60 characters or fewer',
      );
    });
  });

  describe('amount', () => {
    it('shows the required message for a negative amount', () => {
      expect(errorsFor(validValues({ amount: '-50' })).amount).toBe('Amount must be more than ₹0');
    });

    it('rejects zero', () => {
      expect(errorsFor(validValues({ amount: '0.00' })).amount).toBe('Amount must be more than ₹0');
    });

    it('allows exactly ₹10,00,000 but nothing more', () => {
      expect(errorsFor(validValues({ amount: '1000000' })).amount).toBeUndefined();
      expect(errorsFor(validValues({ amount: '1000000.01' })).amount).toBe(
        'Amount must be at most ₹10,00,000.00',
      );
    });

    it('rejects more than two decimal places and non-numbers', () => {
      expect(errorsFor(validValues({ amount: '10.505' })).amount).toBe(
        'Amount can have at most 2 decimal places',
      );
      expect(errorsFor(validValues({ amount: 'ten' })).amount).toBe('Enter an amount like 1250.50');
    });
  });

  describe('date', () => {
    it('rejects a date that does not exist', () => {
      expect(errorsFor(validValues({ date: '2026-02-30' })).date).toBe('Enter a valid date');
    });

    it('allows today but not a future date', () => {
      expect(errorsFor(validValues({ date: TODAY })).date).toBeUndefined();
      expect(errorsFor(validValues({ date: '2026-03-21' })).date).toBe(
        'Date cannot be in the future',
      );
    });
  });

  describe('equal split', () => {
    it('needs at least one member', () => {
      expect(errorsFor(validValues({ equalMemberIds: [] })).split).toBe(
        'Select at least one member',
      );
    });

    it('saves members in trip order, whatever order they were ticked in', () => {
      const result = validateExpenseForm(validValues({ equalMemberIds: ['m3', 'm1'] }), members, TODAY);

      expect(result.ok && result.expense.split).toEqual({ type: 'equal', memberIds: ['m1', 'm3'] });
    });
  });

  describe('exact split', () => {
    const exact = (exactAmounts: Record<string, string>) =>
      validValues({ splitType: 'exact', exactAmounts });

    it('saves each member’s amount in paise and skips blank members', () => {
      const result = validateExpenseForm(
        exact({ m1: '600.25', m2: '650.25', m3: '' }),
        members,
        TODAY,
      );

      expect(result.ok && result.expense.split).toEqual({
        type: 'exact',
        shares: { m1: 60025, m2: 65025 },
      });
    });

    it('shows how much is left to assign', () => {
      expect(errorsFor(exact({ m1: '500', m2: '738' })).split).toBe('₹12.50 left to assign');
    });

    it('shows how much is over', () => {
      expect(errorsFor(exact({ m1: '500', m2: '800' })).split).toBe(
        '₹49.50 over the expense amount',
      );
    });

    it('rejects a negative amount for a member', () => {
      expect(errorsFor(exact({ m1: '1300', m2: '-49.50' })).memberShares).toEqual({
        m2: 'Must be ₹0 or more',
      });
    });

    it('does not compare totals while the expense amount itself is invalid', () => {
      const errors = errorsFor(validValues({ amount: '', splitType: 'exact', exactAmounts: { m1: '5' } }));

      expect(errors.amount).toBe('Amount is required');
      expect(errors.split).toBeUndefined();
    });
  });

  describe('percentage split', () => {
    const percent = (percentages: Record<string, string>) =>
      validValues({ splitType: 'percent', percentages });

    it('saves percentages (not paise) for each member', () => {
      const result = validateExpenseForm(
        percent({ m1: '33.33', m2: '33.33', m3: '33.34' }),
        members,
        TODAY,
      );

      expect(result.ok && result.expense.split).toEqual({
        type: 'percent',
        shares: { m1: 33.33, m2: 33.33, m3: 33.34 },
      });
    });

    it('requires the total to be exactly 100', () => {
      expect(errorsFor(percent({ m1: '50', m2: '40' })).split).toBe(
        'Percentages must add up to 100% (now 90%)',
      );
      expect(errorsFor(percent({ m1: '50', m2: '50.01' })).split).toBe(
        'Percentages must add up to 100% (now 100.01%)',
      );
    });

    it('requires each percentage to be between 0 and 100 with up to 2 decimals', () => {
      expect(errorsFor(percent({ m1: '120', m2: '-20', m3: '33.333' })).memberShares).toEqual({
        m1: 'Must be between 0 and 100',
        m2: 'Must be between 0 and 100',
        m3: 'Use at most 2 decimal places',
      });
    });
  });
});

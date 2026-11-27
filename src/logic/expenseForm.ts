import {
  isCategory,
  type Category,
  type Member,
  type NewExpense,
  type Paise,
  type Split,
  type SplitType,
} from '../types';
import { isIsoDate } from './dates';
import { formatRupees, parseHundredths, parseRupeesToPaise, type NumberInputError } from './money';

export const MAX_DESCRIPTION_LENGTH = 60;

/** ₹10,00,000 in paise. */
export const MAX_AMOUNT: Paise = 100_000_000;

/** 100% in hundredths of a percent. */
export const ONE_HUNDRED_PERCENT = 10_000;

/** What the user has typed. Everything stays text until validation turns it into an expense. */
export interface ExpenseFormValues {
  description: string;
  amount: string;
  paidBy: string;
  date: string;
  category: string;
  splitType: SplitType;
  /** Members ticked for an equal split. */
  equalMemberIds: string[];
  /** Rupee text for each member id, for an exact split. */
  exactAmounts: Record<string, string>;
  /** Percentage text for each member id, for a percentage split. */
  percentages: Record<string, string>;
}

/** One message per field that breaks a rule. A missing key means the field is fine. */
export interface ExpenseFormErrors {
  description?: string;
  amount?: string;
  paidBy?: string;
  date?: string;
  category?: string;
  /** A problem with the split as a whole, e.g. "₹12.50 left to assign". */
  split?: string;
  /** A problem with one member's amount or percentage, keyed by member id. */
  memberShares?: Record<string, string>;
}

export type ExpenseFormResult =
  | { ok: true; expense: NewExpense }
  | { ok: false; errors: ExpenseFormErrors };

/** Either the checked value, or why it's wrong. */
type FieldResult<T> = { ok: true; value: T } | { ok: false; error: string };

type SplitResult =
  | { ok: true; value: Split }
  | { ok: false; errors: Pick<ExpenseFormErrors, 'split' | 'memberShares'> };

export function createEmptyFormValues(members: Member[]): ExpenseFormValues {
  return {
    description: '',
    amount: '',
    paidBy: '',
    date: '',
    category: '',
    splitType: 'equal',
    equalMemberIds: members.map((member) => member.id),
    exactAmounts: {},
    percentages: {},
  };
}

/**
 * Checks every field at once. Returns either an expense that is ready to
 * save (money in paise), or an error message for every field that breaks a rule.
 */
export function validateExpenseForm(
  values: ExpenseFormValues,
  members: Member[],
  today: string,
): ExpenseFormResult {
  const description = validateDescription(values.description);
  const amount = validateAmount(values.amount);
  const paidBy = validatePaidBy(values.paidBy, members);
  const date = validateDate(values.date, today);
  const category = validateCategory(values.category);
  const split = validateSplit(values, members, amount.ok ? amount.value : null);

  if (description.ok && amount.ok && paidBy.ok && date.ok && category.ok && split.ok) {
    return {
      ok: true,
      expense: {
        description: description.value,
        amount: amount.value,
        paidBy: paidBy.value,
        date: date.value,
        category: category.value,
        split: split.value,
      },
    };
  }

  return {
    ok: false,
    errors: {
      description: errorOf(description),
      amount: errorOf(amount),
      paidBy: errorOf(paidBy),
      date: errorOf(date),
      category: errorOf(category),
      ...(split.ok ? {} : split.errors),
    },
  };
}

function errorOf<T>(result: FieldResult<T>): string | undefined {
  return result.ok ? undefined : result.error;
}

/* ---------- Basic fields ---------- */

function validateDescription(text: string): FieldResult<string> {
  const description = text.trim();
  if (description === '') return { ok: false, error: 'Description is required' };
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`,
    };
  }
  return { ok: true, value: description };
}

const AMOUNT_ERRORS: Record<NumberInputError, string> = {
  empty: 'Amount is required',
  invalid: 'Enter an amount like 1250.50',
  negative: 'Amount must be more than ₹0',
  'too-many-decimals': 'Amount can have at most 2 decimal places',
};

function validateAmount(text: string): FieldResult<Paise> {
  const result = parseRupeesToPaise(text);
  if (!result.ok) return { ok: false, error: AMOUNT_ERRORS[result.error] };
  if (result.paise === 0) return { ok: false, error: 'Amount must be more than ₹0' };
  if (result.paise > MAX_AMOUNT) {
    return { ok: false, error: `Amount must be at most ${formatRupees(MAX_AMOUNT)}` };
  }
  return { ok: true, value: result.paise };
}

function validatePaidBy(memberId: string, members: Member[]): FieldResult<string> {
  if (!members.some((member) => member.id === memberId)) {
    return { ok: false, error: 'Choose who paid' };
  }
  return { ok: true, value: memberId };
}

function validateDate(date: string, today: string): FieldResult<string> {
  if (date === '') return { ok: false, error: 'Date is required' };
  if (!isIsoDate(date)) return { ok: false, error: 'Enter a valid date' };
  // YYYY-MM-DD dates compare correctly as plain text.
  if (date > today) return { ok: false, error: 'Date cannot be in the future' };
  return { ok: true, value: date };
}

function validateCategory(category: string): FieldResult<Category> {
  if (!isCategory(category)) return { ok: false, error: 'Choose a category' };
  return { ok: true, value: category };
}

/* ---------- Split ---------- */

function validateSplit(
  values: ExpenseFormValues,
  members: Member[],
  amount: Paise | null,
): SplitResult {
  switch (values.splitType) {
    case 'equal':
      return validateEqualSplit(values.equalMemberIds, members);
    case 'exact':
      return validateExactSplit(values.exactAmounts, members, amount);
    case 'percent':
      return validatePercentSplit(values.percentages, members);
  }
}

function validateEqualSplit(selectedIds: string[], members: Member[]): SplitResult {
  // Saved in the trip's member order, so who gets an extra paisa is predictable.
  const memberIds = members
    .filter((member) => selectedIds.includes(member.id))
    .map((member) => member.id);

  if (memberIds.length === 0) {
    return { ok: false, errors: { split: 'Select at least one member' } };
  }
  return { ok: true, value: { type: 'equal', memberIds } };
}

const EXACT_AMOUNT_ERRORS: Record<NumberInputError, string> = {
  empty: 'Enter an amount',
  invalid: 'Enter an amount like 250.50',
  negative: 'Must be ₹0 or more',
  'too-many-decimals': 'Use at most 2 decimal places',
};

function validateExactSplit(
  texts: Record<string, string>,
  members: Member[],
  amount: Paise | null,
): SplitResult {
  const { values: shares, errors } = readMemberInputs(texts, members, EXACT_AMOUNT_ERRORS);
  if (Object.keys(errors).length > 0) return { ok: false, errors: { memberShares: errors } };

  // Without a valid amount there is nothing to compare against;
  // the amount field already shows its own error.
  if (amount === null) return { ok: false, errors: {} };

  const assigned = sumValues(shares);
  if (assigned < amount) {
    return { ok: false, errors: { split: `${formatRupees(amount - assigned)} left to assign` } };
  }
  if (assigned > amount) {
    return {
      ok: false,
      errors: { split: `${formatRupees(assigned - amount)} over the expense amount` },
    };
  }
  return { ok: true, value: { type: 'exact', shares } };
}

const PERCENTAGE_ERRORS: Record<NumberInputError, string> = {
  empty: 'Enter a percentage',
  invalid: 'Enter a percentage like 33.33',
  negative: 'Must be between 0 and 100',
  'too-many-decimals': 'Use at most 2 decimal places',
};

function validatePercentSplit(texts: Record<string, string>, members: Member[]): SplitResult {
  // Read as hundredths of a percent (33.33% → 3333) so the total is exact.
  const { values: hundredths, errors } = readMemberInputs(texts, members, PERCENTAGE_ERRORS);
  for (const [memberId, value] of Object.entries(hundredths)) {
    if (value > ONE_HUNDRED_PERCENT) errors[memberId] = 'Must be between 0 and 100';
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors: { memberShares: errors } };

  const total = sumValues(hundredths);
  if (total !== ONE_HUNDRED_PERCENT) {
    return {
      ok: false,
      errors: { split: `Percentages must add up to 100% (now ${total / 100}%)` },
    };
  }

  // Saved as percentages (33.33), not hundredths, to match the data format.
  const shares = Object.fromEntries(
    Object.entries(hundredths).map(([memberId, value]) => [memberId, value / 100]),
  );
  return { ok: true, value: { type: 'percent', shares } };
}

/**
 * Reads the per-member boxes of an exact or percentage split as whole
 * hundredths (paise, or hundredths of a percent), in member order.
 * A blank box or 0 means that member isn't part of the split.
 */
function readMemberInputs(
  texts: Record<string, string>,
  members: Member[],
  messages: Record<NumberInputError, string>,
): { values: Record<string, number>; errors: Record<string, string> } {
  const values: Record<string, number> = {};
  const errors: Record<string, string> = {};

  for (const member of members) {
    const text = texts[member.id] ?? '';
    if (text.trim() === '') continue;

    const result = parseHundredths(text);
    if (!result.ok) {
      errors[member.id] = messages[result.error];
    } else if (result.hundredths > 0) {
      values[member.id] = result.hundredths;
    }
  }

  return { values, errors };
}

function sumValues(record: Record<string, number>): number {
  return Object.values(record).reduce((sum, value) => sum + value, 0);
}

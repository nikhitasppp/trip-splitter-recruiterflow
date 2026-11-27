import { isCategory, type Expense, type Member, type Paise, type Split } from '../types';
import { isIsoDate } from './dates';
import { MAX_AMOUNT, ONE_HUNDRED_PERCENT } from './expenseForm';

/*
 * Runtime checks for data the compiler can't see: JSON from localStorage and
 * the sample-data.json import. They check the shape AND the money rules, so a
 * saved expense can't break a balance (for example exact shares that don't
 * add up). If any expense fails, the whole list is rejected and the app
 * starts from the sample data.
 */

export function isExpenseList(value: unknown, members: Member[]): value is Expense[] {
  if (!Array.isArray(value)) return false;

  const memberIds = new Set(members.map((member) => member.id));
  const expenseIds = new Set<string>();

  for (const item of value) {
    if (!isExpense(item, memberIds)) return false;
    // Ids must be unique: React uses them as keys and delete removes by id.
    if (expenseIds.has(item.id)) return false;
    expenseIds.add(item.id);
  }
  return true;
}

function isExpense(value: unknown, memberIds: Set<string>): value is Expense {
  return (
    isObject(value) &&
    isFilledString(value.id) &&
    isFilledString(value.description) &&
    isWholePaise(value.amount) &&
    value.amount > 0 &&
    value.amount <= MAX_AMOUNT &&
    typeof value.paidBy === 'string' &&
    memberIds.has(value.paidBy) &&
    typeof value.date === 'string' &&
    isIsoDate(value.date) &&
    typeof value.category === 'string' &&
    isCategory(value.category) &&
    isValidSplit(value.split, value.amount, memberIds)
  );
}

function isValidSplit(split: unknown, amount: Paise, memberIds: Set<string>): split is Split {
  if (!isObject(split)) return false;

  switch (split.type) {
    case 'equal':
      return isValidEqualMembers(split.memberIds, memberIds);
    case 'exact':
      return isValidExactShares(split.shares, amount, memberIds);
    case 'percent':
      return isValidPercentShares(split.shares, memberIds);
    default:
      return false;
  }
}

/** At least one member, every id a trip member, no id twice. */
function isValidEqualMembers(value: unknown, memberIds: Set<string>): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((id) => typeof id === 'string' && memberIds.has(id)) &&
    new Set(value).size === value.length
  );
}

/** Whole paise (0 or more) for trip members only, adding up to exactly the amount. */
function isValidExactShares(value: unknown, amount: Paise, memberIds: Set<string>): boolean {
  if (!isObject(value)) return false;

  let total = 0;
  for (const [memberId, share] of Object.entries(value)) {
    if (!memberIds.has(memberId) || !isWholePaise(share)) return false;
    total += share;
  }
  return total === amount;
}

/** Percentages from 0 to 100 with at most 2 decimals, for trip members only, adding up to exactly 100. */
function isValidPercentShares(value: unknown, memberIds: Set<string>): boolean {
  if (!isObject(value)) return false;

  let totalHundredths = 0;
  for (const [memberId, percent] of Object.entries(value)) {
    const hundredths = toHundredths(percent);
    if (!memberIds.has(memberId) || hundredths === null || hundredths > ONE_HUNDRED_PERCENT) {
      return false;
    }
    totalHundredths += hundredths;
  }
  return totalHundredths === ONE_HUNDRED_PERCENT;
}

/* ---------- Small building blocks ---------- */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFilledString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/** A whole number of paise, 0 or more, small enough to add up exactly. */
function isWholePaise(value: unknown): value is Paise {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/**
 * 33.33 → 3333 hundredths. Returns null for anything that isn't a number of
 * 0 or more with at most 2 decimals: 33.333 → 3333 → 33.33, which doesn't
 * match the original, so it's rejected.
 */
function toHundredths(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const hundredths = Math.round(value * 100);
  return hundredths / 100 === value ? hundredths : null;
}

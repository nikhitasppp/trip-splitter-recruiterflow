import type { Expense, Member, Paise } from '../types';
import { formatRupees } from './money';
import { calculateShares } from './splits';

/**
 * Balance = what a member paid − their share of every expense they're part of.
 * Positive: they get money back. Negative: they owe. Across all members the
 * balances always add up to exactly 0.
 */
export function computeBalances(members: Member[], expenses: Expense[]): Record<string, Paise> {
  const balances: Record<string, Paise> = {};
  for (const member of members) {
    balances[member.id] = 0;
  }

  for (const expense of expenses) {
    balances[expense.paidBy] = (balances[expense.paidBy] ?? 0) + expense.amount;

    const shares = calculateShares(expense.amount, expense.split);
    for (const [memberId, share] of Object.entries(shares)) {
      balances[memberId] = (balances[memberId] ?? 0) - share;
    }
  }

  return balances;
}

export type BalanceStatus = 'gets-back' | 'owes' | 'settled-up';

export function getBalanceStatus(balance: Paise): BalanceStatus {
  if (balance > 0) return 'gets-back';
  if (balance < 0) return 'owes';
  return 'settled-up';
}

/** 1855420 → "gets back ₹18,554.20", -369578 → "owes ₹3,695.78", 0 → "settled up". */
export function describeBalance(balance: Paise): string {
  switch (getBalanceStatus(balance)) {
    case 'gets-back':
      return `gets back ${formatRupees(balance)}`;
    case 'owes':
      return `owes ${formatRupees(-balance)}`;
    case 'settled-up':
      return 'settled up';
  }
}

import type { Member, Paise } from '../types';
import { getMemberName } from './expenseList';
import { formatRupees } from './money';

/**
 * A suggested payment: `from` pays `to`. Suggestions are worked out from the
 * balances every time; they are never stored or marked as paid.
 */
export interface Payment {
  from: string;
  to: string;
  amount: Paise;
}

/**
 * Suggests payments that bring every balance to ₹0. It takes the overall
 * balances from computeBalances, which already include every expense's
 * shares, so payments are never worked out from one expense on its own.
 *
 * A simple greedy rule: the people who owe are taken from the largest debt
 * down, and each one pays the people who are owed, from the largest amount
 * down, until their debt is cleared. Every payment settles at least one
 * person, so there are never more than (members − 1) payments.
 */
export function suggestSettlements(balances: Record<string, Paise>): Payment[] {
  const entries = Object.entries(balances);
  const creditors = entries
    .filter(([, balance]) => balance > 0)
    .map(([memberId, balance]) => ({ memberId, remaining: balance }))
    .sort((a, b) => b.remaining - a.remaining);
  const debtors = entries
    .filter(([, balance]) => balance < 0)
    .map(([memberId, balance]) => ({ memberId, remaining: -balance }))
    .sort((a, b) => b.remaining - a.remaining);

  const payments: Payment[] = [];
  let creditorIndex = 0;

  for (const debtor of debtors) {
    while (debtor.remaining > 0) {
      const creditor = creditors[creditorIndex];
      if (creditor === undefined) break; // only if the balances don't add up to ₹0

      const amount = Math.min(debtor.remaining, creditor.remaining);
      payments.push({ from: debtor.memberId, to: creditor.memberId, amount });
      debtor.remaining -= amount;
      creditor.remaining -= amount;
      if (creditor.remaining === 0) creditorIndex += 1;
    }
  }

  return payments;
}

/** The suggested payments one member makes or receives. */
export function paymentsFor(payments: Payment[], memberId: string): Payment[] {
  return payments.filter((payment) => payment.from === memberId || payment.to === memberId);
}

/** From one member's point of view: "Pays Aarav — ₹3,141.70" or "Receives from Meera — ₹8,112.50". */
export function describePayment(payment: Payment, memberId: string, members: Member[]): string {
  const amount = formatRupees(payment.amount);
  return payment.from === memberId
    ? `Pays ${getMemberName(members, payment.to)} — ${amount}`
    : `Receives from ${getMemberName(members, payment.from)} — ${amount}`;
}

import { describe, expect, it } from 'vitest';
import { sampleExpenses, sampleMembers } from '../data/sampleData';
import type { Paise } from '../types';
import { computeBalances } from './balances';
import { describePayment, paymentsFor, suggestSettlements, type Payment } from './settlements';

const sampleBalances = computeBalances(sampleMembers, sampleExpenses);

/** Applies the payments to the balances: the payer goes up, the receiver goes down. */
function applyPayments(balances: Record<string, Paise>, payments: Payment[]): Record<string, Paise> {
  const result = { ...balances };
  for (const { from, to, amount } of payments) {
    result[from] = (result[from] ?? 0) + amount;
    result[to] = (result[to] ?? 0) - amount;
  }
  return result;
}

describe('suggestSettlements', () => {
  it('suggests the sample trip payments, largest debt first', () => {
    expect(suggestSettlements(sampleBalances)).toEqual([
      { from: 'm4', to: 'm1', amount: 811250 }, // Meera pays Aarav ₹8,112.50
      { from: 'm5', to: 'm1', amount: 730000 }, // Rohan pays Aarav ₹7,300.00
      { from: 'm2', to: 'm1', amount: 314170 }, // Diya pays Aarav ₹3,141.70
      { from: 'm2', to: 'm3', amount: 55408 }, // Diya pays Kabir ₹554.08
    ]);
  });

  it('brings everyone to exactly ₹0 with positive whole-paise payments', () => {
    const balanceSets: Record<string, Paise>[] = [
      sampleBalances,
      { m1: 300, m2: -100, m3: -100, m4: -100, m5: 0 },
      { m1: -1, m2: -1, m3: -1, m4: 1, m5: 2 },
      { m1: 99999, m2: -33333, m3: -33333, m4: -33333, m5: 0 },
      { m1: 5000, m2: 7001, m3: -12001, m4: 1, m5: -1 },
    ];

    for (const balances of balanceSets) {
      const payments = suggestSettlements(balances);
      const settled = applyPayments(balances, payments);

      expect(Object.values(settled).every((balance) => balance === 0)).toBe(true);
      expect(payments.every(({ amount }) => Number.isSafeInteger(amount) && amount > 0)).toBe(true);
      expect(payments.length).toBeLessThanOrEqual(Object.keys(balances).length - 1);
    }
  });

  it("adds up to each member's overall balance (payments come from the balances, not single expenses)", () => {
    const payments = suggestSettlements(sampleBalances);

    for (const member of sampleMembers) {
      const received = payments
        .filter((payment) => payment.to === member.id)
        .reduce((sum, payment) => sum + payment.amount, 0);
      const paid = payments
        .filter((payment) => payment.from === member.id)
        .reduce((sum, payment) => sum + payment.amount, 0);

      expect(received - paid).toBe(sampleBalances[member.id]);
    }
  });

  it('suggests nothing when everyone is settled up', () => {
    expect(suggestSettlements({ m1: 0, m2: 0, m3: 0 })).toEqual([]);
  });

  it('never involves a member who is already settled', () => {
    const payments = suggestSettlements({ m1: 500, m2: -500, m3: 0 });

    expect(payments).toEqual([{ from: 'm2', to: 'm1', amount: 500 }]);
  });
});

describe('paymentsFor and describePayment', () => {
  const payments = suggestSettlements(sampleBalances);

  it('lists what someone owes, from their point of view', () => {
    const diyas = paymentsFor(payments, 'm2').map((payment) =>
      describePayment(payment, 'm2', sampleMembers),
    );

    expect(diyas).toEqual(['Pays Aarav — ₹3,141.70', 'Pays Kabir — ₹554.08']);
  });

  it('lists what someone gets back, from their point of view', () => {
    const aaravs = paymentsFor(payments, 'm1').map((payment) =>
      describePayment(payment, 'm1', sampleMembers),
    );

    expect(aaravs).toEqual([
      'Receives from Meera — ₹8,112.50',
      'Receives from Rohan — ₹7,300.00',
      'Receives from Diya — ₹3,141.70',
    ]);
  });
});

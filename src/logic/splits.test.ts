import { describe, expect, it } from 'vitest';
import type { Paise, Split } from '../types';
import { sampleMembers } from '../data/sampleData';
import {
  calculateShares,
  describeShare,
  describeSplit,
  listShares,
  splitByPercentages,
  splitEqually,
} from './splits';

function total(shares: Record<string, Paise>): Paise {
  return Object.values(shares).reduce((sum, share) => sum + share, 0);
}

describe('splitEqually', () => {
  it('splits ₹100 between three members as ₹33.34 + ₹33.33 + ₹33.33', () => {
    const shares = splitEqually(10000, ['m1', 'm2', 'm3']);

    expect(shares).toEqual({ m1: 3334, m2: 3333, m3: 3333 });
    expect(total(shares)).toBe(10000);
  });

  it('gives the extra paise to members in the order they are listed', () => {
    expect(splitEqually(10000, ['m3', 'm1', 'm2'])).toEqual({ m3: 3334, m1: 3333, m2: 3333 });
    // ₹100.02 between four: 2 leftover paise go to the first two members.
    expect(splitEqually(10002, ['m1', 'm2', 'm3', 'm4'])).toEqual({
      m1: 2501,
      m2: 2501,
      m3: 2500,
      m4: 2500,
    });
  });

  it('splits evenly when the amount divides exactly', () => {
    expect(splitEqually(325000, ['m1', 'm2', 'm3', 'm4'])).toEqual({
      m1: 81250,
      m2: 81250,
      m3: 81250,
      m4: 81250,
    });
  });

  it('gives the whole amount to a single member', () => {
    expect(splitEqually(149999, ['m2'])).toEqual({ m2: 149999 });
  });
});

describe('splitByPercentages', () => {
  it('splits round percentages exactly', () => {
    expect(splitByPercentages(200000, { m5: 50, m1: 25, m2: 25 })).toEqual({
      m5: 100000,
      m1: 50000,
      m2: 50000,
    });
  });

  it('rounds down and hands out leftover paise in order (Airport cab sample)', () => {
    // ₹1,499.99 × 33.33% = 49994.67 paise, so each share is rounded down and
    // the 2 leftover paise go to m1 and m2.
    const shares = splitByPercentages(149999, { m1: 33.33, m2: 33.33, m3: 33.34 });

    expect(shares).toEqual({ m1: 49995, m2: 49995, m3: 50009 });
    expect(total(shares)).toBe(149999);
  });

  it('never gives a paisa to a member with 0%', () => {
    expect(splitByPercentages(101, { m1: 0, m2: 50, m3: 50 })).toEqual({ m2: 51, m3: 50 });
  });
});

describe('calculateShares', () => {
  it('uses the exact paise entered for an exact split', () => {
    const shares = calculateShares(1050000, {
      type: 'exact',
      shares: { m3: 350000, m4: 350000, m5: 350000 },
    });

    expect(shares).toEqual({ m3: 350000, m4: 350000, m5: 350000 });
  });

  it('always adds up to the original amount for equal and percentage splits', () => {
    const memberIds = ['m1', 'm2', 'm3', 'm4', 'm5'];
    const percentageSets: Record<string, number>[] = [
      { m1: 33.33, m2: 33.33, m3: 33.34 },
      { m1: 12.5, m2: 12.5, m3: 75 },
      { m1: 0.01, m2: 99.99 },
      { m1: 20, m2: 20, m3: 20, m4: 20, m5: 20 },
    ];

    for (let amount = 1; amount <= 5000; amount += 7) {
      for (let count = 1; count <= memberIds.length; count += 1) {
        const equalSplit: Split = { type: 'equal', memberIds: memberIds.slice(0, count) };
        expect(total(calculateShares(amount, equalSplit))).toBe(amount);
      }
      for (const shares of percentageSets) {
        expect(total(calculateShares(amount, { type: 'percent', shares }))).toBe(amount);
      }
    }
  });
});

describe('listShares and describeShare', () => {
  it('shows ₹100 between three members as ₹33.34, ₹33.33 and ₹33.33, in split order', () => {
    const shares = listShares(10000, { type: 'equal', memberIds: ['m1', 'm2', 'm3'] });

    expect(shares.map((share) => describeShare(share, sampleMembers))).toEqual([
      'Aarav — ₹33.34',
      'Diya — ₹33.33',
      'Kabir — ₹33.33',
    ]);
  });

  it('shows each percentage next to its amount', () => {
    const airportCab = listShares(149999, {
      type: 'percent',
      shares: { m1: 33.33, m2: 33.33, m3: 33.34 },
    });

    expect(airportCab.map((share) => describeShare(share, sampleMembers))).toEqual([
      'Aarav — 33.33% · ₹499.95',
      'Diya — 33.33% · ₹499.95',
      'Kabir — 33.34% · ₹500.09',
    ]);
  });

  it('shows the exact amounts entered for an exact split', () => {
    const scuba = listShares(1050000, {
      type: 'exact',
      shares: { m3: 350000, m4: 350000, m5: 350000 },
    });

    expect(scuba).toEqual([
      { memberId: 'm3', amount: 350000 },
      { memberId: 'm4', amount: 350000 },
      { memberId: 'm5', amount: 350000 },
    ]);
  });
});

describe('describeSplit', () => {
  it('describes each split type with the number of people', () => {
    expect(describeSplit({ type: 'equal', memberIds: ['m1', 'm2', 'm3', 'm4'] })).toBe(
      'Equally, 4 people',
    );
    expect(describeSplit({ type: 'exact', shares: { m3: 1, m4: 1, m5: 1 } })).toBe(
      'Exact amounts, 3 people',
    );
    expect(describeSplit({ type: 'percent', shares: { m1: 60, m2: 40 } })).toBe(
      'Percentages, 2 people',
    );
  });

  it('uses "person" for one member', () => {
    expect(describeSplit({ type: 'equal', memberIds: ['m1'] })).toBe('Equally, 1 person');
  });
});

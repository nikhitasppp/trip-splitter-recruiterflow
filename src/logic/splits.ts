import type { Member, Paise, Split, SplitType } from '../types';
import { getMemberName } from './expenseList';
import { formatRupees } from './money';

/** The order split types appear in the form. */
export const SPLIT_TYPES: SplitType[] = ['equal', 'exact', 'percent'];

export const SPLIT_TYPE_LABELS: Record<SplitType, string> = {
  equal: 'Equally',
  exact: 'Exact amounts',
  percent: 'Percentages',
};

interface MemberWeight {
  memberId: string;
  weight: number;
}

/**
 * Splits `amount` between members in proportion to their weights, in whole paise.
 *
 * Rounding rule, used for every split: each share is rounded down, then the
 * leftover paise go one each to members in the order they are listed. The
 * shares always add up to exactly `amount`; no paisa is lost or invented.
 */
function splitByWeights(amount: Paise, weights: MemberWeight[]): Record<string, Paise> {
  const participants = weights.filter(({ weight }) => weight > 0);
  const totalWeight = participants.reduce((sum, { weight }) => sum + weight, 0);
  const shares: Record<string, Paise> = {};
  if (totalWeight === 0) return shares;

  let allocated = 0;
  for (const { memberId, weight } of participants) {
    const share = Math.floor((amount * weight) / totalWeight);
    shares[memberId] = share;
    allocated += share;
  }

  // Rounding down loses less than 1 paisa per member, so there are always
  // fewer leftover paise than members: one pass is enough.
  let leftover = amount - allocated;
  for (const { memberId } of participants) {
    if (leftover === 0) break;
    shares[memberId] = (shares[memberId] ?? 0) + 1;
    leftover -= 1;
  }

  return shares;
}

/** ₹100 between three members → 3334, 3333 and 3333 paise. */
export function splitEqually(amount: Paise, memberIds: string[]): Record<string, Paise> {
  return splitByWeights(
    amount,
    memberIds.map((memberId) => ({ memberId, weight: 1 })),
  );
}

/** Percentages like 33.33 become whole hundredths of a percent (3333) before splitting. */
export function splitByPercentages(
  amount: Paise,
  percentages: Record<string, number>,
): Record<string, Paise> {
  return splitByWeights(
    amount,
    Object.entries(percentages).map(([memberId, percent]) => ({
      memberId,
      weight: Math.round(percent * 100),
    })),
  );
}

/** Each member's share of an expense, in paise. */
export function calculateShares(amount: Paise, split: Split): Record<string, Paise> {
  switch (split.type) {
    case 'equal':
      return splitEqually(amount, split.memberIds);
    case 'exact':
      return { ...split.shares };
    case 'percent':
      return splitByPercentages(amount, split.shares);
  }
}

/** Text for the Expense breakdown column, e.g. "Equally, 4 people". */
export function describeSplit(split: Split): string {
  const memberCount =
    split.type === 'equal' ? split.memberIds.length : Object.keys(split.shares).length;
  const people = memberCount === 1 ? 'person' : 'people';
  return `${SPLIT_TYPE_LABELS[split.type]}, ${memberCount} ${people}`;
}

/** One member's part of an expense, for the opened Expense breakdown. */
export interface MemberShare {
  memberId: string;
  amount: Paise;
  /** Percentage splits only: the member's percentage, e.g. 33.33. */
  percent?: number;
}

/**
 * Each member's share of an expense, in the split's own order. It reuses
 * calculateShares, so the amounts (and who got an extra paisa) always match
 * the balances.
 */
export function listShares(amount: Paise, split: Split): MemberShare[] {
  return Object.entries(calculateShares(amount, split)).map(([memberId, share]) => ({
    memberId,
    amount: share,
    percent: split.type === 'percent' ? split.shares[memberId] : undefined,
  }));
}

/** "Aarav — ₹33.34", or "Aarav — 33.33% · ₹499.95" for a percentage split. */
export function describeShare(share: MemberShare, members: Member[]): string {
  const name = getMemberName(members, share.memberId);
  const amount = formatRupees(share.amount);
  return share.percent === undefined
    ? `${name} — ${amount}`
    : `${name} — ${share.percent}% · ${amount}`;
}

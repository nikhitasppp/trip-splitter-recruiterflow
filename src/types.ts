/**
 * Money is always a whole number of paise: ₹1,250.50 is 125050.
 * This alias doesn't stop you passing rupees by mistake; it documents intent.
 */
export type Paise = number;

export interface Member {
  id: string;
  name: string;
}

export const CATEGORIES = ['Food', 'Travel', 'Stay', 'Activities', 'Other'] as const;

/** 'Food' | 'Travel' | 'Stay' | 'Activities' | 'Other' */
export type Category = (typeof CATEGORIES)[number];

/** Narrows any string (e.g. from a <select>) to a Category. */
export function isCategory(value: string): value is Category {
  return CATEGORIES.some((category) => category === value);
}

/** Split equally between the listed members. */
export interface EqualSplit {
  type: 'equal';
  memberIds: string[];
}

/** A fixed amount for each member, in paise. */
export interface ExactSplit {
  type: 'exact';
  shares: Record<string, Paise>;
}

/** A percentage for each member: 33.33 means 33.33%. */
export interface PercentSplit {
  type: 'percent';
  shares: Record<string, number>;
}

/** A discriminated union: checking `split.type` tells TypeScript which shape it is. */
export type Split = EqualSplit | ExactSplit | PercentSplit;

export type SplitType = Split['type'];

export interface Expense {
  id: string;
  description: string;
  amount: Paise;
  /** A member id. */
  paidBy: string;
  /** YYYY-MM-DD */
  date: string;
  category: Category;
  split: Split;
}

/** An expense before the app has given it an id. */
export type NewExpense = Omit<Expense, 'id'>;

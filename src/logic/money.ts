import type { Paise } from '../types';

/** Why a piece of text couldn't be read as a number with up to 2 decimals. */
export type NumberInputError = 'empty' | 'invalid' | 'negative' | 'too-many-decimals';

export type HundredthsResult =
  | { ok: true; hundredths: number }
  | { ok: false; error: NumberInputError };

/** Digits, optionally followed by a dot and more digits: "1250", "1250.5", "1250.50". */
const DECIMAL_NUMBER = /^(\d+)(?:\.(\d+))?$/;

/**
 * Reads text like "1250.5" as a whole number of hundredths (125050) using
 * only whole-number maths, so nothing is ever rounded. Rupees → paise and
 * percentages → hundredths of a percent both use this.
 *
 * Invalid text is rejected, never rounded into a valid number: "12.345"
 * is an error, not 12.35.
 */
export function parseHundredths(input: string): HundredthsResult {
  const text = input.trim();
  if (text === '') return { ok: false, error: 'empty' };

  const isNegative = text.startsWith('-');
  const match = DECIMAL_NUMBER.exec(isNegative ? text.slice(1) : text);
  if (match === null) return { ok: false, error: 'invalid' };
  if (isNegative) return { ok: false, error: 'negative' };

  const [, wholePart = '', decimalPart = ''] = match;
  if (decimalPart.length > 2) return { ok: false, error: 'too-many-decimals' };

  // "1250.5" → 1250 * 100 + 50. "5" is padded to "50" so it means 50 paise, not 5.
  return { ok: true, hundredths: Number(wholePart) * 100 + Number(decimalPart.padEnd(2, '0')) };
}

export type MoneyResult = { ok: true; paise: Paise } | { ok: false; error: NumberInputError };

/** "1250.50" → 125050 paise. */
export function parseRupeesToPaise(input: string): MoneyResult {
  const result = parseHundredths(input);
  return result.ok ? { ok: true, paise: result.hundredths } : result;
}

/** Groups digits the Indian way: 100000 → "1,00,000". */
const indianNumberFormat = new Intl.NumberFormat('en-IN');

/** 10000000 paise → "₹1,00,000.00". Always shows 2 decimals. */
export function formatRupees(paise: Paise): string {
  const sign = paise < 0 ? '-' : '';
  const absolutePaise = Math.abs(paise);
  const rupees = Math.floor(absolutePaise / 100);
  const remainingPaise = absolutePaise % 100;
  return `${sign}₹${indianNumberFormat.format(rupees)}.${String(remainingPaise).padStart(2, '0')}`;
}

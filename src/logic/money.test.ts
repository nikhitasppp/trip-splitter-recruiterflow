import { describe, expect, it } from 'vitest';
import { formatRupees, parseHundredths, parseRupeesToPaise } from './money';

describe('parseRupeesToPaise', () => {
  it('reads whole rupees', () => {
    expect(parseRupeesToPaise('1250')).toEqual({ ok: true, paise: 125000 });
  });

  it('reads one decimal place as tens of paise', () => {
    expect(parseRupeesToPaise('1250.5')).toEqual({ ok: true, paise: 125050 });
  });

  it('reads two decimal places', () => {
    expect(parseRupeesToPaise('1250.50')).toEqual({ ok: true, paise: 125050 });
    expect(parseRupeesToPaise('0.01')).toEqual({ ok: true, paise: 1 });
  });

  it('avoids floating-point errors (0.29 * 100 is 28.999999999999996 in JavaScript)', () => {
    expect(parseRupeesToPaise('0.29')).toEqual({ ok: true, paise: 29 });
    expect(parseRupeesToPaise('1.15')).toEqual({ ok: true, paise: 115 });
  });

  it('ignores spaces around the number', () => {
    expect(parseRupeesToPaise('  42 ')).toEqual({ ok: true, paise: 4200 });
  });

  it('reports empty input', () => {
    expect(parseRupeesToPaise('')).toEqual({ ok: false, error: 'empty' });
    expect(parseRupeesToPaise('   ')).toEqual({ ok: false, error: 'empty' });
  });

  it('reports negative numbers separately from invalid text', () => {
    expect(parseRupeesToPaise('-5')).toEqual({ ok: false, error: 'negative' });
    expect(parseRupeesToPaise('-0.50')).toEqual({ ok: false, error: 'negative' });
  });

  it('rejects more than two decimal places instead of rounding them', () => {
    expect(parseRupeesToPaise('12.345')).toEqual({ ok: false, error: 'too-many-decimals' });
  });

  it.each(['abc', '12abc', '1.2.3', '1,000', '₹500', '.5', '5.', '1e5', '--5'])(
    'rejects invalid text "%s"',
    (input) => {
      expect(parseRupeesToPaise(input)).toEqual({ ok: false, error: 'invalid' });
    },
  );
});

describe('parseHundredths', () => {
  it('reads percentages as hundredths of a percent', () => {
    expect(parseHundredths('33.33')).toEqual({ ok: true, hundredths: 3333 });
    expect(parseHundredths('100')).toEqual({ ok: true, hundredths: 10000 });
  });
});

describe('formatRupees', () => {
  it('uses Indian digit grouping with two decimals', () => {
    expect(formatRupees(100000)).toBe('₹1,000.00');
    expect(formatRupees(1000000)).toBe('₹10,000.00');
    expect(formatRupees(10000000)).toBe('₹1,00,000.00');
    expect(formatRupees(100000000)).toBe('₹10,00,000.00');
  });

  it('always shows two decimal places', () => {
    expect(formatRupees(125050)).toBe('₹1,250.50');
    expect(formatRupees(5)).toBe('₹0.05');
    expect(formatRupees(0)).toBe('₹0.00');
  });

  it('puts the minus sign before the rupee symbol', () => {
    expect(formatRupees(-125050)).toBe('-₹1,250.50');
  });
});

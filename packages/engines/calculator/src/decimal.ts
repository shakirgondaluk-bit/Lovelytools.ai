// lovelytools.ai — money-safe arithmetic. One import site for decimal.js so
// precision/rounding policy lives in exactly one place.
import Decimal from 'decimal.js';

// 20 significant digits internally; display rounding is separate and explicit.
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

export { Decimal };

export const D = (v: string | number | Decimal): Decimal => new Decimal(v);

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);
export const HUNDRED = new Decimal(100);

/** Display rounding for money: banker's, 2 places by default. */
export function roundMoney(v: Decimal, precision = 2): Decimal {
  return v.toDecimalPlaces(precision, Decimal.ROUND_HALF_EVEN);
}

/** (1 + r)^n with Decimal exactness. */
export function compound(rate: Decimal, periods: number): Decimal {
  return ONE.plus(rate).pow(periods);
}

/**
 * Amortized payment: M = P · r(1+r)ⁿ / ((1+r)ⁿ − 1).
 * Zero-rate degenerates to P / n.
 */
export function amortizedPayment(principal: Decimal, periodicRate: Decimal, periods: number): Decimal {
  if (periodicRate.isZero()) return principal.div(periods);
  const growth = compound(periodicRate, periods);
  return principal.times(periodicRate.times(growth)).div(growth.minus(ONE));
}

/** Percent (e.g. "6.5") → periodic decimal rate (e.g. 0.065 / 12). */
export function percentToPeriodicRate(annualPercent: Decimal, periodsPerYear: number): Decimal {
  return annualPercent.div(HUNDRED).div(periodsPerYear);
}

// lovelytools.ai — shared calendar helpers for the date-flavored calculators
// (age, countdown, ovulation, pregnancy). Same rules as date-diff.ts: UTC
// arithmetic, real month lengths, no "30-day month" approximations.
import { CalcError } from '../types';

/**
 * Parse YYYY-MM-DD to a UTC date, rejecting impossible dates (2025-02-30).
 * The literal string 'today' resolves to the current date — it's the default
 * for "as of" fields, so a page loaded tomorrow computes tomorrow's answer
 * instead of a stale hardcoded one. Vectors always pass explicit dates, so
 * CI stays deterministic.
 */
export function parseUtc(s: string, fieldId: string): Date {
  if (s === 'today') {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }
  const [, year, month, day] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) ?? [];
  if (!year || !month || !day) throw new CalcError('invalid-input', 'Use the date picker or YYYY-MM-DD.', fieldId);
  const monthIdx = +month - 1;
  const d = new Date(Date.UTC(+year, monthIdx, +day));
  if (d.getUTCMonth() !== monthIdx || d.getUTCDate() !== +day) {
    throw new CalcError('invalid-input', `${s} isn't a real calendar date.`, fieldId);
  }
  return d;
}

export const MS_DAY = 86_400_000;

export const iso = (d: Date): string => d.toISOString().slice(0, 10);

export const addDays = (d: Date, days: number): Date => new Date(d.getTime() + days * MS_DAY);

export function daysInMonth(year: number, monthIdx: number): number {
  // monthIdx may be -1 (borrow from December of the previous year).
  return new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
}

/** Whole days from a to b (negative when b is earlier). */
export const daysBetween = (a: Date, b: Date): number =>
  Math.round((b.getTime() - a.getTime()) / MS_DAY);

/** Calendar-exact y/m/d between two ordered dates (a ≤ b). */
export function calendarDiff(a: Date, b: Date): { years: number; months: number; days: number } {
  let years = b.getUTCFullYear() - a.getUTCFullYear();
  let months = b.getUTCMonth() - a.getUTCMonth();
  let days = b.getUTCDate() - a.getUTCDate();
  if (days < 0) {
    months -= 1;
    days += daysInMonth(b.getUTCFullYear(), b.getUTCMonth() - 1);
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

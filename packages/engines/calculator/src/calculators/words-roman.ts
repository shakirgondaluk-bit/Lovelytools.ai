// lovelytools.ai — number → English words (checks, legal text) and Roman
// numerals both directions. Pure string work; no Decimal needed beyond parsing.
import { CalcError, defineCalculator, type CalcInputs, type CalcResult } from '../types';

/* ── number to words ───────────────────────────────────────────────────────── */

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = ['', ' thousand', ' million', ' billion', ' trillion', ' quadrillion'];

function threeDigits(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} hundred`);
  if (rest < 20) {
    if (rest) parts.push(ONES[rest]!);
  } else {
    const tens = TENS[Math.floor(rest / 10)]!;
    const ones = rest % 10;
    parts.push(ones ? `${tens}-${ONES[ones]}` : tens);
  }
  return parts.join(' ');
}

function integerToWords(n: bigint): string {
  if (n === 0n) return 'zero';
  const groups: number[] = [];
  let rest = n;
  while (rest > 0n) {
    groups.push(Number(rest % 1000n));
    rest /= 1000n;
  }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i]! !== 0) parts.push(threeDigits(groups[i]!) + SCALES[i]!);
  }
  return parts.join(' ');
}

defineCalculator({
  slug: 'number-to-words',
  name: 'Number to Words',
  category: 'units',
  description: 'Spell any number out in English words — for checks, contracts and clarity.',
  fields: [
    { id: 'value', label: 'Number', kind: 'text', default: '12345.67', required: true,
      hint: 'Up to the quadrillions. Decimals become cents-style wording.' },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const raw = (inputs.value as string).replace(/[,\s]/g, '');
    const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(raw);
    if (!m) throw new CalcError('invalid-input', 'Enter a number (decimals up to 2 places).', 'value');
    const negative = m[1] === '-';
    const intPart = BigInt(m[2]!);
    if (intPart >= 1000000000000000000n) throw new CalcError('out-of-domain', 'That’s beyond the quadrillions this spells out.', 'value');
    const cents = m[3] ? Number(m[3]!.padEnd(2, '0')) : null;

    const intWords = `${negative ? 'negative ' : ''}${integerToWords(intPart)}`;
    const full = cents !== null ? `${intWords} and ${cents}/100` : intWords;
    const titleCase = full.charAt(0).toUpperCase() + full.slice(1);

    return {
      primary: { label: 'In words', value: titleCase, format: { kind: 'text' } },
      secondary: [
        ...(cents !== null
          ? [{ label: 'Cents wording', value: `${intWords} dollars and ${integerToWords(BigInt(cents))} cent${cents === 1 ? '' : 's'}`, format: { kind: 'text' } as const }]
          : []),
        { label: 'Digits', value: raw, format: { kind: 'text' } },
      ],
      formula: 'Grouped by thousands: units → thousand → million → billion → …',
      steps: [`${raw} → ${titleCase}`],
    };
  },
  vectors: [
    { inputs: { value: '12345' }, expectPrimary: 'Twelve thousand three hundred forty-five' },
    { inputs: { value: '1000000' }, expectPrimary: 'One million' },
    { inputs: { value: '105.5' }, expectPrimary: 'One hundred five and 50/100' },
  ],
});

/* ── roman numerals ────────────────────────────────────────────────────────── */

const ROMAN: Array<[number, string]> = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

function toRoman(n: number): string {
  let out = '';
  for (const [v, sym] of ROMAN) {
    while (n >= v) { out += sym; n -= v; }
  }
  return out;
}

function fromRoman(s: string, fieldId: string): number {
  const VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = VALUES[s[i]!];
    if (cur === undefined) throw new CalcError('invalid-input', `"${s[i]}" isn't a Roman numeral (I V X L C D M).`, fieldId);
    const next = VALUES[s[i + 1] ?? ''] ?? 0;
    total += cur < next ? -cur : cur;
  }
  // Round-trip: rejects malformed forms like IIII or IC that "parse" anyway.
  if (toRoman(total) !== s) {
    throw new CalcError('invalid-input', `"${s}" isn't a well-formed Roman numeral${total >= 1 && total <= 3999 ? ` — did you mean ${toRoman(total)}?` : ''}.`, fieldId);
  }
  return total;
}

defineCalculator({
  slug: 'roman-numeral-converter',
  name: 'Roman Numeral Converter',
  category: 'units',
  description: 'Numbers to Roman numerals and back, I through MMMCMXCIX.',
  fields: [
    { id: 'value', label: 'Number or numeral', kind: 'text', default: '2026', required: true,
      hint: 'Type digits (1–3999) or a numeral like MMXXVI — the direction is detected.' },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const raw = (inputs.value as string).trim().toUpperCase();
    if (/^\d+$/.test(raw)) {
      const n = Number(raw);
      if (n < 1 || n > 3999) throw new CalcError('out-of-domain', 'Roman numerals cover 1 to 3999.', 'value');
      const roman = toRoman(n);
      return {
        primary: { label: `${n} in Roman numerals`, value: roman, format: { kind: 'text' } },
        secondary: [{ label: 'Digits', value: n, format: { kind: 'number' } }],
        formula: 'Greedy subtraction: M CM D CD C XC L XL X IX V IV I',
        steps: [`${n} → ${roman}`],
      };
    }
    const n = fromRoman(raw, 'value');
    return {
      primary: { label: `${raw} as a number`, value: n, format: { kind: 'number' } },
      secondary: [{ label: 'Numeral', value: raw, format: { kind: 'text' } }],
      formula: 'Subtractive pairs (IV, IX, XL…) subtract; everything else adds',
      steps: [`${raw} → ${n}`],
    };
  },
  vectors: [
    { inputs: { value: '2026' }, expectPrimary: 'MMXXVI' },
    { inputs: { value: 'MMXXVI' }, expectPrimary: '2026' },
    { inputs: { value: '3999' }, expectPrimary: 'MMMCMXCIX' },
  ],
});

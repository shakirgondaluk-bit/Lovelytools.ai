// lovelytools.ai — scientific calculator: a shunting-yard expression evaluator.
// Floats, deliberately — sin and ln aren't money, and 15 digits of IEEE double
// is what every handheld scientific calculator gives. Display rounds to 12
// significant digits so 0.1+0.2 reads 0.3, the way a calculator should.
import { CalcError, defineCalculator, type CalcInputs, type CalcResult } from '../types';

type Tok =
  | { t: 'num'; v: number }
  | { t: 'op'; v: string }
  | { t: 'fn'; v: string }
  | { t: 'lp' }
  | { t: 'rp' };

const FUNCTIONS = ['asin', 'acos', 'atan', 'sqrt', 'sin', 'cos', 'tan', 'log', 'ln', 'exp', 'abs'] as const;
const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

function tokenize(raw: string): Tok[] {
  // Forgive calculator-style glyphs.
  const s = raw.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi').replace(/\^/g, '^');
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if (/[\d.]/.test(c)) {
      const m = /^\d*\.?\d+(?:[eE][+-]?\d+)?/.exec(s.slice(i))!;
      out.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[a-z]/i.test(c)) {
      const m = /^[a-z]+/i.exec(s.slice(i))!;
      const name = m[0].toLowerCase();
      if ((FUNCTIONS as readonly string[]).includes(name)) out.push({ t: 'fn', v: name });
      else if (name in CONSTANTS) out.push({ t: 'num', v: CONSTANTS[name]! });
      else throw new CalcError('invalid-input', `"${m[0]}" isn't a known function or constant.`, 'expr');
      i += m[0].length;
      continue;
    }
    if ('+-*/^'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    if (c === '(') { out.push({ t: 'lp' }); i++; continue; }
    if (c === ')') { out.push({ t: 'rp' }); i++; continue; }
    throw new CalcError('invalid-input', `Unexpected "${c}" in the expression.`, 'expr');
  }
  return out;
}

const PREC: Record<string, number> = { '+': 2, '-': 2, '*': 3, '/': 3, '^': 4, 'neg': 5 };
const RIGHT_ASSOC = new Set(['^', 'neg']);

/** Shunting-yard to RPN. Unary minus becomes the 'neg' pseudo-operator. */
function toRpn(tokens: Tok[]): Tok[] {
  const out: Tok[] = [];
  const stack: Tok[] = [];
  let prev: Tok | null = null;
  for (const tok of tokens) {
    if (tok.t === 'num') out.push(tok);
    else if (tok.t === 'fn') stack.push(tok);
    else if (tok.t === 'lp') stack.push(tok);
    else if (tok.t === 'rp') {
      while (stack.length && stack[stack.length - 1]!.t !== 'lp') out.push(stack.pop()!);
      if (!stack.length) throw new CalcError('invalid-input', 'Unmatched ")".', 'expr');
      stack.pop(); // the '('
      if (stack.length && stack[stack.length - 1]!.t === 'fn') out.push(stack.pop()!);
    } else {
      // Operator. '-' is unary after nothing, another operator, or '('.
      const unary = tok.v === '-' && (!prev || prev.t === 'op' || prev.t === 'lp');
      const op = unary ? 'neg' : tok.v;
      while (stack.length) {
        const top = stack[stack.length - 1]!;
        if (top.t !== 'op') break;
        const higher = PREC[top.v]! > PREC[op]! || (PREC[top.v] === PREC[op] && !RIGHT_ASSOC.has(op));
        if (!higher) break;
        out.push(stack.pop()!);
      }
      stack.push({ t: 'op', v: op });
    }
    prev = tok;
  }
  for (const rest of stack.reverse()) {
    if (rest.t === 'lp') throw new CalcError('invalid-input', 'Unmatched "(".', 'expr');
    out.push(rest);
  }
  return out;
}

function evaluate(rpn: Tok[], degrees: boolean): number {
  const st: number[] = [];
  const pop = (): number => {
    const v = st.pop();
    if (v === undefined) throw new CalcError('invalid-input', 'The expression is incomplete.', 'expr');
    return v;
  };
  const toRad = (x: number) => (degrees ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (degrees ? (x * 180) / Math.PI : x);

  for (const tok of rpn) {
    if (tok.t === 'num') st.push(tok.v);
    else if (tok.t === 'op') {
      if (tok.v === 'neg') { st.push(-pop()); continue; }
      const b = pop();
      const a = pop();
      if (tok.v === '/' && b === 0) throw new CalcError('out-of-domain', 'Division by zero.', 'expr');
      st.push(tok.v === '+' ? a + b : tok.v === '-' ? a - b : tok.v === '*' ? a * b : tok.v === '/' ? a / b : Math.pow(a, b));
    } else if (tok.t === 'fn') {
      const x = pop();
      switch (tok.v) {
        case 'sin': st.push(Math.sin(toRad(x))); break;
        case 'cos': st.push(Math.cos(toRad(x))); break;
        case 'tan': st.push(Math.tan(toRad(x))); break;
        case 'asin': st.push(fromRad(Math.asin(x))); break;
        case 'acos': st.push(fromRad(Math.acos(x))); break;
        case 'atan': st.push(fromRad(Math.atan(x))); break;
        case 'sqrt':
          if (x < 0) throw new CalcError('out-of-domain', '√ of a negative number.', 'expr');
          st.push(Math.sqrt(x)); break;
        case 'log':
          if (x <= 0) throw new CalcError('out-of-domain', 'log needs a positive number.', 'expr');
          st.push(Math.log10(x)); break;
        case 'ln':
          if (x <= 0) throw new CalcError('out-of-domain', 'ln needs a positive number.', 'expr');
          st.push(Math.log(x)); break;
        case 'exp': st.push(Math.exp(x)); break;
        case 'abs': st.push(Math.abs(x)); break;
      }
    }
  }
  if (st.length !== 1) throw new CalcError('invalid-input', 'The expression is incomplete.', 'expr');
  const result = st[0]!;
  if (!Number.isFinite(result)) throw new CalcError('out-of-domain', 'The result is out of range.', 'expr');
  return result;
}

/** 12 significant digits, float dust removed: 0.1+0.2 → "0.3". */
const display = (x: number): number => parseFloat(x.toPrecision(12));

export const scientific = defineCalculator({
  slug: 'scientific-calculator',
  name: 'Scientific Calculator',
  category: 'everyday',
  description: 'Type any expression — trig, logs, roots, powers, parentheses, π and e.',
  fields: [
    { id: 'expr', label: 'Expression', kind: 'text', default: '2 + 3 * 4', required: true,
      hint: 'sin cos tan · asin acos atan · sqrt log ln exp abs · ^ for powers · pi, e' },
    { id: 'angles', label: 'Angles in', kind: 'select', default: 'deg', options: [
      { value: 'deg', label: 'Degrees' }, { value: 'rad', label: 'Radians' },
    ] },
  ],
  compute(inputs: CalcInputs): CalcResult {
    const raw = inputs.expr as string;
    const degrees = (inputs.angles as string) === 'deg';
    const tokens = tokenize(raw);
    if (tokens.length === 0) throw new CalcError('invalid-input', 'Type an expression.', 'expr');
    const rpn = toRpn(tokens);
    const value = evaluate(rpn, degrees);

    return {
      primary: { label: raw.trim(), value: display(value), format: { kind: 'number' } },
      secondary: [
        ...(Math.abs(value) >= 1e12 || (value !== 0 && Math.abs(value) < 1e-9)
          ? [{ label: 'Scientific notation', value: value.toExponential(6), format: { kind: 'text' } as const }]
          : []),
        { label: 'Angle mode', value: degrees ? 'Degrees' : 'Radians', format: { kind: 'text' } },
      ],
      formula: 'Standard precedence: parentheses → functions → ^ → × ÷ → + −',
      steps: [
        `Parsed: ${rpn.map((t) => (t.t === 'num' ? display(t.v) : 'v' in t ? t.v : '')).join(' ')} (RPN)`,
        `= ${display(value)}`,
      ],
    };
  },
  vectors: [
    { inputs: { expr: '2 + 3 * 4', angles: 'deg' }, expectPrimary: '14' },
    { inputs: { expr: 'sin(90)', angles: 'deg' }, expectPrimary: '1' },
    { inputs: { expr: '2^10 - (3+1)/2', angles: 'rad' }, expectPrimary: '1022' },
  ],
});

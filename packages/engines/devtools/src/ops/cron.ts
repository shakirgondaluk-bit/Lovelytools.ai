// lovelytools.ai — cron builder + explainer via `cronstrue` (cron field
// semantics — lists, ranges, steps, month/weekday names — are gnarly enough
// that a purpose-built, well-tested library beats a from-scratch describer).
import cronstrue from 'cronstrue';
import { defineDevOp, DevError, type DevField, type DevOptions, type DevResult } from '../types';

function describe(expr: string): string {
  try {
    return cronstrue.toString(expr, { throwExceptionOnParseError: true });
  } catch (e) {
    // cronstrue throws bare strings, not Error objects.
    throw new DevError('parse-error', typeof e === 'string' ? e : 'That isn’t a valid cron expression.');
  }
}

export const cronExpressionGenerator = defineDevOp({
  slug: 'cron-expression-generator',
  name: 'Cron Expression Generator',
  description: 'Build a cron schedule from fields, or paste one to see it explained in plain English.',
  options: [
    { id: 'mode', label: 'Mode', kind: 'select', default: 'build', options: [
      { value: 'build', label: 'Build from fields' }, { value: 'explain', label: 'Explain pasted expression' },
    ] },
    { id: 'minute', label: 'Minute', kind: 'text', default: '*', placeholder: '0-59, */5, *' },
    { id: 'hour', label: 'Hour', kind: 'text', default: '*', placeholder: '0-23, *' },
    { id: 'dayOfMonth', label: 'Day of month', kind: 'text', default: '*', placeholder: '1-31, *' },
    { id: 'month', label: 'Month', kind: 'text', default: '*', placeholder: '1-12, *' },
    { id: 'dayOfWeek', label: 'Day of week', kind: 'text', default: '*', placeholder: '0-6, MON-FRI, *' },
  ],
  run(input: string, options: DevOptions): DevResult {
    const expr = options.mode === 'explain'
      ? input.trim()
      : [options.minute, options.hour, options.dayOfMonth, options.month, options.dayOfWeek].join(' ');

    if (expr === '' || expr.trim() === '') return { output: '' };
    const description = describe(expr);
    const fields: DevField[] = [{ label: 'Schedule', value: description, tone: 'positive', mono: false }];
    return { output: expr, fields, notes: [description] };
  },
  vectors: [
    { input: '', options: { mode: 'build', minute: '*/5', hour: '*', dayOfMonth: '*', month: '*', dayOfWeek: '*' }, expect: '*/5 * * * *' },
    { input: '0 9 * * 1-5', options: { mode: 'explain' }, expect: '0 9 * * 1-5' },
  ],
});

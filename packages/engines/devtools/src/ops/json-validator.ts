// lovelytools.ai — json-validator is json-formatter's "validate only" mode as
// its own SEO landing page: parse, report line/column on failure, don't
// reformat the input back.
import { defineDevOp, DevError, type DevOptions, type DevResult } from '../types';
import { positionOf } from './json';

export const jsonValidator = defineDevOp({
  slug: 'json-validator',
  name: 'JSON Validator',
  description: 'Validate JSON and pinpoint syntax errors by line and column.',
  options: [],
  run(input: string, _options: DevOptions): DevResult {
    if (input.trim() === '') return { output: '' };
    try {
      JSON.parse(input);
    } catch (e) {
      const pos = positionOf(input, e as Error);
      const detail = (e as Error).message.replace(/^JSON\.parse: /, '').replace(/ in JSON at position \d+.*$/s, '');
      throw new DevError('parse-error', pos ? `${detail} at line ${pos.line}, column ${pos.column}.` : `${detail}.`, pos);
    }
    return {
      output: input,
      fields: [{ label: 'Valid', value: 'Yes', tone: 'positive', mono: false }],
    };
  },
  vectors: [
    { input: '{"a":1}', expect: '{"a":1}' },
  ],
});

// lovelytools.ai — JSON ⇄ YAML via the `yaml` package (full YAML 1.2 spec —
// hand-rolling a correct YAML parser is a trap, this is the one place we lean
// on a dependency rather than a from-scratch implementation).
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { defineDevOp, DevError, type DevOptions, type DevResult } from '../types';

export const jsonToYaml = defineDevOp({
  slug: 'json-to-yaml',
  name: 'JSON to YAML',
  description: 'Convert JSON into clean YAML.',
  options: [],
  run(input: string, _options: DevOptions): DevResult {
    if (input.trim() === '') return { output: '' };
    let value: unknown;
    try {
      value = JSON.parse(input);
    } catch (e) {
      throw new DevError('parse-error', `Invalid JSON: ${(e as Error).message}`);
    }
    return { output: stringifyYaml(value).trimEnd() };
  },
  vectors: [
    { input: '{"a":1,"b":["x","y"]}', expect: 'a: 1\nb:\n  - x\n  - y' },
  ],
});

export const yamlToJson = defineDevOp({
  slug: 'yaml-to-json',
  name: 'YAML to JSON',
  description: 'Convert YAML into JSON.',
  options: [
    { id: 'indent', label: 'Indent', kind: 'select', default: '2', options: [
      { value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' },
    ] },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input.trim() === '') return { output: '' };
    let value: unknown;
    try {
      value = parseYaml(input);
    } catch (e) {
      throw new DevError('parse-error', `Invalid YAML: ${(e as Error).message}`);
    }
    return { output: JSON.stringify(value, null, Number(options.indent) || 2) };
  },
  vectors: [
    { input: 'a: 1\nb:\n  - x\n  - y\n', options: { indent: '2' }, expect: JSON.stringify({ a: 1, b: ['x', 'y'] }, null, 2) },
  ],
});

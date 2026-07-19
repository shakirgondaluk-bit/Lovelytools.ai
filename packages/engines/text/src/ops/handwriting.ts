// lovelytools.ai — text-to-handwriting. The op itself is a pass-through: the
// actual canvas rendering (cursive font, ruled paper, ink color) happens in
// the UI, same split as every other engine where computation and canvas
// drawing are kept apart. `preview: 'handwriting'` tells the runner to render
// the output on a canvas instead of as plain text.
import { defineTextOp, TextError, type TextResult } from '../types';

export const handwriting = defineTextOp({
  slug: 'text-to-handwriting',
  name: 'Text to Handwriting',
  description: 'Convert typed text into a handwriting-style image.',
  inputs: 1,
  preview: 'handwriting',
  options: [
    { id: 'style', label: 'Handwriting style', kind: 'select', default: 'casual', options: [
      { value: 'casual', label: 'Casual' }, { value: 'neat', label: 'Neat' }, { value: 'marker', label: 'Marker' },
    ] },
    { id: 'ink', label: 'Ink color', kind: 'select', default: 'blue', options: [
      { value: 'blue', label: 'Blue' }, { value: 'black', label: 'Black' }, { value: 'red', label: 'Red' },
    ] },
    { id: 'paper', label: 'Paper', kind: 'select', default: 'lined', options: [
      { value: 'lined', label: 'Lined' }, { value: 'grid', label: 'Grid' }, { value: 'blank', label: 'Blank' },
    ] },
    { id: 'fontSize', label: 'Font size', kind: 'number', default: 28, min: 14, max: 64 },
  ],
  run(input: string): TextResult {
    if (input.length > 5000) {
      throw new TextError('invalid-input', 'Keep it under 5,000 characters for one page — split longer text up.');
    }
    return { output: input };
  },
  vectors: [{ input: 'Dear diary,', expect: 'Dear diary,' }],
});

// lovelytools.ai — Markdown ⇄ HTML. Parsing Markdown or HTML correctly by
// hand is a well-known trap (CommonMark alone has hundreds of edge cases) —
// these two lean on small, focused, dependency-light libraries rather than a
// from-scratch parser.
import { marked } from 'marked';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { defineDevOp, type DevOptions, type DevResult } from '../types';

marked.setOptions({ gfm: true, breaks: false });

export const markdownToHtml = defineDevOp({
  slug: 'markdown-to-html',
  name: 'Markdown to HTML',
  description: 'Convert Markdown into clean HTML.',
  options: [
    { id: 'breaks', label: 'Convert single line breaks to <br>', kind: 'toggle', default: false },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input.trim() === '') return { output: '' };
    const html = marked.parse(input, { async: false, gfm: true, breaks: Boolean(options.breaks) }) as string;
    return { output: html.trimEnd() };
  },
  vectors: [
    { input: '# Hi\n\nSome **bold** text.', options: { breaks: false }, expect: '<h1>Hi</h1>\n<p>Some <strong>bold</strong> text.</p>' },
  ],
});

export const htmlToMarkdown = defineDevOp({
  slug: 'html-to-markdown',
  name: 'HTML to Markdown',
  description: 'Convert HTML back into Markdown.',
  options: [],
  run(input: string, _options: DevOptions): DevResult {
    if (input.trim() === '') return { output: '' };
    return { output: NodeHtmlMarkdown.translate(input) };
  },
  vectors: [
    { input: '<h1>Hi</h1><p>Some <strong>bold</strong> text.</p>', expect: '# Hi\n\nSome **bold** text.' },
  ],
});

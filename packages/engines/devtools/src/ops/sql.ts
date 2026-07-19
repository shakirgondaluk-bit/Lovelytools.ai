// lovelytools.ai — SQL formatter via the `sql-formatter` package — SQL dialect
// quoting/keyword rules are too varied to hand-roll reliably.
import { format as formatSql, type KeywordCase, type SqlLanguage } from 'sql-formatter';
import { defineDevOp, DevError, type DevOptions, type DevResult } from '../types';

export const sqlFormatter = defineDevOp({
  slug: 'sql-formatter',
  name: 'SQL Formatter',
  description: 'Format SQL queries for readability.',
  options: [
    { id: 'language', label: 'Dialect', kind: 'select', default: 'sql', options: [
      { value: 'sql', label: 'Standard SQL' }, { value: 'mysql', label: 'MySQL' },
      { value: 'postgresql', label: 'PostgreSQL' }, { value: 'sqlite', label: 'SQLite' },
      { value: 'mariadb', label: 'MariaDB' }, { value: 'tsql', label: 'SQL Server' },
    ] },
    { id: 'keywordCase', label: 'Keyword case', kind: 'select', default: 'upper', options: [
      { value: 'upper', label: 'UPPERCASE' }, { value: 'lower', label: 'lowercase' }, { value: 'preserve', label: 'Preserve' },
    ] },
  ],
  run(input: string, options: DevOptions): DevResult {
    if (input.trim() === '') return { output: '' };
    try {
      const language = String(options.language) as SqlLanguage;
      const keywordCase = String(options.keywordCase) as KeywordCase;
      return { output: formatSql(input, { language, keywordCase }) };
    } catch (e) {
      throw new DevError('parse-error', `Couldn't format that SQL: ${(e as Error).message}`);
    }
  },
  vectors: [
    { input: 'select id, name from users where id=1', options: { language: 'sql', keywordCase: 'upper' }, expect: 'SELECT\n  id,\n  name\nFROM\n  users\nWHERE\n  id = 1' },
  ],
});

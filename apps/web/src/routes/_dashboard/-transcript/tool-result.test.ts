import { describe, expect, it } from 'vitest';

import { parseNumberedResult } from './tool-result';

describe('parseNumberedResult', () => {
  it('parses cat -n style output with the real start line', () => {
    const parsed = parseNumberedResult('84\tconst a = 1;\n85\tconst b = 2;\n86\t}');
    expect(parsed).toEqual({ startLine: 84, code: 'const a = 1;\nconst b = 2;\n}', tail: '' });
  });

  it('keeps non-numbered tail content (system reminders) separate', () => {
    const parsed = parseNumberedResult('1\tline one\n2\tline two\n\n<system-reminder>note</system-reminder>');
    expect(parsed?.code).toBe('line one\nline two');
    expect(parsed?.tail).toBe('<system-reminder>note</system-reminder>');
  });

  it('rejects plain text and single-line results', () => {
    expect(parseNumberedResult('no numbers here')).toBeNull();
    expect(parseNumberedResult('1\tonly one line')).toBeNull();
  });

  it('stops at a non-consecutive number', () => {
    const parsed = parseNumberedResult('1\ta\n2\tb\n9\tc');
    expect(parsed?.code).toBe('a\nb');
    expect(parsed?.tail).toBe('9\tc');
  });

  it('handles space-padded line numbers', () => {
    const parsed = parseNumberedResult('     9\tfoo\n    10\tbar');
    expect(parsed?.startLine).toBe(9);
    expect(parsed?.code).toBe('foo\nbar');
  });
});

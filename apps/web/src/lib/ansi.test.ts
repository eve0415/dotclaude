import { describe, expect, it } from 'vitest';

import { hasAnsi, parseAnsi } from './ansi';

const ESC = '\u001B';

describe('hasAnsi', () => {
  it('detects escape bytes', () => {
    expect(hasAnsi('plain text')).toBe(false);
    expect(hasAnsi(`${ESC}[1mbold${ESC}[22m`)).toBe(true);
  });
});

describe('parseAnsi', () => {
  it('splits SGR bold spans — the /model output shape', () => {
    const text = `Set model to ${ESC}[1mFable 5${ESC}[22m for this session only with ${ESC}[1mmedium${ESC}[22m effort`;
    const segments = parseAnsi(text);
    expect(segments.map(s => [s.text, s.bold])).toEqual([
      ['Set model to ', false],
      ['Fable 5', true],
      [' for this session only with ', false],
      ['medium', true],
      [' effort', false],
    ]);
  });

  it('resets all attributes on SGR 0 and bare ESC[m', () => {
    expect(parseAnsi(`${ESC}[1;4mx${ESC}[0my`)).toEqual([
      { text: 'x', bold: true, dim: false, italic: false, underline: true },
      { text: 'y', bold: false, dim: false, italic: false, underline: false },
    ]);
    expect(parseAnsi(`${ESC}[1ma${ESC}[mb`).map(s => s.bold)).toEqual([true, false]);
  });

  it('tracks dim, italic, and underline independently', () => {
    const [seg] = parseAnsi(`${ESC}[2m${ESC}[3mfaint italics`);
    expect(seg).toEqual({ text: 'faint italics', bold: false, dim: true, italic: true, underline: false });
  });

  it('strips color codes without styling', () => {
    expect(parseAnsi(`${ESC}[31mred${ESC}[39m plain`)).toEqual([{ text: 'red plain', bold: false, dim: false, italic: false, underline: false }]);
  });

  it('drops non-SGR CSI, OSC, and dangling escapes', () => {
    expect(parseAnsi(`${ESC}[2Kcleared`)[0]?.text).toBe('cleared');
    expect(parseAnsi(`${ESC}]0;title\u0007after`)[0]?.text).toBe('after');
    expect(parseAnsi(`${ESC}]8;;url${ESC}\\link`)[0]?.text).toBe('link');
    expect(parseAnsi(`truncated ${ESC}[1`)[0]?.text).toBe('truncated ');
  });

  it('returns the whole string as one segment when no escapes exist', () => {
    expect(parseAnsi('hello\nworld')).toEqual([{ text: 'hello\nworld', bold: false, dim: false, italic: false, underline: false }]);
  });
});

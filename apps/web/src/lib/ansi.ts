/**
 * Minimal ANSI escape handling for transcript text. Slash-command stdout (and
 * occasionally tool output) carries SGR sequences — `ESC[1m` bold around model
 * names, for instance. We render the text attributes we care about and strip
 * everything else (colors, cursor movement, OSC titles) so no escape byte ever
 * reaches the DOM. New attributes: extend `AnsiStyle` + `applySgrCode`.
 */

const ESC = '\u001B';
const BEL = '\u0007';

export interface AnsiStyle {
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
}

export interface AnsiSegment extends AnsiStyle {
  text: string;
}

const DEFAULT_STYLE: AnsiStyle = { bold: false, dim: false, italic: false, underline: false };

/** Cheap pre-check so plain text skips parsing entirely. */
export const hasAnsi = (text: string): boolean => text.includes(ESC);

const applySgrCode = (style: AnsiStyle, code: number): AnsiStyle => {
  switch (code) {
    case 0:
      return DEFAULT_STYLE;
    case 1:
      return { ...style, bold: true };
    case 2:
      return { ...style, dim: true };
    case 3:
      return { ...style, italic: true };
    case 4:
      return { ...style, underline: true };
    case 21:
    case 22:
      return { ...style, bold: false, dim: false };
    case 23:
      return { ...style, italic: false };
    case 24:
      return { ...style, underline: false };
    default:
      // Colors and other attributes are recognized but intentionally unstyled.
      return style;
  }
};

const applySgr = (style: AnsiStyle, params: string): AnsiStyle => {
  let next = style;
  for (const part of (params === '' ? '0' : params).split(';')) {
    const code = Number(part === '' ? '0' : part);
    if (Number.isInteger(code)) next = applySgrCode(next, code);
  }
  return next;
};

/** CSI final bytes are 0x40–0x7e; everything before is parameter/intermediate. */
const isCsiFinal = (charCode: number): boolean => charCode >= 0x40 && charCode <= 0x7e;

/**
 * Split text into styled segments. SGR (`ESC[…m`) updates the running style;
 * all other escape sequences are dropped from the output.
 */
export const parseAnsi = (text: string): AnsiSegment[] => {
  const segments: AnsiSegment[] = [];
  let style = DEFAULT_STYLE;
  let plain = '';
  let i = 0;

  const flush = (): void => {
    if (plain === '') return;
    segments.push({ text: plain, ...style });
    plain = '';
  };

  while (i < text.length) {
    const char = text.charAt(i);
    if (char !== ESC) {
      plain += char;
      i += 1;
      continue;
    }
    const kind = text.charAt(i + 1);
    if (kind === '[') {
      let j = i + 2;
      while (j < text.length && !isCsiFinal(text.codePointAt(j) ?? 0)) j += 1;
      if (text.charAt(j) === 'm') {
        const next = applySgr(style, text.slice(i + 2, j));
        // Only split segments when the style actually changed — color-only
        // (unstyled) codes would otherwise fragment the text for nothing.
        if (next.bold !== style.bold || next.dim !== style.dim || next.italic !== style.italic || next.underline !== style.underline) {
          flush();
          style = next;
        }
      }
      i = j + 1;
    } else if (kind === ']') {
      // OSC — terminated by BEL or ST (ESC \).
      let j = i + 2;
      while (j < text.length && text.charAt(j) !== BEL && !(text.charAt(j) === ESC && text.charAt(j + 1) === '\\')) j += 1;
      i = text.charAt(j) === ESC ? j + 2 : j + 1;
    } else {
      // Two-character escape (ESC + one byte) — drop both.
      i += 2;
    }
  }
  flush();
  return segments;
};

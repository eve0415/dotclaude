import { describe, expect, it } from 'vitest';

import { parseHistoryLine } from './history';

describe('parseHistoryLine', () => {
  it('parses a history entry', () => {
    const entry = parseHistoryLine(
      JSON.stringify({ display: '/plugin', pastedContents: {}, timestamp: 1_776_403_384_830, project: '/workspaces/demo', sessionId: 'ed428fb4' }),
    );
    expect(entry?.display).toBe('/plugin');
    expect(entry?.project).toBe('/workspaces/demo');
  });

  it('returns undefined for corrupt lines', () => {
    expect(parseHistoryLine('nope')).toBeUndefined();
    expect(parseHistoryLine('')).toBeUndefined();
  });
});

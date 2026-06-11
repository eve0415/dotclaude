import { describe, expect, it } from 'vitest';

import { formatBytes, formatDuration, formatOffset, formatTokens, formatUsd, shortModelName } from './format';

describe('formatTokens', () => {
  it('scales to k and M', () => {
    expect(formatTokens(950)).toBe('950');
    expect(formatTokens(1500)).toBe('1.5k');
    expect(formatTokens(25_000)).toBe('25k');
    expect(formatTokens(1_500_000)).toBe('1.5M');
    expect(formatTokens(25_000_000)).toBe('25M');
  });
});

describe('formatUsd', () => {
  it('adapts precision to magnitude and handles unknown', () => {
    expect(formatUsd()).toBe('n/a');
    expect(formatUsd(0.0123)).toBe('$0.012');
    expect(formatUsd(12.345)).toBe('$12.35');
    expect(formatUsd(1234)).toBe('$1234');
  });
});

describe('formatBytes', () => {
  it('scales units', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(4_400_000)).toBe('4.4 MB');
  });
});

describe('formatDuration', () => {
  it('formats seconds, minutes, hours', () => {
    expect(formatDuration()).toBe('—');
    expect(formatDuration(42_000)).toBe('42s');
    expect(formatDuration(125_000)).toBe('2m 5s');
    expect(formatDuration(7_500_000)).toBe('2h 5m');
  });
});

describe('formatOffset', () => {
  it('formats relative offsets for the timeline gutter', () => {
    expect(formatOffset(3000)).toBe('+3s');
    expect(formatOffset(125_000)).toBe('+2m 05s');
    expect(formatOffset(3_725_000)).toBe('+1h 02m');
  });
});

describe('shortModelName', () => {
  it('shortens known claude ids including suffixed ones', () => {
    expect(shortModelName('claude-opus-4-6')).toBe('opus 4.6');
    expect(shortModelName('claude-opus-4-6[1m]')).toBe('opus 4.6');
    expect(shortModelName('claude-haiku-4-5-20251001')).toBe('haiku 4.5');
    expect(shortModelName('claude-fable-5')).toBe('fable 5');
    expect(shortModelName('<synthetic>')).toBe('<synthetic>');
  });
});

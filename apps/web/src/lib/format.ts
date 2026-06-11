/** Display formatting shared across views. */

export const formatTokens = (tokens: number): string => {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens >= 10_000_000 ? 0 : 1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(tokens >= 10_000 ? 0 : 1)}k`;
  return `${tokens}`;
};

export const formatUsd = (usd?: number): string => {
  if (usd === undefined) return 'n/a';
  if (usd >= 100) return `$${usd.toFixed(0)}`;
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(3)}`;
};

export const formatBytes = (bytes: number): string => {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1000) return `${(bytes / 1000).toFixed(1)} kB`;
  return `${bytes} B`;
};

export const formatDuration = (ms?: number): string => {
  if (ms === undefined) return '—';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

/** Relative offset from session start, for the transcript timeline gutter. */
export const formatOffset = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `+${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `+${minutes}m ${`${seconds % 60}`.padStart(2, '0')}s`;
  const hours = Math.floor(minutes / 60);
  return `+${hours}h ${`${minutes % 60}`.padStart(2, '0')}m`;
};

export const formatDateTime = (iso: string | undefined): string => {
  if (iso === undefined) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const formatRelativeTime = (timestamp: number | string | undefined): string => {
  if (timestamp === undefined) return '—';
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  if (Number.isNaN(time)) return '—';
  const deltaSeconds = Math.round((time - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const abs = Math.abs(deltaSeconds);
  if (abs < 60) return formatter.format(deltaSeconds, 'second');
  if (abs < 3600) return formatter.format(Math.round(deltaSeconds / 60), 'minute');
  if (abs < 86_400) return formatter.format(Math.round(deltaSeconds / 3600), 'hour');
  if (abs < 86_400 * 30) return formatter.format(Math.round(deltaSeconds / 86_400), 'day');
  return formatter.format(Math.round(deltaSeconds / (86_400 * 30)), 'month');
};

/** `claude-opus-4-6[1m]` → `opus 4.6`. Falls back to the raw id for unknown shapes. */
export const shortModelName = (model: string): string => {
  const match = /^claude-([a-z]+)-(\d+)(?:-(\d+))?/.exec(model);
  if (match === null) return model;
  const [, family, major, minor] = match;
  return minor === undefined ? `${family} ${major}` : `${family} ${major}.${minor}`;
};

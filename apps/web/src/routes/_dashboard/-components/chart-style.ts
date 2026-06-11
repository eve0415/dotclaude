/** Shared recharts styling, hoisted so JSX props are referentially stable. */

export const tooltipContentStyle = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--popover-foreground)',
  boxShadow: '0 4px 16px oklch(0 0 0 / 0.12)',
  padding: '8px 12px',
} as const;

/** Item text in popover-foreground (not series color) so every row passes AA on the popover. */
export const tooltipItemStyle = { color: 'var(--popover-foreground)', padding: '1px 0' } as const;

export const tooltipLabelStyle = { color: 'var(--muted-foreground)', fontWeight: 500, marginBottom: 4 } as const;

export const legendWrapperStyle = { fontSize: 11, paddingTop: 4 } as const;

export const axisTickStyle = { fontSize: 11, fill: 'var(--muted-foreground)' } as const;

export const barCursorStyle = { fill: 'var(--muted)', opacity: 0.4 } as const;

export const chartMargin = { top: 4, right: 4, bottom: 0, left: 0 } as const;

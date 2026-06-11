import type { LucideIcon } from 'lucide-react';

import { BookText, ChartColumn, FolderGit2, Gauge, History } from 'lucide-react';

/**
 * Top-level navigation targets. Declared `as const` so each `to` keeps its literal
 * type and `<Link to>` type-checks against the generated route tree.
 */
export const navItems = [
  { to: '/overview', label: 'Overview', icon: Gauge },
  { to: '/projects', label: 'Projects', icon: FolderGit2 },
  { to: '/usage', label: 'Usage', icon: ChartColumn },
  { to: '/memory', label: 'Memory', icon: BookText },
  { to: '/history', label: 'History', icon: History },
] as const satisfies readonly { to: string; label: string; icon: LucideIcon }[];

export type NavItem = (typeof navItems)[number];

import { cn } from '@dotclaude/ui/lib/utils';

interface AppMarkProps {
  className?: string;
}

export const AppMark = ({ className }: AppMarkProps) => <img src='/icon.svg' alt='' aria-hidden className={cn('block shrink-0', className)} />;

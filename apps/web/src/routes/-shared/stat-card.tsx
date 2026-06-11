import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@dotclaude/ui/components/card';

interface StatCardProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}

export const StatCard = ({ label, value, detail }: StatCardProps) => (
  <Card className='h-full'>
    <CardHeader className='pb-1'>
      <CardTitle className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className='text-2xl font-semibold tabular-nums'>{value}</div>
      {detail === undefined ? null : <div className='text-muted-foreground mt-1 text-xs'>{detail}</div>}
    </CardContent>
  </Card>
);

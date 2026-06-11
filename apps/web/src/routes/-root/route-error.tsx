import type { ErrorComponentProps } from '@tanstack/react-router';

export const RouteError = ({ error }: ErrorComponentProps) => (
  <div role='alert' className='border-destructive/40 mx-auto mt-16 max-w-lg rounded-lg border p-6'>
    <h1 className='text-lg font-semibold'>Something went wrong</h1>
    <p className='text-muted-foreground mt-2 text-sm break-words'>{error.message}</p>
  </div>
);

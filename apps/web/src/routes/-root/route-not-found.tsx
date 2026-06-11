import { Link } from '@tanstack/react-router';

export const RouteNotFound = () => (
  <div className='border-border mx-auto mt-16 max-w-lg rounded-lg border p-6'>
    <h1 className='text-lg font-semibold'>Page not found</h1>
    <p className='text-muted-foreground mt-2 text-sm'>
      Nothing lives at this address.{' '}
      <Link to='/' className='text-foreground underline underline-offset-2'>
        Back to the dashboard
      </Link>
      .
    </p>
  </div>
);

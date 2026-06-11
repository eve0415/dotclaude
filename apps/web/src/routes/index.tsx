import { createFileRoute } from '@tanstack/react-router';

const Home = () => (
  <main className='flex min-h-screen items-center justify-center'>
    <h1 className='text-2xl font-semibold'>dotclaude</h1>
  </main>
);

export const Route = createFileRoute('/')({
  component: Home,
});

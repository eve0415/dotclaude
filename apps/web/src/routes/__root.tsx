import type { QueryClient } from '@tanstack/react-query';

import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router';

import rootCss from './__root.css?url';

const bodyStyle = { fontFamily: 'Geist, sans-serif' };

const RootComponent = () => (
  <html lang='en' className='dark'>
    <head>
      <HeadContent />
    </head>
    <body className='bg-background text-foreground min-h-screen antialiased' style={bodyStyle}>
      <Outlet />
      <Scripts />
    </body>
  </html>
);

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [{ charSet: 'utf8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }, { title: 'dotclaude' }],
    links: [
      { rel: 'stylesheet', href: rootCss },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap',
      },
    ],
  }),
  component: RootComponent,
});

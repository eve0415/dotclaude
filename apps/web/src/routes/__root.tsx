import type { QueryClient } from '@tanstack/react-query';

import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router';

import { DataSourceProvider } from '#lib/data/data-source';

import { ThemeProvider } from './-root/theme-provider';
import rootCss from './__root.css?url';

const bodyStyle = { fontFamily: 'Geist, sans-serif' };

const RootComponent = () => (
  <html lang='en' suppressHydrationWarning>
    <head>
      <HeadContent />
    </head>
    <body className='bg-background text-foreground min-h-screen antialiased' style={bodyStyle}>
      <ThemeProvider>
        <DataSourceProvider>
          <Outlet />
        </DataSourceProvider>
      </ThemeProvider>
      <Scripts />
    </body>
  </html>
);

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf8' },
      // Browser-level enforcement of the privacy promise: connect-src 'self' makes
      // it impossible for any script to send data to another origin. 'unsafe-inline'
      // for scripts is required by the router's SSR hydration payload. Dev is
      // excluded so Vite HMR keeps working.
      ...(import.meta.env.PROD
        ? [
            {
              'http-equiv': 'Content-Security-Policy',
              content:
                "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'",
            },
          ]
        : []),
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'dotclaude — Claude Code session explorer' },
      { name: 'description', content: 'Visualize your Claude Code sessions, tool calls, token usage, and memories. Everything stays in your browser.' },
    ],
    links: [{ rel: 'stylesheet', href: rootCss }],
  }),
  component: RootComponent,
});

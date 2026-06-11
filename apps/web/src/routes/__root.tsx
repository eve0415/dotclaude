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
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'dotclaude — Claude Code session explorer' },
      { name: 'description', content: 'Visualize your Claude Code sessions, tool calls, token usage, and memories. Everything stays in your browser.' },
    ],
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

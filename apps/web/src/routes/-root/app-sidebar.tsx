import { Badge } from '@dotclaude/ui/components/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@dotclaude/ui/components/sidebar';
import { Link, useLocation } from '@tanstack/react-router';
import { FolderOpen, RefreshCw, Unplug } from 'lucide-react';
import { useCallback } from 'react';

import { useDataSource } from '#lib/data/data-source';

import { AppMark } from './app-mark';
import { navItems } from './nav-items';
import { ThemeToggle } from './theme-toggle';

export const AppSidebar = () => {
  const location = useLocation();
  const { index, refresh, close, source } = useDataSource();
  const canRefresh = source?.kind === 'directory-handle';
  const onRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);
  const onDisconnect = useCallback(() => {
    void close();
  }, [close]);

  return (
    <Sidebar collapsible='icon'>
      {/* Single navigation landmark around the whole sidebar so all of it is grouped
          for assistive tech; label unique vs the header breadcrumb nav. */}
      <nav aria-label='Primary' className='flex size-full flex-col'>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size='lg' render={<Link to='/' />}>
                <AppMark className='size-8' />
                <div className='flex flex-col gap-0.5 leading-none'>
                  <span className='font-semibold'>dotclaude</span>
                  <span className='text-muted-foreground text-xs'>session explorer</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map(item => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton isActive={location.pathname.startsWith(item.to)} tooltip={item.label} render={<Link to={item.to} />}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Data source</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <div className='text-muted-foreground flex items-center gap-2 px-2 py-1 text-xs group-data-[collapsible=icon]:hidden'>
                    <FolderOpen aria-hidden className='size-3.5 shrink-0' />
                    <span className='truncate'>
                      {index === undefined ? 'nothing open' : `${index.sessionCount} sessions · ${index.projects.length} projects`}
                    </span>
                    <Badge variant='outline' className='ml-auto shrink-0 text-[10px]'>
                      local
                    </Badge>
                  </div>
                </SidebarMenuItem>
                {canRefresh ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip='Rescan directory' onClick={onRefresh}>
                      <RefreshCw />
                      <span>Rescan</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip='Disconnect data' onClick={onDisconnect}>
                    <Unplug />
                    <span>Disconnect</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className='flex items-center justify-center p-2'>
            <ThemeToggle />
          </div>
        </SidebarFooter>

        <SidebarRail />
      </nav>
    </Sidebar>
  );
};

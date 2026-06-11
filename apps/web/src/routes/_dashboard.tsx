import { Separator } from '@dotclaude/ui/components/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@dotclaude/ui/components/sidebar';
import { Navigate, Outlet, createFileRoute } from '@tanstack/react-router';

import { useDataSource } from '#lib/data/data-source';

import { AppSidebar } from './-root/app-sidebar';
import { Breadcrumbs } from './-root/breadcrumbs';

const DashboardLayout = () => {
  const { source } = useDataSource();

  // Data lives only in memory — a reload (or deep link) without an open source
  // must land on the picker, not an empty dashboard.
  if (source === undefined) return <Navigate to='/' />;

  return (
    <SidebarProvider>
      <AppSidebar />
      {/* min-w-0 lets the inset shrink below its content's min-content width
          (flex min-width:auto trap) so wide tables can't force page scroll. */}
      <SidebarInset className='min-w-0'>
        <header className='flex h-12 shrink-0 items-center gap-2 border-b px-4'>
          <SidebarTrigger className='-ml-1 shrink-0' />
          <Separator orientation='vertical' className='mr-2 !h-4 shrink-0 !self-center' />
          <div className='min-w-0 flex-1'>
            <Breadcrumbs />
          </div>
        </header>
        <div className='flex-1 p-6'>
          <div className='mx-auto w-full max-w-[1600px]'>
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export const Route = createFileRoute('/_dashboard')({
  component: DashboardLayout,
});

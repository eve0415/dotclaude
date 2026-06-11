import { decodeProjectDirName, projectLabel } from '@dotclaude/schemas/project';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@dotclaude/ui/components/breadcrumb';
import { Link, useLocation } from '@tanstack/react-router';
import { Fragment } from 'react';

import { navItems } from './nav-items';

interface Crumb {
  label: string;
  to: string | undefined;
}

const crumbsFor = (pathname: string): Crumb[] => {
  const nav = navItems.find(item => pathname.startsWith(item.to));
  if (nav !== undefined) {
    if (pathname === nav.to) return [{ label: nav.label, to: undefined }];
    const rest = decodeURIComponent(pathname.slice(nav.to.length + 1));
    const label = nav.to === '/projects' ? projectLabel(decodeProjectDirName(rest)) : rest;
    return [
      { label: nav.label, to: nav.to },
      { label, to: undefined },
    ];
  }
  if (pathname.startsWith('/sessions/')) {
    const sessionId = decodeURIComponent(pathname.slice('/sessions/'.length));
    return [
      { label: 'Projects', to: '/projects' },
      { label: `session ${sessionId.slice(0, 8)}`, to: undefined },
    ];
  }
  return [{ label: 'dotclaude', to: undefined }];
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const crumbs = crumbsFor(location.pathname);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <Fragment key={`${crumb.label}-${i}`}>
            {i > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem className='min-w-0'>
              {crumb.to === undefined ? (
                <BreadcrumbPage className='truncate'>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link to={crumb.to} />}>{crumb.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

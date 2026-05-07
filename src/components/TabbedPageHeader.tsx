import type { ReactNode } from 'react';
import { cn, pageTitleClass } from '../helpers/uiClasses';
import { MobileNavigationTrigger } from './MobileNavigationTrigger';

export function TabbedPageHeader({
  actions,
  contentClassName,
  title
}: {
  actions?: ReactNode;
  contentClassName?: string;
  title: string;
}) {
  return (
    <header className="mb-6 min-[900px]:mb-8">
      <div
        className={cn(
          'flex min-h-[2.4rem] items-center gap-3 min-[900px]:min-h-[2.55rem]',
          contentClassName
        )}
      >
        <div className="flex min-w-0 items-center gap-3 min-[900px]:shrink-0">
          <MobileNavigationTrigger className="min-[720px]:hidden" />
          <div className="min-w-0 min-[900px]:shrink-0">
            <h1 className={pageTitleClass}>{title}</h1>
          </div>
        </div>
        {actions}
      </div>
    </header>
  );
}

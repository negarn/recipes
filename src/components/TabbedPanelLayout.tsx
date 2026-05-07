import type { ReactNode } from 'react';
import {
  cn,
  tabbedNavigationClass,
  tabbedPageShellClass,
  tabbedPanelClass,
  tabbedPanelWrapClass
} from '../helpers/uiClasses';
import { NavigationMenu } from './NavigationMenu';
import { MobileNavigationProvider } from './MobileNavigationContext';

type TabbedPanelBackgroundVariant = 'default' | 'home' | 'none';

const tabbedPanelBackgroundClasses: Record<
  Exclude<TabbedPanelBackgroundVariant, 'none'>,
  string[]
> = {
  default: [],
  home: []
};

export function TabbedPanelLayout({
  backgroundVariant = 'none',
  children,
  panelClassName
}: {
  backgroundVariant?: TabbedPanelBackgroundVariant;
  children: ReactNode;
  panelClassName?: string;
}) {
  return (
    <MobileNavigationProvider>
      <div className={tabbedPageShellClass}>
        <main className="grid gap-6">
          <div className={tabbedPanelWrapClass}>
            <NavigationMenu className={tabbedNavigationClass} />
            <section className={cn(tabbedPanelClass, panelClassName)}>
              {backgroundVariant !== 'none'
                ? tabbedPanelBackgroundClasses[backgroundVariant].map((backgroundClassName) => (
                    <div key={backgroundClassName} className={backgroundClassName} />
                  ))
                : null}
              <div className="relative z-10 flex min-h-full flex-col">{children}</div>
            </section>
          </div>
        </main>
      </div>
    </MobileNavigationProvider>
  );
}

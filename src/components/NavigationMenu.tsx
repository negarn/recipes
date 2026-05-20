import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useMealPlanDataContext } from '../contexts/RecipeAppDataContext';
import {
  appRoutePaths,
  cookedHistoryRoutePath,
  getActiveNavigationRouteId,
  type NavigationRouteId
} from '../helpers/appRoutes';
import { readJsonStorageValue, writeJsonStorageValue } from '../helpers/jsonStorage';
import { cn } from '../helpers/uiClasses';
import { BookmarkShortcutIcon } from './BookmarkShortcutIcon';
import { CookedHistoryShortcutIcon } from './CookedHistoryShortcutIcon';
import { HomeShortcutIcon } from './HomeShortcutIcon';
import { MealPlanShortcutIcon } from './MealPlanShortcutIcon';
import { useMobileNavigation } from './MobileNavigationContext';
import { ShoppingListShortcutIcon } from './ShoppingListShortcutIcon';
import { SettingsShortcutIcon } from './SettingsShortcutIcon';

const LAST_HOME_ROUTE_STORAGE_KEY = 'navigation:last-home-route';

const navigationMenuShellClass =
  'relative hidden items-end gap-[0.22rem] min-[720px]:inline-flex min-[720px]:gap-[0.34rem]';

const navigationMenuItemBaseClass =
  'relative inline-flex h-[2.82rem] w-[3.22rem] shrink-0 cursor-pointer items-center justify-center rounded-t-[18px] border border-app-line border-b-0 px-[0.56rem] pb-[0.52rem] pt-[0.44rem] text-[0.88rem] font-semibold tracking-[-0.01em] transition focus-visible:outline-none min-[720px]:h-[3.05rem] min-[720px]:w-[3.8rem] min-[720px]:rounded-t-[20px] min-[720px]:px-[0.76rem] min-[720px]:pb-[0.62rem] min-[720px]:pt-[0.52rem] min-[720px]:text-[0.94rem]';
const desktopNavigationShellClass =
  'hidden min-[720px]:contents';
const mobileNavigationDrawerOverlayClass =
  'fixed inset-0 cursor-pointer bg-[rgba(22,32,25,0.28)] backdrop-blur-[3px]';
const mobileNavigationDrawerPanelClass =
  'relative z-10 flex h-[100dvh] w-[min(16rem,calc(100vw-4rem))] max-w-full flex-col border-r border-app-line-strong bg-app-surface-strong shadow-[0_24px_60px_rgba(22,32,25,0.22)] backdrop-blur-[18px] transform-gpu transition-transform duration-300 ease-out motion-reduce:duration-0 motion-reduce:transition-none';
const mobileNavigationItemClass =
  'flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-[16px] px-4 py-3 text-[0.94rem] font-semibold leading-none text-app-ink-soft transition hover:bg-app-button-tint hover:text-app-brand-strong focus-visible:bg-app-button-tint focus-visible:text-app-brand-strong focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring)] focus-visible:outline-none';

type NavigationItemDefinition = {
  getAriaLabel: (plannedMealCount: number) => string;
  icon: (plannedMealCount: number) => ReactNode;
  id: NavigationRouteId;
  title: string;
  to: string;
  mobileIcon: (plannedMealCount: number) => ReactNode;
};

function getMealPlanAriaLabel(plannedMealCount: number) {
  return plannedMealCount === 1
    ? 'Open meal plan, 1 meal planned'
    : `Open meal plan, ${plannedMealCount} meals planned`;
}

const navigationItemDefinitions = [
  {
    getAriaLabel: () => 'Go to recipes',
    icon: () => (
      <HomeShortcutIcon className="size-[1.5rem] translate-y-[0.12rem] min-[720px]:size-[1.72rem] min-[720px]:translate-y-[0.14rem]" />
    ),
    mobileIcon: () => <HomeShortcutIcon className="size-[1.5rem]" />,
    id: 'home',
    title: 'Recipes',
    to: appRoutePaths.home
  },
  {
    getAriaLabel: getMealPlanAriaLabel,
    icon: (plannedMealCount) => (
      <MealPlanShortcutIcon
        className="size-[1.48rem] translate-y-[0.12rem] min-[720px]:size-[1.7rem] min-[720px]:translate-y-[0.14rem]"
        plannedMealCount={plannedMealCount}
      />
    ),
    mobileIcon: (plannedMealCount) => (
      <MealPlanShortcutIcon className="size-[1.48rem]" plannedMealCount={plannedMealCount} />
    ),
    id: 'meal-plan',
    title: 'Meal plan',
    to: appRoutePaths.mealPlan
  },
  {
    getAriaLabel: () => 'Open shopping list',
    icon: () => (
      <ShoppingListShortcutIcon className="size-[1.64rem] translate-y-[0.12rem] min-[720px]:size-[1.86rem] min-[720px]:translate-y-[0.14rem]" />
    ),
    mobileIcon: () => <ShoppingListShortcutIcon className="size-[1.64rem]" />,
    id: 'shopping-list',
    title: 'Shopping list',
    to: appRoutePaths.shoppingList
  },
  {
    getAriaLabel: () => 'Open cooked meal history',
    icon: () => (
      <CookedHistoryShortcutIcon className="size-[1.72rem] translate-y-[0.12rem] min-[720px]:size-[2rem] min-[720px]:translate-y-[0.14rem]" />
    ),
    mobileIcon: () => <CookedHistoryShortcutIcon className="size-[1.72rem]" />,
    id: 'cooked-history',
    title: 'Cooked history',
    to: cookedHistoryRoutePath
  },
  {
    getAriaLabel: () => 'Open bookmarks',
    icon: () => (
      <BookmarkShortcutIcon className="size-[1.52rem] translate-y-[0.12rem] min-[720px]:size-[1.74rem] min-[720px]:translate-y-[0.14rem]" />
    ),
    mobileIcon: () => <BookmarkShortcutIcon className="size-[1.52rem]" />,
    id: 'bookmarks',
    title: 'Bookmarks',
    to: appRoutePaths.bookmarks
  },
  {
    getAriaLabel: () => 'Open settings',
    icon: () => (
      <SettingsShortcutIcon className="size-[1.46rem] translate-y-[0.12rem] min-[720px]:size-[1.68rem] min-[720px]:translate-y-[0.14rem]" />
    ),
    mobileIcon: () => <SettingsShortcutIcon className="size-[1.46rem]" />,
    id: 'settings',
    title: 'Settings',
    to: appRoutePaths.settings
  }
] as const satisfies ReadonlyArray<NavigationItemDefinition>;

function getNavigationMenuItemClass(isActive: boolean) {
  return cn(
    navigationMenuItemBaseClass,
    isActive
      ? "z-20 translate-y-[1px] bg-app-surface-strong text-app-ink after:absolute after:bottom-[-2px] after:left-px after:right-px after:h-[6px] after:bg-app-surface-strong after:content-[''] focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring)]"
      : 'z-0 translate-y-[0.34rem] bg-app-button-surface text-app-muted-soft shadow-[0_2px_8px_rgba(22,32,25,0.022)] hover:bg-app-surface hover:text-app-brand-strong hover:shadow-[0_3px_10px_rgba(22,32,25,0.03)] focus-visible:bg-app-surface focus-visible:text-app-brand-strong focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring),0_3px_10px_rgba(22,32,25,0.03)]'
  );
}

function getNavigationItemTo(
  item: NavigationItemDefinition,
  activeRouteId: NavigationRouteId,
  currentHomeRoutePath: string,
  lastHomeRoutePath: string
) {
  return item.id === 'home'
    ? activeRouteId === 'home'
      ? currentHomeRoutePath
      : lastHomeRoutePath
    : item.to;
}

function readLastHomeRoutePath() {
  const storedValue = readJsonStorageValue(LAST_HOME_ROUTE_STORAGE_KEY);

  return typeof storedValue === 'string' && storedValue.startsWith('/')
    ? storedValue
    : appRoutePaths.home;
}

export function NavigationMenu({
  className
}: {
  className?: string;
}) {
  const location = useLocation();
  const { plannedMealCount } = useMealPlanDataContext();
  const { closeMobileMenu, isMobileMenuOpen, mobileMenuId } = useMobileNavigation();
  const [lastHomeRoutePath, setLastHomeRoutePath] = useState(readLastHomeRoutePath);
  const activeRouteId = getActiveNavigationRouteId(location);
  const currentHomeRoutePath = `${appRoutePaths.home}${location.search}`;
  const mobileDrawerWrapperRef = useRef<HTMLDivElement | null>(null);
  const mobileDrawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (location.pathname !== appRoutePaths.home) {
      return;
    }

    if (lastHomeRoutePath === currentHomeRoutePath) {
      return;
    }

    setLastHomeRoutePath(currentHomeRoutePath);
    writeJsonStorageValue(LAST_HOME_ROUTE_STORAGE_KEY, currentHomeRoutePath);
  }, [currentHomeRoutePath, lastHomeRoutePath, location.pathname]);

  useEffect(() => {
    closeMobileMenu();
  }, [closeMobileMenu, location.pathname, location.search]);

  useEffect(() => {
    const drawerWrapperElement = mobileDrawerWrapperRef.current;

    if (!drawerWrapperElement) {
      return;
    }

    drawerWrapperElement.inert = !isMobileMenuOpen;
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }

    const drawerElement = mobileDrawerRef.current;
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;

    function getFocusableElements() {
      if (!drawerElement) {
        return [];
      }

      return Array.from(
        drawerElement.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute('aria-hidden'));
    }

    function focusInitialElement() {
      const [firstFocusableElement] = getFocusableElements();
      (firstFocusableElement ?? drawerElement)?.focus();
    }

    function handleWindowKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobileMenu();
        return;
      }

      if (event.key !== 'Tab' || !drawerElement) {
        return;
      }

      const focusableElements = getFocusableElements();

      if (!focusableElements.length) {
        event.preventDefault();
        drawerElement.focus();
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!drawerElement.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastFocusableElement : firstFocusableElement).focus();
        return;
      }

      if (
        event.shiftKey &&
        (activeElement === firstFocusableElement || activeElement === drawerElement)
      ) {
        event.preventDefault();
        lastFocusableElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleWindowKeyDown);

    const focusAnimationFrameId = window.requestAnimationFrame(() => {
      focusInitialElement();
    });

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener('keydown', handleWindowKeyDown);
      window.cancelAnimationFrame(focusAnimationFrameId);

      if (previouslyFocusedElement?.isConnected) {
        previouslyFocusedElement.focus();
      }
    };
  }, [isMobileMenuOpen]);

  const mobileDrawerPortal =
    typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={mobileDrawerWrapperRef}
            className={cn('fixed inset-0 z-[120]', isMobileMenuOpen ? '' : 'pointer-events-none')}
            aria-hidden={!isMobileMenuOpen}
            onClick={() => {
              closeMobileMenu();
            }}
          >
            <div
              aria-hidden="true"
              className={cn(
                mobileNavigationDrawerOverlayClass,
                isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
              )}
            />

            <div className="relative flex h-full justify-start">
              <div
                ref={mobileDrawerRef}
                id={mobileMenuId}
                role="dialog"
                aria-modal="true"
                aria-label="Primary navigation"
                tabIndex={-1}
                className={cn(
                  mobileNavigationDrawerPanelClass,
                  isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                )}
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <nav
                  className="grid gap-1.5 overflow-y-auto px-3 py-4"
                  aria-label="Primary navigation"
                >
                  {navigationItemDefinitions.map((item) => {
                    const to = getNavigationItemTo(
                      item,
                      activeRouteId,
                      currentHomeRoutePath,
                      lastHomeRoutePath
                    );

                    return (
                      <Link
                        key={item.id}
                        className={cn(
                          mobileNavigationItemClass,
                          activeRouteId === item.id &&
                            'bg-app-surface-tint text-app-brand-strong shadow-[inset_0_0_0_1px_var(--color-app-line-strong)]'
                        )}
                        to={to}
                        aria-label={item.getAriaLabel(plannedMealCount)}
                        aria-current={activeRouteId === item.id ? 'page' : undefined}
                        title={item.title}
                        onClick={() => {
                          closeMobileMenu();
                        }}
                      >
                        {item.mobileIcon(plannedMealCount)}
                        <span className="min-w-0 flex-1 truncate leading-none">{item.title}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <nav className={cn(navigationMenuShellClass, className)} aria-label="Primary">
      <div className={desktopNavigationShellClass}>
        {navigationItemDefinitions.map((item) => {
          const to = getNavigationItemTo(
            item,
            activeRouteId,
            currentHomeRoutePath,
            lastHomeRoutePath
          );

          return (
            <Link
              key={item.id}
              className={getNavigationMenuItemClass(activeRouteId === item.id)}
              to={to}
              aria-label={item.getAriaLabel(plannedMealCount)}
              aria-current={activeRouteId === item.id ? 'page' : undefined}
              title={item.title}
            >
              {item.icon(plannedMealCount)}
            </Link>
          );
        })}
      </div>
      {mobileDrawerPortal}
    </nav>
  );
}

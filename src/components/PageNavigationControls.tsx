import type { ReactNode } from 'react';
import { ChevronIcon } from './ChevronIcon';
import { IconActionButton } from './IconActionButton';
import { cn, elevatedBrandIconActionButtonClass } from '../helpers/uiClasses';

type PageNavigationControlsProps = {
  ariaLabel: string;
  children: ReactNode;
  isNextDisabled?: boolean;
  isPreviousDisabled?: boolean;
  onNext: () => void;
  onPrevious: () => void;
};

export function PageNavigationControls({
  ariaLabel,
  children,
  isNextDisabled = false,
  isPreviousDisabled = false,
  onNext,
  onPrevious
}: PageNavigationControlsProps) {
  return (
    <nav
      className="fixed bottom-4 left-1/2 z-30 inline-flex w-fit max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center justify-center gap-3"
      aria-label={ariaLabel}
    >
      <IconActionButton
        className={cn(elevatedBrandIconActionButtonClass, 'size-[2rem] text-[1.15rem]')}
        onClick={onPrevious}
        disabled={isPreviousDisabled}
        label="Go to previous page"
        useBaseStyles={false}
      >
        <ChevronIcon className="size-[1.15rem]" />
      </IconActionButton>

      <div className="flex min-w-0 flex-none justify-center whitespace-nowrap text-center">
        {children}
      </div>

      <IconActionButton
        className={cn(elevatedBrandIconActionButtonClass, 'size-[2rem] text-[1.15rem]')}
        onClick={onNext}
        disabled={isNextDisabled}
        label="Go to next page"
        useBaseStyles={false}
      >
        <ChevronIcon direction="right" className="size-[1.15rem]" />
      </IconActionButton>
    </nav>
  );
}

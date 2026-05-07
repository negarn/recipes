import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { InfoIcon } from './InfoIcon';
import { IconActionButton } from './IconActionButton';
import { cn } from '../helpers/uiClasses';

const sourceDisclosureButtonClass =
  'inline-flex size-[1.62rem] items-center justify-center rounded-[10px] bg-transparent text-app-muted-soft transition enabled:cursor-pointer enabled:hover:text-app-brand-strong enabled:focus-visible:text-app-brand-strong enabled:focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring)] disabled:cursor-default disabled:opacity-45 focus-visible:outline-none';
const sourceDisclosurePopoverClass =
  'absolute right-0 top-[calc(100%+0.22rem)] z-20 w-[18rem] max-w-[calc(100vw-4rem)] cursor-default rounded-[18px] border border-app-field-border bg-app-surface-strong p-3 shadow-[0_16px_32px_rgba(31,64,54,0.12)]';
export const sourceDisclosureContentClass =
  'grid gap-2 text-[0.88rem] leading-[1.45] text-app-muted';
export const sourceDisclosureLinkClass =
  'inline-block w-fit max-w-full cursor-pointer rounded-[8px] transition hover:text-app-brand-strong focus-visible:text-app-brand-strong focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring)] focus-visible:outline-none';

type SourceDisclosurePopoverProps = {
  buttonClassName?: string;
  buttonIconClassName?: string;
  buttonLabel: string;
  children: ReactNode;
  className?: string;
  dataAttributes?: Record<string, string>;
  disabled?: boolean;
  id: string;
  isOpen: boolean;
  onToggle: () => void;
  popoverClassName?: string;
};

export function SourceDisclosurePopover({
  buttonClassName,
  buttonIconClassName = 'size-[1.62rem]',
  buttonLabel,
  children,
  className,
  dataAttributes,
  disabled,
  id,
  isOpen,
  onToggle,
  popoverClassName
}: SourceDisclosurePopoverProps) {
  function handleButtonClick(event: ReactMouseEvent<HTMLButtonElement>) {
    if (isOpen && event.detail > 0) {
      event.currentTarget.blur();
    }

    onToggle();
  }

  return (
    <div
      className={cn(
        'group/source relative inline-flex shrink-0 items-center justify-center',
        className
      )}
      {...dataAttributes}
    >
      <IconActionButton
        className={cn(sourceDisclosureButtonClass, buttonClassName)}
        onClick={handleButtonClick}
        disabled={disabled}
        label={buttonLabel}
        aria-controls={id}
        aria-expanded={isOpen}
        useBaseStyles={false}
      >
        <InfoIcon className={buttonIconClassName} isActive={isOpen} />
      </IconActionButton>

      {isOpen ? (
        <div id={id} className={cn(sourceDisclosurePopoverClass, popoverClassName)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

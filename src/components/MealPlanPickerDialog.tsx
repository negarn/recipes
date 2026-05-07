import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './CloseIcon';
import { MealPlanDatePicker } from './MealPlanDatePicker';
import { cn, displayHeadingClass, iconButtonClass } from '../helpers/uiClasses';

export type MealPlanPickerDialogProps = {
  dateActionLabelPrefix?: string;
  errorMessage?: string | null;
  headerLabel?: string;
  isSaving?: boolean;
  minDate: string;
  onClose: () => void;
  onMonthChange: (nextMonth: Date) => void;
  onSelectDate: (date: string) => void;
  title: string;
  visibleMonth: Date;
};

export function MealPlanPickerDialog({
  dateActionLabelPrefix,
  errorMessage,
  headerLabel,
  isSaving,
  minDate,
  onClose,
  onMonthChange,
  onSelectDate,
  title,
  visibleMonth
}: MealPlanPickerDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeHandlerRef = useRef(onClose);
  const dialogTitleId = useId();

  useEffect(() => {
    closeHandlerRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    function getFocusableElements() {
      if (!dialogElement) {
        return [];
      }

      return Array.from(
        dialogElement.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute('aria-hidden'));
    }

    function focusInitialElement() {
      if (closeButtonRef.current && !closeButtonRef.current.disabled) {
        closeButtonRef.current.focus();
        return;
      }

      const [firstFocusableElement] = getFocusableElements();
      (firstFocusableElement ?? dialogElement)?.focus();
    }

    function handleWindowKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeHandlerRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogElement) {
        return;
      }

      const focusableElements = getFocusableElements();

      if (!focusableElements.length) {
        event.preventDefault();
        dialogElement.focus();
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!dialogElement.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastFocusableElement : firstFocusableElement).focus();
        return;
      }

      if (
        event.shiftKey &&
        (activeElement === firstFocusableElement || activeElement === dialogElement)
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
    const focusAnimationFrameId = window.requestAnimationFrame(focusInitialElement);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleWindowKeyDown);
      window.cancelAnimationFrame(focusAnimationFrameId);
      previouslyFocusedElement?.focus();
    };
  }, []);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-[rgba(22,32,25,0.28)] backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div className="flex min-h-full items-start justify-center overflow-y-auto px-4 py-6 min-[720px]:items-center">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          tabIndex={-1}
          className="w-full max-w-[26rem] rounded-[30px] border border-app-line-strong bg-app-surface-strong p-4 shadow-[0_28px_60px_rgba(22,32,25,0.22)] max-h-[calc(100dvh-3rem)] overflow-y-auto min-[720px]:p-5"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="grid gap-1.5">
              <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-app-muted-soft">
                {headerLabel ?? 'Add to meal plan'}
              </p>
              <h2
                id={dialogTitleId}
                className={cn(
                  displayHeadingClass,
                  'm-0 text-[1.6rem] leading-[1.02] tracking-[-0.04em]'
                )}
              >
                {title}
              </h2>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              className={cn(iconButtonClass, 'size-[2.2rem] shrink-0 text-app-muted-soft')}
              onClick={onClose}
              disabled={isSaving}
              aria-label="Close meal plan dialog"
            >
              <CloseIcon className="size-[1.25rem]" />
            </button>
          </div>

          <MealPlanDatePicker
            visibleMonth={visibleMonth}
            minDate={minDate}
            isSaving={isSaving}
            errorMessage={errorMessage}
            onMonthChange={onMonthChange}
            onSelectDate={onSelectDate}
            selectDateLabelPrefix={dateActionLabelPrefix}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

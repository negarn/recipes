import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './CloseIcon';
import { InlineMessage } from './InlineMessage';
import { cn, displayHeadingClass, iconButtonClass } from '../helpers/uiClasses';

const deleteDialogButtonBaseClass =
  'inline-flex min-h-[2.75rem] items-center justify-center rounded-full border px-4 py-[0.56rem] font-bold transition focus-visible:outline-none enabled:cursor-pointer enabled:hover:-translate-y-px enabled:focus-visible:-translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none';

const deleteDialogCancelButtonClass = cn(
  deleteDialogButtonBaseClass,
  'border-app-line-strong bg-app-surface-tint text-app-brand-strong enabled:hover:bg-app-button-tint enabled:hover:shadow-[0_10px_22px_rgba(31,64,54,0.08)] enabled:focus-visible:bg-app-button-tint enabled:focus-visible:shadow-[0_10px_22px_rgba(31,64,54,0.08)]'
);

const deleteDialogConfirmButtonClass = cn(
  deleteDialogButtonBaseClass,
  'border-app-danger-line bg-app-danger-action-soft text-app-danger shadow-[0_10px_22px_rgba(102,47,34,0.1)] enabled:hover:bg-app-danger-action-soft-hover enabled:hover:shadow-[0_14px_24px_rgba(102,47,34,0.14)] enabled:focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring),0_14px_24px_rgba(102,47,34,0.14)]'
);

const deleteDialogCloseButtonClass = cn(
  iconButtonClass,
  'size-[2.2rem] shrink-0 text-app-muted-soft'
);

export type DeleteConfirmationDialogProps = {
  busyLabel?: string;
  confirmLabel: string;
  description: ReactNode;
  errorMessage?: string | null;
  headerLabel?: string;
  isBusy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: ReactNode;
};

export function DeleteConfirmationDialog({
  busyLabel,
  confirmLabel,
  description,
  errorMessage,
  headerLabel,
  isBusy = false,
  onCancel,
  onConfirm,
  title
}: DeleteConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeHandlerRef = useRef(onCancel);
  const busyRef = useRef(isBusy);
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const dialogErrorId = useId();

  useEffect(() => {
    closeHandlerRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    busyRef.current = isBusy;
  }, [isBusy]);

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
      if (cancelButtonRef.current && !cancelButtonRef.current.disabled) {
        cancelButtonRef.current.focus();
        return;
      }

      if (closeButtonRef.current && !closeButtonRef.current.disabled) {
        closeButtonRef.current.focus();
        return;
      }

      const [firstFocusableElement] = getFocusableElements();
      (firstFocusableElement ?? dialogElement)?.focus();
    }

    function handleWindowKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (busyRef.current) {
          return;
        }

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

      if (previouslyFocusedElement?.isConnected) {
        previouslyFocusedElement.focus();
      }
    };
  }, []);

  if (typeof document === 'undefined') {
    return null;
  }

  const describedByIds = [dialogDescriptionId, errorMessage ? dialogErrorId : null]
    .filter((id): id is string => Boolean(id))
    .join(' ');

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-[rgba(22,32,25,0.28)] backdrop-blur-[3px]"
      onClick={() => {
        if (!busyRef.current) {
          closeHandlerRef.current();
        }
      }}
    >
      <div className="flex min-h-full items-start justify-center overflow-y-auto px-4 py-6 min-[720px]:items-center">
        <div
          ref={dialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          aria-describedby={describedByIds || undefined}
          tabIndex={-1}
          className="w-full max-w-[28rem] rounded-[30px] border border-app-line-strong bg-app-surface-strong p-4 shadow-[0_28px_60px_rgba(22,32,25,0.22)] max-h-[calc(100dvh-3rem)] overflow-y-auto min-[720px]:p-5"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="grid gap-1.5">
              <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-app-muted-soft">
                {headerLabel ?? 'Delete item'}
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
              className={deleteDialogCloseButtonClass}
              onClick={() => {
                if (!busyRef.current) {
                  closeHandlerRef.current();
                }
              }}
              disabled={isBusy}
              aria-label="Close delete confirmation"
            >
              <CloseIcon className="size-[1.25rem]" />
            </button>
          </div>

          <div className="grid gap-4">
            <p
              id={dialogDescriptionId}
              className="m-0 text-[0.98rem] leading-[1.6] text-app-ink-soft"
            >
              {description}
            </p>

            {errorMessage ? <InlineMessage id={dialogErrorId}>{errorMessage}</InlineMessage> : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                ref={cancelButtonRef}
                type="button"
                className={deleteDialogCancelButtonClass}
                onClick={() => {
                  if (!busyRef.current) {
                    closeHandlerRef.current();
                  }
                }}
                disabled={isBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={deleteDialogConfirmButtonClass}
                onClick={onConfirm}
                disabled={isBusy}
              >
                {isBusy ? busyLabel ?? 'Deleting...' : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

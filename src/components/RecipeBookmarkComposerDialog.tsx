import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './CloseIcon';
import { InlineMessage } from './InlineMessage';
import { cn, displayHeadingClass, fieldClass, iconButtonClass, pillButtonClass } from '../helpers/uiClasses';

export type RecipeBookmarkComposerDialogProps = {
  errorMessage?: string | null;
  initialLabel: string;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (label: string) => void;
  selectedText: string;
};

export function RecipeBookmarkComposerDialog({
  errorMessage,
  initialLabel,
  isSaving,
  onClose,
  onSave,
  selectedText
}: RecipeBookmarkComposerDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const labelInputRef = useRef<HTMLInputElement | null>(null);
  const closeHandlerRef = useRef(onClose);
  const [labelDraft, setLabelDraft] = useState(initialLabel);
  const dialogTitleId = useId();

  useEffect(() => {
    closeHandlerRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    setLabelDraft(initialLabel);
  }, [initialLabel]);

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
      if (labelInputRef.current && !labelInputRef.current.disabled) {
        labelInputRef.current.focus();
        labelInputRef.current.select();
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextLabel = labelDraft.trim();

    if (!nextLabel || isSaving) {
      return;
    }

    onSave(nextLabel);
  }

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-[rgba(22,32,25,0.28)] backdrop-blur-[3px]"
      onClick={() => {
        if (!isSaving) {
          onClose();
        }
      }}
    >
      <div className="flex min-h-full items-start justify-center overflow-y-auto px-4 py-6 min-[720px]:items-center">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          tabIndex={-1}
          className="w-full max-w-[28rem] rounded-[30px] border border-app-line-strong bg-app-surface-strong p-4 shadow-[0_28px_60px_rgba(22,32,25,0.22)] max-h-[calc(100dvh-3rem)] overflow-y-auto min-[720px]:p-5"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="grid gap-1.5">
              <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-app-muted-soft">
                Save bookmark
              </p>
              <h2
                id={dialogTitleId}
                className={cn(
                  displayHeadingClass,
                  'm-0 text-[1.6rem] leading-[1.02] tracking-[-0.04em]'
                )}
              >
                Add a label
              </h2>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              className={cn(iconButtonClass, 'size-[2.2rem] shrink-0 text-app-muted-soft')}
              onClick={onClose}
              disabled={isSaving}
              aria-label="Close bookmark dialog"
            >
              <CloseIcon className="size-[1.25rem]" />
            </button>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-1.5" htmlFor={`${dialogTitleId}-label`}>
              <span className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-app-muted-soft">
                Bookmark label
              </span>
              <input
                ref={labelInputRef}
                id={`${dialogTitleId}-label`}
                className={fieldClass}
                value={labelDraft}
                onChange={(event) => {
                  setLabelDraft(event.target.value);
                }}
                placeholder="Add a custom label"
                aria-label="Bookmark label"
                disabled={isSaving}
              />
            </label>

            <div className="grid gap-1.5">
              <span className="text-[0.82rem] font-semibold uppercase tracking-[0.12em] text-app-muted-soft">
                Selected text
              </span>
              <div className="rounded-[20px] border border-app-field-border bg-app-meal-day-chip/70 p-4">
                <p className="m-0 max-h-[10rem] overflow-y-auto whitespace-pre-wrap text-[0.92rem] leading-[1.6] text-app-ink">
                  {selectedText}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {errorMessage ? (
                <InlineMessage className="text-[0.88rem]">
                  {errorMessage}
                </InlineMessage>
              ) : null}

              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  className={cn(
                    'inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-app-line-strong bg-app-surface-tint px-4 py-[0.56rem] font-bold text-app-brand-strong transition enabled:cursor-pointer enabled:hover:-translate-y-px enabled:hover:bg-app-button-tint enabled:hover:shadow-[0_10px_22px_rgba(31,64,54,0.08)] enabled:focus-visible:-translate-y-px enabled:focus-visible:bg-app-button-tint enabled:focus-visible:shadow-[0_10px_22px_rgba(31,64,54,0.08)]',
                    isSaving && 'cursor-not-allowed opacity-55'
                  )}
                  onClick={onClose}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={cn(pillButtonClass, 'min-h-[2.75rem]')}
                  disabled={isSaving || !labelDraft.trim()}
                >
                  {isSaving ? 'Saving...' : 'Save bookmark'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

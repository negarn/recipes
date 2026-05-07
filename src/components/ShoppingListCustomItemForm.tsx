import { useId, type FormEvent } from 'react';
import { CloseIcon } from './CloseIcon';
import { IconActionButton } from './IconActionButton';
import { cn, fieldClass, pillButtonClass } from '../helpers/uiClasses';
import type { ShoppingListCustomItemDraft } from '../types/app';

export function ShoppingListCustomItemForm({
  canSubmit,
  draft,
  formId,
  isSaving,
  onClose,
  onDraftChange,
  onSubmit
}: {
  canSubmit: boolean;
  draft: ShoppingListCustomItemDraft;
  formId: string;
  isSaving: boolean;
  onClose: () => void;
  onDraftChange: (
    field: keyof ShoppingListCustomItemDraft,
    value: string
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const ingredientFieldId = useId();
  const amountFieldId = useId();

  return (
    <form
      id={formId}
      className="relative mb-6 rounded-[24px] border border-app-field-border bg-app-meal-row p-4 shadow-[0_14px_30px_rgba(31,64,54,0.08)]"
      onSubmit={onSubmit}
    >
      <IconActionButton
        className="absolute right-[0.92rem] top-[0.74rem] inline-flex size-[1.58rem] shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-transparent text-app-muted-soft transition hover:text-app-danger focus-visible:text-app-danger focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring)] focus-visible:outline-none"
        onClick={onClose}
        disabled={isSaving}
        label="Close add item form"
        useBaseStyles={false}
      >
        <CloseIcon className="size-[1.22rem]" strokeWidth={2.2} />
      </IconActionButton>

      <div className="grid gap-3 pt-1 min-[720px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] min-[720px]:items-end">
        <label className="grid gap-1.5 min-[720px]:grid-rows-[auto_3rem]" htmlFor={ingredientFieldId}>
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-app-muted-soft">
            Ingredient
          </span>
          <input
            id={ingredientFieldId}
            type="text"
            value={draft.ingredientName}
            onChange={(event) => {
              onDraftChange('ingredientName', event.target.value);
            }}
            placeholder="Add a custom ingredient"
            className={cn(fieldClass, 'h-[3rem] rounded-[16px] px-4 py-0 text-[0.98rem]')}
          />
        </label>

        <label className="grid gap-1.5 min-[720px]:grid-rows-[auto_3rem]" htmlFor={amountFieldId}>
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-app-muted-soft">
            Amount
          </span>
          <input
            id={amountFieldId}
            type="text"
            value={draft.amountText}
            onChange={(event) => {
              onDraftChange('amountText', event.target.value);
            }}
            placeholder="1 bottle"
            className={cn(fieldClass, 'h-[3rem] rounded-[16px] px-4 py-0 text-[0.98rem]')}
          />
        </label>

        <button
          type="submit"
          className={cn(
            pillButtonClass,
            'h-[3rem] rounded-[16px] px-5 text-[0.9rem] shadow-[0_12px_22px_rgba(31,64,54,0.1)] min-[720px]:w-[8.2rem]'
          )}
          disabled={!canSubmit}
        >
          {isSaving ? 'Adding...' : 'Add item'}
        </button>
      </div>
    </form>
  );
}

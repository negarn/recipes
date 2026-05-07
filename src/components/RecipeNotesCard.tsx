import type { FormEvent } from 'react';
import { ContentPanelSection } from './ContentPanelSection';
import { InlineMessage } from './InlineMessage';
import {
  cn,
  pillButtonClass,
  textareaClass
} from '../helpers/uiClasses';

export function RecipeNotesCard({
  errorMessage,
  feedbackMessage,
  isNoteDirty,
  isSaving,
  noteDraft,
  onNoteChange,
  onSubmit
}: {
  errorMessage?: string | null;
  feedbackMessage?: string | null;
  isNoteDirty: boolean;
  isSaving?: boolean;
  noteDraft: string;
  onNoteChange: (nextNote: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div data-bookmark-selection-exclude="true">
      <ContentPanelSection
        as="section"
        className="bg-app-meal-row"
        title="Notes"
      >
        <form className="grid gap-4" onSubmit={onSubmit}>
          <textarea
            className={cn(textareaClass, 'border-app-line-focus !bg-app-surface-soft')}
            value={noteDraft}
            onChange={(event) => {
              onNoteChange(event.target.value);
            }}
            placeholder="Add your notes for this recipe"
            aria-label="Recipe notes"
            rows={4}
          />

          <div className="flex flex-wrap items-center gap-3">
            {errorMessage ? (
              <InlineMessage className="text-[0.88rem]">
                {errorMessage}
              </InlineMessage>
            ) : feedbackMessage ? (
              <InlineMessage tone="success" className="text-[0.88rem]">
                {feedbackMessage}
              </InlineMessage>
            ) : null}

            <button
              type="submit"
              className={cn(pillButtonClass, 'ml-auto')}
              disabled={isSaving || !isNoteDirty}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </ContentPanelSection>
    </div>
  );
}

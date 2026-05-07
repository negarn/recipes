import type { RefObject } from 'react';
import { CloseIcon } from './CloseIcon';
import { SearchFieldIcon } from './SearchFieldIcon';
import { cn, fieldClass } from '../helpers/uiClasses';

const headerSearchWrapClass =
  'min-w-0 w-full min-[900px]:w-[min(100%,22rem)]';

export function HomePageSearchField({
  ariaLabel = 'Search recipes by title or ingredient',
  hasSearchQuery,
  inputRef,
  onClear,
  onQueryChange,
  placeholder = 'Search by title or ingredient',
  query
}: {
  ariaLabel?: string;
  hasSearchQuery: boolean;
  inputRef: RefObject<HTMLInputElement>;
  onClear: () => void;
  onQueryChange: (nextQuery: string) => void;
  placeholder?: string;
  query: string;
}) {
  return (
    <div className={headerSearchWrapClass}>
      <div className="relative">
        <span className="pointer-events-none absolute left-[0.9rem] top-1/2 flex size-[1.8rem] -translate-y-1/2 items-center justify-center text-app-muted-soft min-[720px]:left-[0.95rem] min-[720px]:size-[1.95rem]">
          <SearchFieldIcon />
        </span>
        <input
          ref={inputRef}
          type="search"
          className={cn(
            fieldClass,
            'bg-app-meal-row min-h-[2.85rem] rounded-full pl-[2.85rem] pr-[2.75rem] text-[0.91rem] min-[720px]:min-h-[3rem] min-[720px]:pl-[3.25rem] min-[720px]:pr-[3.15rem] min-[720px]:text-[1rem]'
          )}
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
        />
        {hasSearchQuery ? (
          <button
            type="button"
            className="absolute right-[0.84rem] top-1/2 inline-flex size-[1.8rem] -translate-y-1/2 cursor-pointer items-center justify-center text-app-muted-soft transition hover:text-app-brand-strong focus-visible:rounded-full focus-visible:text-app-brand-strong focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring)] focus-visible:outline-none min-[720px]:right-[0.92rem] min-[720px]:size-[1.9rem]"
            onClick={onClear}
            aria-label="Clear search"
          >
            <CloseIcon className="size-[1.45rem]" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

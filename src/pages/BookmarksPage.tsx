import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronIcon } from '../components/ChevronIcon';
import { HomePageSearchField } from '../components/HomePageSearchField';
import { EmptyStateCard, ErrorPillMessage } from '../components/PageStatusMessage';
import { PageNavigationControls } from '../components/PageNavigationControls';
import { BookmarksPageSkeleton } from '../components/BookmarksPageSkeleton';
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog';
import { CloseIcon } from '../components/CloseIcon';
import { SourceDisclosurePopover } from '../components/SourceDisclosurePopover';
import {
  sourceDisclosureContentClass,
  sourceDisclosureLinkClass
} from '../components/SourceDisclosurePopover';
import { TabbedPageHeader } from '../components/TabbedPageHeader';
import { TabbedPanelLayout } from '../components/TabbedPanelLayout';
import { IconActionButton } from '../components/IconActionButton';
import { TimerControls } from '../components/TimerControls';
import {
  useRecipeCatalogContext,
  useRecipePreferencesContext
} from '../contexts/RecipeAppDataContext';
import { getRecipeRoutePath } from '../helpers/appRoutes';
import { bookmarkLabelMatchesSearch } from '../helpers/bookmarkText';
import {
  createBookmarksPageSearchParams,
  readBookmarksPageRawPageParam,
  readBookmarksPageRawQueryParam,
  readBookmarksPageSearchPage,
  readBookmarksPageSearchQuery
} from '../helpers/bookmarksPageSearchParams';
import { createBookmarksRecipePageState } from '../helpers/recipePageNavigation';
import { homePageRecipeCardClass } from '../helpers/homePageRecipeCardStyles';
import { parseBookmarkBodyLines, setBookmarkBodyCheckboxLineState } from '../helpers/bookmarkText';
import { getBookmarkLineTimerId } from '../helpers/bookmarkTimers';
import { formatRecipeTitle } from '../helpers/recipeMetadata';
import { getMethodStepTimerDurationMs } from '../helpers/recipeTiming';
import { scrollToPageTop } from '../helpers/scrollPosition';
import { cn } from '../helpers/uiClasses';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useBookmarkLineTimers } from '../hooks/useBookmarkLineTimers';
import type { BookmarkBodyLine } from '../helpers/bookmarkText';
import type { RecipeBookmark } from '../types/app';

type PendingBookmarkRemoval = {
  bookmarkId: string;
  label: string;
  recipeId: string;
} | null;

const BOOKMARKS_PER_PAGE = 20;

const bookmarkDeleteButtonClass = cn(
  'inline-flex size-[30px] shrink-0 items-center justify-center rounded-full border transition focus-visible:outline-none enabled:cursor-pointer enabled:hover:-translate-y-px enabled:focus-visible:-translate-y-px disabled:cursor-default disabled:opacity-45 disabled:shadow-none',
  'border-app-danger-line bg-app-danger-action-soft text-app-danger shadow-[0_8px_16px_rgba(102,47,34,0.1)] enabled:hover:bg-app-danger-action-soft-hover enabled:hover:shadow-[0_12px_20px_rgba(102,47,34,0.16)] enabled:focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring),0_12px_20px_rgba(102,47,34,0.16)]'
);
const bookmarkDeleteIconClass =
  'size-[1.4rem]';
const bookmarkDisclosureIndicatorClass =
  'inline-flex size-[1.9rem] shrink-0 items-center justify-center rounded-full text-app-muted-soft transition group-hover:text-app-brand-strong group-focus-within:text-app-brand-strong min-[720px]:size-[2rem]';
function getBookmarkSourcePopoverKey(recipeId: string, bookmarkId: string) {
  return `${recipeId}:${bookmarkId}`;
}

function BookmarksPagePagination({
  currentPage,
  onPageChange,
  totalPages
}: {
  currentPage: number;
  onPageChange: (nextPage: number) => void;
  totalPages: number;
}) {
  return (
    <PageNavigationControls
      ariaLabel="Bookmark list pages"
      onPrevious={() => {
        onPageChange(Math.max(1, currentPage - 1));
      }}
      isPreviousDisabled={currentPage === 1}
      onNext={() => {
        onPageChange(Math.min(totalPages, currentPage + 1));
      }}
      isNextDisabled={currentPage === totalPages}
    >
      <p className="m-0 text-[0.92rem] font-semibold text-app-muted">
        Page <strong className="text-app-ink">{currentPage}</strong> of{' '}
        <strong className="text-app-ink">{totalPages}</strong>
      </p>
    </PageNavigationControls>
  );
}

function BookmarkBodyLineRow({
  line,
  lineIndex,
  activeTimerEndAt,
  onTimerClear,
  onTimerStart,
  timerKey,
  timerNow,
  onCheckboxToggle
}: {
  line: BookmarkBodyLine;
  lineIndex: number;
  activeTimerEndAt?: number;
  onTimerClear: (timerKey: string) => void;
  onTimerStart: (timerKey: string, durationMs: number) => void;
  timerKey: string;
  timerNow: number;
  onCheckboxToggle: (lineIndex: number, checked: boolean) => void;
}) {
  if (line.kind === 'blank') {
    return <div aria-hidden="true" className="h-[0.35rem]" />;
  }

  const timerDurationMs = getMethodStepTimerDurationMs(line.text);
  const shouldShowTimerControls =
    timerDurationMs !== null &&
    (line.kind !== 'checkbox' || !line.checked || typeof activeTimerEndAt === 'number');

  if (line.kind === 'checkbox') {
    return (
      <div className="grid gap-2.5">
        <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-[14px] px-1 py-1 transition hover:bg-app-button-tint/35">
          <input
            type="checkbox"
            className="mt-[0.18rem] size-[1rem] cursor-pointer accent-app-brand"
            aria-label={line.text || `Checklist item ${lineIndex + 1}`}
            checked={line.checked}
            onChange={(event) => {
              onCheckboxToggle(lineIndex, event.target.checked);
            }}
          />
          <span
            className={cn(
              'min-w-0 text-[0.94rem] leading-[1.6] text-app-ink-soft transition',
              line.checked && 'text-app-muted line-through decoration-app-muted-soft'
            )}
          >
            {line.text}
          </span>
        </label>

        {shouldShowTimerControls ? (
          <TimerControls
            activeTimerEndAt={activeTimerEndAt}
            className="ml-8"
            durationMs={timerDurationMs}
            onClear={() => onTimerClear(timerKey)}
            onStart={(durationMs) => onTimerStart(timerKey, durationMs)}
            tone="strong"
            timerNow={timerNow}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-2.5">
      <p className="m-0 whitespace-pre-wrap text-[0.95rem] leading-[1.65] text-app-ink-soft">
        {line.text}
      </p>

      {shouldShowTimerControls ? (
        <TimerControls
          activeTimerEndAt={activeTimerEndAt}
          durationMs={timerDurationMs}
          onClear={() => onTimerClear(timerKey)}
          onStart={(durationMs) => onTimerStart(timerKey, durationMs)}
          tone="strong"
          timerNow={timerNow}
        />
      ) : null}
    </div>
  );
}

function BookmarkEntryRow({
  bookmark,
  isRemoving,
  isSourcePopoverOpen,
  onRemove,
  onTimerClear,
  onTimerStart,
  onSourcePopoverClose,
  onSourcePopoverToggle,
  recipeId,
  sourceRecipeTitle,
  timerNow,
  activeBookmarkLineTimers,
  onCheckboxToggle
}: {
  bookmark: RecipeBookmark;
  isRemoving?: boolean;
  isSourcePopoverOpen: boolean;
  onRemove: () => void;
  onTimerClear: (timerKey: string) => void;
  onTimerStart: (timerKey: string, durationMs: number) => void;
  onSourcePopoverClose: () => void;
  onSourcePopoverToggle: () => void;
  recipeId: string;
  sourceRecipeTitle: string | null;
  timerNow: number;
  activeBookmarkLineTimers: Record<string, number>;
  onCheckboxToggle: (lineIndex: number, checked: boolean) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const headerButtonRef = useRef<HTMLDivElement | null>(null);
  const contentId = `${bookmark.id}-content`;
  const sourcePopoverId = `${bookmark.id}-source-recipe`;
  const bodyLines = useMemo(() => parseBookmarkBodyLines(bookmark.text), [bookmark.text]);

  function toggleBookmarkExpanded() {
    if (isRemoving) {
      return;
    }

    onSourcePopoverClose();
    headerButtonRef.current?.blur();

    if (isExpanded) {
      setIsExpanded(false);
      return;
    }

    setIsExpanded((currentValue) => !currentValue);
  }

  function handleHeaderClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (
      event.target instanceof Element &&
      event.target.closest('[data-bookmark-ignore-toggle="true"]')
    ) {
      return;
    }

    toggleBookmarkExpanded();
  }

  function handleHeaderKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (
      event.target instanceof Element &&
      event.target.closest('[data-bookmark-ignore-toggle="true"]')
    ) {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    toggleBookmarkExpanded();
  }

  return (
    <article
      className={cn(
        homePageRecipeCardClass,
        'group relative flex flex-col !h-auto !min-h-[4.35rem] !gap-0 !p-0 min-[720px]:!min-h-0',
        isExpanded ? '!justify-start' : '!justify-center',
        isSourcePopoverOpen && 'z-30',
        '!border-app-field-border !bg-app-meal-row hover:!border-app-line-focus hover:!bg-app-meal-row-hover focus-within:!border-app-line-focus focus-within:!bg-app-meal-row-hover'
      )}
    >
      <div
        ref={headerButtonRef}
        role="button"
        tabIndex={0}
        className={cn(
          'relative flex min-h-[4.35rem] w-full min-w-0 cursor-pointer items-center gap-3 px-4 py-3 transition focus-visible:outline-none focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring)] min-[720px]:min-h-[4.35rem] min-[720px]:px-4 min-[720px]:py-4 min-[720px]:gap-4',
          'flex-none'
        )}
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} bookmark ${bookmark.label}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 min-[720px]:gap-3">
          <span className={bookmarkDisclosureIndicatorClass} aria-hidden="true">
            <ChevronIcon
              direction="right"
              className={cn(
                'size-[1.1rem] shrink-0 transition-transform min-[720px]:size-[1.2rem]',
                isExpanded && 'rotate-90 text-app-brand-strong'
              )}
            />
          </span>
          <span className="min-w-0 flex-1 text-[0.92rem] leading-[1.12] font-semibold text-app-ink transition group-hover:text-app-brand-strong group-focus-within:text-app-brand-strong min-[720px]:text-[1.02rem] min-[720px]:leading-[1.15]">
            {bookmark.label}
          </span>
        </div>

        <div
          className="flex shrink-0 items-center gap-2.5 min-[720px]:gap-3"
          data-bookmark-ignore-toggle="true"
        >
          <SourceDisclosurePopover
            className="shrink-0"
            dataAttributes={{
              'data-bookmark-ignore-toggle': 'true',
              'data-bookmark-source-disclosure': 'true'
            }}
            id={sourcePopoverId}
            isOpen={isSourcePopoverOpen}
            onToggle={onSourcePopoverToggle}
            popoverClassName="!w-[14rem] min-[720px]:!w-[18rem]"
            buttonClassName={cn(
              '!size-[27px] !rounded-full',
              isSourcePopoverOpen && 'text-app-brand-strong'
            )}
            buttonIconClassName="size-full"
            buttonLabel={`Show source recipe for ${bookmark.label}`}
            disabled={isRemoving}
          >
            {sourceRecipeTitle ? (
              <div className={sourceDisclosureContentClass}>
                <p className="m-0">
                  <Link
                    to={getRecipeRoutePath(recipeId)}
                    state={createBookmarksRecipePageState()}
                    aria-label={`Open source recipe: ${sourceRecipeTitle}`}
                    className={sourceDisclosureLinkClass}
                    onClick={onSourcePopoverClose}
                  >
                    {sourceRecipeTitle}
                  </Link>
                </p>
              </div>
            ) : (
              <p className="m-0 text-[0.88rem] leading-[1.45] text-app-muted-soft">
                Original recipe unavailable.
              </p>
            )}
          </SourceDisclosurePopover>

          <IconActionButton
            className={bookmarkDeleteButtonClass}
            onClick={() => {
              onSourcePopoverClose();
              onRemove();
            }}
            disabled={isRemoving}
            label={`Remove bookmark ${bookmark.label}`}
            useBaseStyles={false}
          >
            <CloseIcon className={bookmarkDeleteIconClass} />
          </IconActionButton>
        </div>
      </div>

      {isExpanded ? (
        <div
          id={contentId}
          className="border-t border-app-field-border px-4 pb-3 pt-3 min-[720px]:mt-0 min-[720px]:pb-4"
        >
          <div className="grid gap-2.5">
            {bodyLines.map((line, lineIndex) => (
              <BookmarkBodyLineRow
                key={`${bookmark.id}-${lineIndex}`}
                line={line}
                lineIndex={lineIndex}
                activeTimerEndAt={activeBookmarkLineTimers[getBookmarkLineTimerId(bookmark.id, lineIndex)]}
                onTimerClear={onTimerClear}
                onTimerStart={onTimerStart}
                onCheckboxToggle={onCheckboxToggle}
                timerKey={getBookmarkLineTimerId(bookmark.id, lineIndex)}
                timerNow={timerNow}
              />
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function BookmarksPage() {
  const { getRecipeById, hasLoadedRecipes } = useRecipeCatalogContext();
  const {
    handleRecipeBookmarkRemove: onRecipeBookmarkRemove,
    handleRecipeBookmarkTextChange: onRecipeBookmarkTextChange,
    hasResolvedRecipeBookmarks,
    recipeBookmarks
  } = useRecipePreferencesContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const previousPageRef = useRef<number | null>(null);
  const [activeSourcePopoverBookmarkKey, setActiveSourcePopoverBookmarkKey] =
    useState<string | null>(null);
  const bookmarkEntries = useMemo(
    () =>
      Object.entries(recipeBookmarks)
        .map(([recipeId, bookmarks]) => {
          const sourceRecipe = getRecipeById(recipeId);
          const sourceRecipeTitle = sourceRecipe
            ? formatRecipeTitle(sourceRecipe.title)
            : null;

          return bookmarks.map((bookmark) => ({
            bookmark,
            recipeId,
            sourceRecipeTitle
          }));
        })
        .flat()
        .sort((left, right) =>
          left.bookmark.label.localeCompare(right.bookmark.label) ||
          left.bookmark.id.localeCompare(right.bookmark.id)
        ),
    [getRecipeById, recipeBookmarks]
  );
  const searchQuery = readBookmarksPageSearchQuery(searchParams);
  const hasSearchQuery = searchQuery.length > 0;
  const filteredBookmarkEntries = useMemo(
    () =>
      bookmarkEntries.filter(({ bookmark }) =>
        bookmarkLabelMatchesSearch(bookmark.label, searchQuery)
      ),
    [bookmarkEntries, searchQuery]
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredBookmarkEntries.length / BOOKMARKS_PER_PAGE)
  );
  const searchParamPage = readBookmarksPageSearchPage(searchParams);
  const currentPage = Math.min(searchParamPage ?? 1, totalPages);
  const currentPageIndex = currentPage - 1;
  const paginatedBookmarkEntries = useMemo(
    () =>
      filteredBookmarkEntries.slice(
        currentPageIndex * BOOKMARKS_PER_PAGE,
        (currentPageIndex + 1) * BOOKMARKS_PER_PAGE
      ),
    [currentPageIndex, filteredBookmarkEntries]
  );
  const bookmarkIds = useMemo(
    () => bookmarkEntries.map(({ bookmark }) => bookmark.id),
    [bookmarkEntries]
  );
  const bookmarkLineTimers = useBookmarkLineTimers(
    bookmarkIds,
    hasResolvedRecipeBookmarks
  );
  const removeBookmarkAction = useAsyncAction();
  const [activeError, setActiveError] = useState<string | null>(null);
  const [pendingBookmarkRemoval, setPendingBookmarkRemoval] =
    useState<PendingBookmarkRemoval>(null);
  const isLoading = !hasResolvedRecipeBookmarks || !hasLoadedRecipes;

  useEffect(() => {
    if (!activeSourcePopoverBookmarkKey) {
      return;
    }

    const hasActiveSourcePopover = paginatedBookmarkEntries.some(
      ({ bookmark, recipeId }) =>
        getBookmarkSourcePopoverKey(recipeId, bookmark.id) === activeSourcePopoverBookmarkKey
    );

    if (!hasActiveSourcePopover) {
      setActiveSourcePopoverBookmarkKey(null);
    }
  }, [activeSourcePopoverBookmarkKey, paginatedBookmarkEntries]);

  useEffect(() => {
    if (!activeSourcePopoverBookmarkKey) {
      return undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Element &&
        event.target.closest('[data-bookmark-source-disclosure="true"]')
      ) {
        return;
      }

      setActiveSourcePopoverBookmarkKey(null);
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveSourcePopoverBookmarkKey(null);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeSourcePopoverBookmarkKey]);

  useEffect(() => {
    if (previousPageRef.current === null) {
      previousPageRef.current = currentPage;
      return;
    }

    if (previousPageRef.current !== currentPage) {
      scrollToPageTop();
      previousPageRef.current = currentPage;
    }
  }, [currentPage]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const rawQueryParam = readBookmarksPageRawQueryParam(searchParams);
    const rawPageParam = readBookmarksPageRawPageParam(searchParams);
    const shouldNormalizeQuery = rawQueryParam !== null && rawQueryParam.trim().length === 0;
    const shouldNormalizePage = rawPageParam !== null && searchParamPage !== currentPage;

    if (!(shouldNormalizeQuery || shouldNormalizePage)) {
      return;
    }

    const normalizedSearchParams = createBookmarksPageSearchParams(searchParams, {
      page: currentPage,
      query: searchQuery
    });

    if (normalizedSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(normalizedSearchParams, { replace: true });
    }
  }, [
    currentPage,
    isLoading,
    searchParamPage,
    searchParams,
    searchQuery,
    setSearchParams
  ]);

  function updateBookmarksPageSearchParams(nextQuery: string, nextPage: number) {
    setSearchParams(
      (currentSearchParams) =>
        createBookmarksPageSearchParams(currentSearchParams, {
          page: nextPage,
          query: nextQuery
        }),
      { replace: true }
    );
  }

  function updateCurrentPage(nextPage: number) {
    updateBookmarksPageSearchParams(searchQuery, nextPage);
  }

  function updateSearchQuery(nextQuery: string) {
    updateBookmarksPageSearchParams(nextQuery, 1);
  }

  function handleSearchClear() {
    updateSearchQuery('');
    searchInputRef.current?.blur();
  }

  function closeActiveSourcePopover() {
    setActiveSourcePopoverBookmarkKey(null);
  }

  async function handleBookmarkRemove(recipeId: string, bookmarkId: string) {
    setActiveError(null);

    return removeBookmarkAction.run(
      () => onRecipeBookmarkRemove(recipeId, bookmarkId),
      'Could not remove bookmark.',
      {
        onError: () => {
          setActiveError('Could not remove bookmark.');
        },
        onSuccess: () => {
          bookmarkLineTimers.clearBookmarkTimersForBookmark(bookmarkId);
        }
      }
    );
  }

  function openBookmarkRemovalDialog(recipeId: string, bookmarkId: string, label: string) {
    setActiveError(null);
    closeActiveSourcePopover();
    setPendingBookmarkRemoval({
      bookmarkId,
      label,
      recipeId
    });
  }

  async function confirmPendingBookmarkRemoval() {
    if (!pendingBookmarkRemoval) {
      return;
    }

    const wasRemoved = await handleBookmarkRemove(
      pendingBookmarkRemoval.recipeId,
      pendingBookmarkRemoval.bookmarkId
    );

    if (wasRemoved) {
      setPendingBookmarkRemoval(null);
    }
  }

  async function handleBookmarkCheckboxToggle(
    recipeId: string,
    bookmarkId: string,
    lineIndex: number,
    checked: boolean
  ) {
    setActiveError(null);

    try {
      await onRecipeBookmarkTextChange(recipeId, bookmarkId, (currentText) => {
        return setBookmarkBodyCheckboxLineState(currentText, lineIndex, checked);
      });

      if (checked) {
        bookmarkLineTimers.clearBookmarkLineTimer(
          getBookmarkLineTimerId(bookmarkId, lineIndex)
        );
      }
    } catch {
      setActiveError('Could not update bookmark.');
    }
  }

  return (
    <TabbedPanelLayout backgroundVariant="default">
      <TabbedPageHeader
        title="Bookmarks"
        actions={
          <div className="flex w-full min-w-0 flex-col gap-3 min-[900px]:ml-auto min-[900px]:w-auto min-[900px]:flex-row min-[900px]:items-center">
            <HomePageSearchField
              ariaLabel="Search bookmarks by label"
              hasSearchQuery={hasSearchQuery}
              inputRef={searchInputRef}
              onClear={handleSearchClear}
              onQueryChange={updateSearchQuery}
              placeholder="Search bookmarks by label"
              query={searchQuery}
            />
          </div>
        }
        contentClassName="flex-col items-start gap-3 min-[900px]:flex-row min-[900px]:items-center"
      />

      <div className="grid min-w-0 gap-4 pb-12 min-[720px]:pb-16">
        {activeError ? <ErrorPillMessage>{activeError}</ErrorPillMessage> : null}

        {isLoading ? (
          <BookmarksPageSkeleton />
        ) : bookmarkEntries.length === 0 ? (
          <EmptyStateCard
            title="No bookmarks yet"
            description="Select text in a recipe, tap the bookmark popover, and give it a label so you can find it later."
          />
        ) : filteredBookmarkEntries.length === 0 ? (
          <EmptyStateCard
            title="No bookmarks found"
            description="Try a different label or clear the search."
          />
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-4">
              {paginatedBookmarkEntries.map(({ bookmark, recipeId, sourceRecipeTitle }) => {
                const sourcePopoverKey = getBookmarkSourcePopoverKey(recipeId, bookmark.id);

                return (
                  <BookmarkEntryRow
                    key={`${recipeId}-${bookmark.id}`}
                    bookmark={bookmark}
                    activeBookmarkLineTimers={bookmarkLineTimers.activeBookmarkLineTimers}
                    isSourcePopoverOpen={activeSourcePopoverBookmarkKey === sourcePopoverKey}
                    isRemoving={removeBookmarkAction.isPending}
                    onRemove={() => {
                      openBookmarkRemovalDialog(recipeId, bookmark.id, bookmark.label);
                    }}
                    onTimerClear={bookmarkLineTimers.clearBookmarkLineTimer}
                    onTimerStart={bookmarkLineTimers.startBookmarkLineTimer}
                    onSourcePopoverClose={closeActiveSourcePopover}
                    onSourcePopoverToggle={() => {
                      setActiveSourcePopoverBookmarkKey((currentValue) =>
                        currentValue === sourcePopoverKey ? null : sourcePopoverKey
                      );
                    }}
                    recipeId={recipeId}
                    sourceRecipeTitle={sourceRecipeTitle}
                    timerNow={bookmarkLineTimers.timerNow}
                    onCheckboxToggle={(lineIndex, checked) => {
                      void handleBookmarkCheckboxToggle(
                        recipeId,
                        bookmark.id,
                        lineIndex,
                        checked
                      );
                    }}
                  />
                );
              })}
            </div>

            <BookmarksPagePagination
              currentPage={currentPage}
              onPageChange={updateCurrentPage}
              totalPages={totalPages}
            />
          </div>
        )}
      </div>

      {pendingBookmarkRemoval ? (
        <DeleteConfirmationDialog
          headerLabel="Delete bookmark"
          title={`Delete ${pendingBookmarkRemoval.label}?`}
          description={
            <>
              This will remove <strong>{pendingBookmarkRemoval.label}</strong> from your saved
              bookmarks.
            </>
          }
          errorMessage={activeError}
          isBusy={removeBookmarkAction.isPending}
          confirmLabel="Delete bookmark"
          busyLabel="Deleting..."
          onCancel={() => {
            setPendingBookmarkRemoval(null);
          }}
          onConfirm={() => {
            void confirmPendingBookmarkRemoval();
          }}
        />
      ) : null}
    </TabbedPanelLayout>
  );
}

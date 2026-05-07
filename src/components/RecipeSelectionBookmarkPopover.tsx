import { createPortal } from 'react-dom';
import { BookmarkShortcutIcon } from './BookmarkShortcutIcon';
import { IconActionButton } from './IconActionButton';
import { cn } from '../helpers/uiClasses';
import type { TextSelectionState } from '../hooks/useRecipeTextSelection';

const POPUP_BUTTON_SIZE_PX = 46;
const POPUP_GAP_PX = 10;
const POPUP_EDGE_MARGIN_PX = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getBookmarkPopoverStyle(selectionRect: TextSelectionState['endRect']) {
  if (typeof window === 'undefined') {
    return null;
  }

  const buttonCenterOffset = POPUP_BUTTON_SIZE_PX / 2;
  const rightAnchor = selectionRect.right + POPUP_GAP_PX + buttonCenterOffset;
  const leftAnchor = selectionRect.left - POPUP_GAP_PX - buttonCenterOffset;
  const canPlaceOnRight =
    rightAnchor <= window.innerWidth - POPUP_EDGE_MARGIN_PX - buttonCenterOffset;
  const left = clamp(
    canPlaceOnRight ? rightAnchor : leftAnchor,
    POPUP_EDGE_MARGIN_PX + buttonCenterOffset,
    window.innerWidth - POPUP_EDGE_MARGIN_PX - buttonCenterOffset
  );
  const top = clamp(
    selectionRect.top + selectionRect.height / 2 - POPUP_BUTTON_SIZE_PX / 2,
    POPUP_EDGE_MARGIN_PX,
    window.innerHeight - POPUP_EDGE_MARGIN_PX - POPUP_BUTTON_SIZE_PX
  );

  return {
    left: `${left}px`,
    top: `${top}px`
  };
}

export function RecipeSelectionBookmarkPopover({
  onBookmark,
  selection
}: {
  onBookmark: () => void;
  selection: TextSelectionState | null;
}) {
  const popoverStyle = selection ? getBookmarkPopoverStyle(selection.endRect) : null;

  if (!selection || !popoverStyle || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed z-[90] -translate-x-1/2"
      style={popoverStyle}
      aria-label="Bookmark selected text"
    >
      <IconActionButton
        className={cn(
          'size-[2.9rem] border-app-brand-strong bg-app-surface-strong text-app-brand-strong shadow-[0_16px_28px_rgba(31,64,54,0.14)]',
          'enabled:hover:bg-app-button-tint enabled:hover:shadow-[0_18px_30px_rgba(31,64,54,0.16)]'
        )}
        label="Bookmark selected text"
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={onBookmark}
      >
        <BookmarkShortcutIcon className="size-[1.35rem]" />
      </IconActionButton>
    </div>,
    document.body
  );
}

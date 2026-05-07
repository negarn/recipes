import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  annotateBookmarkBodyTextWithCheckboxes,
  normalizeBookmarkBodyText
} from '../helpers/bookmarkText';
import { rangeIntersectsAnyNode } from '../helpers/bookmarkSelection';

const BOOKMARK_SELECTION_EXCLUDED_SELECTOR = '[data-bookmark-selection-exclude="true"]';

export type TextSelectionRect = Pick<
  DOMRectReadOnly,
  'bottom' | 'height' | 'left' | 'right' | 'top' | 'width'
>;

export type TextSelectionState = {
  endRect: TextSelectionRect;
  rect: TextSelectionRect;
  text: string;
};

function readSelectionRect(range: Range) {
  const rangeRect = range.getBoundingClientRect();

  if (rangeRect.width > 0 || rangeRect.height > 0) {
    return rangeRect;
  }

  return range.getClientRects()[0] ?? null;
}

function readSelectionEndRect(range: Range, fallbackRect: DOMRectReadOnly) {
  const clientRects = range.getClientRects();

  for (let index = clientRects.length - 1; index >= 0; index -= 1) {
    const clientRect = clientRects[index];

    if (clientRect.width > 0 || clientRect.height > 0) {
      return clientRect;
    }
  }

  return fallbackRect;
}

function readSelectionCheckboxStates(containerElement: HTMLElement, range: Range) {
  return Array.from(containerElement.querySelectorAll('label')).flatMap((label) => {
    const checkbox = label.querySelector<HTMLInputElement>('input[type="checkbox"]');

    if (!checkbox) {
      return [];
    }

    if (!range.intersectsNode(label)) {
      return [];
    }

    const text = label.querySelector('span')?.textContent ?? label.textContent ?? '';

    return text.trim()
      ? [
          {
            checked: checkbox.checked,
            text
          }
        ]
      : [];
  });
}

function toTextSelectionState(range: Range, text: string): TextSelectionState | null {
  const selectionRect = readSelectionRect(range);

  if (!selectionRect) {
    return null;
  }

  const selectionEndRect = readSelectionEndRect(range, selectionRect);

  return {
    endRect: {
      bottom: selectionEndRect.bottom,
      height: selectionEndRect.height,
      left: selectionEndRect.left,
      right: selectionEndRect.right,
      top: selectionEndRect.top,
      width: selectionEndRect.width
    },
    rect: {
      bottom: selectionRect.bottom,
      height: selectionRect.height,
      left: selectionRect.left,
      right: selectionRect.right,
      top: selectionRect.top,
      width: selectionRect.width
    },
    text
  };
}

export function useRecipeTextSelection(
  containerRef: RefObject<HTMLElement>,
  isEnabled = true
) {
  const [selection, setSelection] = useState<TextSelectionState | null>(null);
  const selectionRef = useRef<TextSelectionState | null>(null);

  const updateSelection = useCallback((nextSelection: TextSelectionState | null) => {
    selectionRef.current = nextSelection;
    setSelection(nextSelection);
  }, []);

  const syncSelection = useCallback(() => {
    if (!isEnabled || typeof window === 'undefined') {
      updateSelection(null);
      return;
    }

    const containerElement = containerRef.current;
    const windowSelection = window.getSelection();

    if (
      !containerElement ||
      !windowSelection ||
      windowSelection.rangeCount === 0 ||
      windowSelection.isCollapsed
    ) {
      updateSelection(null);
      return;
    }

    const range = windowSelection.getRangeAt(0);
    const selectedText = normalizeBookmarkBodyText(windowSelection.toString());

    if (!selectedText || !containerElement.contains(range.commonAncestorContainer)) {
      updateSelection(null);
      return;
    }

    const excludedSelectionTargets = containerElement.querySelectorAll(
      BOOKMARK_SELECTION_EXCLUDED_SELECTOR
    );

    if (excludedSelectionTargets.length && rangeIntersectsAnyNode(range, excludedSelectionTargets)) {
      updateSelection(null);
      return;
    }

    const checkboxStates = readSelectionCheckboxStates(containerElement, range);
    const normalizedSelectionText = annotateBookmarkBodyTextWithCheckboxes(
      selectedText,
      checkboxStates
    );

    updateSelection(toTextSelectionState(range, normalizedSelectionText));
  }, [containerRef, isEnabled, updateSelection]);

  const clearSelection = useCallback(() => {
    updateSelection(null);

    if (typeof window === 'undefined') {
      return;
    }

    window.getSelection()?.removeAllRanges();
  }, [updateSelection]);

  useEffect(() => {
    if (!isEnabled || typeof document === 'undefined') {
      updateSelection(null);
      return undefined;
    }

    document.addEventListener('selectionchange', syncSelection);
    window.addEventListener('resize', syncSelection);
    window.addEventListener('scroll', syncSelection, true);
    syncSelection();

    return () => {
      document.removeEventListener('selectionchange', syncSelection);
      window.removeEventListener('resize', syncSelection);
      window.removeEventListener('scroll', syncSelection, true);
    };
  }, [isEnabled, syncSelection, updateSelection]);

  return {
    clearSelection,
    selection,
    selectionRef
  } as const;
}

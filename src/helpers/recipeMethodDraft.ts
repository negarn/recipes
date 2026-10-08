import type { Recipe } from '../types/recipe';
import { renderMethodStepText } from './recipeDisplay';
import { RECIPE_METHOD_MARKUP_PATTERN } from './recipeMethodTokens';

type MethodDraftToken = {
  start: number;
  end: number;
  sourceStart: number;
  sourceEnd: number;
};

export type RecipeMethodDraft = {
  source: string;
  text: string;
  tokens: MethodDraftToken[];
};

export function createRecipeMethodDraft(source: string, recipe?: Recipe): RecipeMethodDraft {
  const tokens: MethodDraftToken[] = [];
  let text = '';
  let sourceOffset = 0;

  for (const match of source.matchAll(RECIPE_METHOD_MARKUP_PATTERN)) {
    text += source.slice(sourceOffset, match.index);
    const label = renderMethodStepText(match[0], recipe);
    tokens.push({
      start: text.length,
      end: text.length + label.length,
      sourceStart: match.index,
      sourceEnd: match.index + match[0].length
    });
    text += label;
    sourceOffset = match.index + match[0].length;
  }
  text += source.slice(sourceOffset);
  return { source, text, tokens };
}

function mapDraftOffset(
  draft: RecipeMethodDraft,
  offset: number,
  from: 'source' | 'text',
  edge: 'start' | 'end'
): number {
  let delta = 0;
  for (const token of draft.tokens) {
    const fromStart = from === 'source' ? token.sourceStart : token.start;
    const fromEnd = from === 'source' ? token.sourceEnd : token.end;
    const toStart = from === 'source' ? token.start : token.sourceStart;
    const toEnd = from === 'source' ? token.end : token.sourceEnd;
    if (offset <= fromStart) {
      return offset + delta;
    }
    if (offset < fromEnd) {
      return edge === 'start' ? toStart : toEnd;
    }
    delta = toEnd - fromEnd;
  }
  return offset + delta;
}

export function getRecipeMethodDraftSelection(
  draft: RecipeMethodDraft,
  start: number,
  end: number
): { start: number; end: number } {
  return {
    start: mapDraftOffset(draft, start, 'source', 'start'),
    end: mapDraftOffset(draft, end, 'source', 'end')
  };
}

export function applyRecipeMethodDraftEdit(draft: RecipeMethodDraft, nextText: string): string {
  if (nextText === draft.text) {
    return draft.source;
  }

  let start = 0;
  while (start < Math.min(draft.text.length, nextText.length) && draft.text[start] === nextText[start]) {
    start += 1;
  }
  let end = draft.text.length;
  let nextEnd = nextText.length;
  while (end > start && nextEnd > start && draft.text[end - 1] === nextText[nextEnd - 1]) {
    end -= 1;
    nextEnd -= 1;
  }

  const insertedText = nextText.slice(start, nextEnd);
  const changeEnd = end;
  // An edited label becomes ordinary text; untouched links keep their source markup.
  for (const token of draft.tokens) {
    const joinsPreviousWord = start === token.end &&
      /[\p{L}\p{N}]$/u.test(draft.text.slice(token.start, token.end)) && /^[\p{L}\p{N}]/u.test(insertedText);
    const joinsNextWord = end === token.start &&
      /[\p{L}\p{N}]$/u.test(insertedText) && /^[\p{L}\p{N}]/u.test(draft.text.slice(token.start, token.end));
    if ((token.start < start && start < token.end) || joinsPreviousWord) {
      start = token.start;
    }
    if ((token.start < end && end < token.end) || joinsNextWord) {
      end = token.end;
    }
  }
  nextEnd += end - changeEnd;

  const sourceStart = mapDraftOffset(draft, start, 'text', 'start');
  const sourceEnd = mapDraftOffset(draft, end, 'text', 'end');
  return draft.source.slice(0, sourceStart) + nextText.slice(start, nextEnd) + draft.source.slice(sourceEnd);
}

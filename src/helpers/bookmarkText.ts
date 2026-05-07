export type BookmarkCheckboxState = {
  checked: boolean;
  text: string;
};

export type BookmarkBodyLine =
  | {
      kind: 'blank';
    }
  | {
      kind: 'checkbox';
      checked: boolean;
      text: string;
    }
  | {
      kind: 'text';
      text: string;
    };

const bookmarkCheckboxLinePattern = /^\s*-\s*\[(x| )\]\s*(.*)$/i;

function normalizeBookmarkTextLine(value: string) {
  return value.replace(/[ \t\f\v]+/g, ' ').trim();
}

function stripBookmarkCheckboxPrefix(value: string) {
  return value.replace(/^\s*(?:-\s*)?\[(?:x| )\]\s*/i, '').trim();
}

export function normalizeBookmarkBodyText(value: string) {
  const normalizedLines = value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(normalizeBookmarkTextLine);

  let startIndex = 0;
  let endIndex = normalizedLines.length;

  while (startIndex < endIndex && normalizedLines[startIndex] === '') {
    startIndex += 1;
  }

  while (endIndex > startIndex && normalizedLines[endIndex - 1] === '') {
    endIndex -= 1;
  }

  return normalizedLines.slice(startIndex, endIndex).join('\n');
}

export function normalizeBookmarkLabelText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function bookmarkLabelMatchesSearch(label: string, query: string) {
  const normalizedQuery = normalizeBookmarkLabelText(query).toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const searchableText = normalizeBookmarkLabelText(label).toLowerCase();

  return normalizedQuery
    .split(/\s+/)
    .every((searchTerm) => searchableText.includes(searchTerm));
}

export function parseBookmarkBodyLines(value: string) {
  const normalizedBodyText = normalizeBookmarkBodyText(value);

  if (!normalizedBodyText) {
    return [] as BookmarkBodyLine[];
  }

  return normalizedBodyText.split('\n').map((line) => {
    if (!line) {
      return { kind: 'blank' } as const;
    }

    const checkboxMatch = line.match(bookmarkCheckboxLinePattern);

    if (checkboxMatch) {
      return {
        checked: checkboxMatch[1].toLowerCase() === 'x',
        kind: 'checkbox',
        text: checkboxMatch[2]
      } as const;
    }

    return {
      kind: 'text',
      text: line
    } as const;
  });
}

export function setBookmarkBodyCheckboxLineState(
  value: string,
  lineIndex: number,
  checked: boolean
) {
  const normalizedBodyText = normalizeBookmarkBodyText(value);

  if (!normalizedBodyText) {
    return normalizedBodyText;
  }

  const normalizedLines = normalizedBodyText.split('\n');

  if (lineIndex < 0 || lineIndex >= normalizedLines.length) {
    return normalizedBodyText;
  }

  const lineText = normalizedLines[lineIndex];
  const checkboxMatch = lineText.match(bookmarkCheckboxLinePattern);

  if (!checkboxMatch) {
    return normalizedBodyText;
  }

  const checkboxText = checkboxMatch[2];

  normalizedLines[lineIndex] = `${checked ? '- [x]' : '- [ ]'}${
    checkboxText ? ` ${checkboxText}` : ''
  }`;

  return normalizedLines.join('\n');
}

export function annotateBookmarkBodyTextWithCheckboxes(
  value: string,
  checkboxStates: ReadonlyArray<BookmarkCheckboxState>
) {
  const normalizedBodyText = normalizeBookmarkBodyText(value);

  if (!checkboxStates.length || !normalizedBodyText) {
    return normalizedBodyText;
  }

  const normalizedCheckboxStates = checkboxStates
    .map((checkboxState, index) => ({
      checked: checkboxState.checked,
      index,
      text: normalizeBookmarkLabelText(checkboxState.text)
    }))
    .filter((checkboxState) => checkboxState.text.length > 0);

  if (!normalizedCheckboxStates.length) {
    return normalizedBodyText;
  }

  const usedCheckboxIndices = new Set<number>();

  return normalizedBodyText
    .split('\n')
    .map((line) => {
      const normalizedLine = normalizeBookmarkLabelText(line);

      if (!normalizedLine) {
        return line;
      }

      const matchingCheckboxState = normalizedCheckboxStates.find(
        (checkboxState) =>
          !usedCheckboxIndices.has(checkboxState.index) &&
          checkboxState.text === normalizedLine
      );

      if (!matchingCheckboxState) {
        return line;
      }

      usedCheckboxIndices.add(matchingCheckboxState.index);

      return `${matchingCheckboxState.checked ? '- [x]' : '- [ ]'} ${normalizedLine}`;
    })
    .join('\n');
}

export function createBookmarkLabelSuggestion(
  value: string,
  maxLength = 48
) {
  const firstMeaningfulLine = normalizeBookmarkBodyText(value)
    .split('\n')
    .map(stripBookmarkCheckboxPrefix)
    .find((line) => line.length > 0);

  if (!firstMeaningfulLine) {
    return '';
  }

  if (firstMeaningfulLine.length <= maxLength) {
    return firstMeaningfulLine;
  }

  return `${firstMeaningfulLine.slice(0, maxLength - 3).trimEnd()}...`;
}

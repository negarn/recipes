// Include incomplete links so their source syntax cannot leak into recipe text.
export const RECIPE_METHOD_MARKUP_PATTERN = /\{\{+[^{}\r\n]*(?:\}\}+|(?=[{}\r\n]|$))|\b(?:ingredient(?:-portion)?|amount|fixed)\s*\|[^{}\r\n]*\}\}+|\}\}+/g;

export function getMethodTokenFallbackText(token: string): string {
  if (!token.startsWith('{{') && !token.includes('|')) {
    return '';
  }
  const body = token.replace(/^\{+|\}+$/g, '');
  const [type, ...parts] = body.split('|').map((part) => part.trim());
  let label: string;
  switch (type) {
    case 'ingredient':
      label = parts[2] || parts[1] || parts[0]?.replace(/-+/g, ' ') || 'ingredient';
      break;
    case 'ingredient-portion':
      label = parts[1] || 'ingredient portion';
      break;
    case 'amount':
      label = [parts[0] || 'amount', parts[1]].filter(Boolean).join(' ');
      break;
    case 'fixed':
      label = parts.filter(Boolean).join(' ') || 'amount';
      break;
    default:
      label = parts.filter(Boolean).join(' ') || 'ingredient amount';
  }
  // An unclosed link may end just before another link; keep the separating space.
  const trailingSpace = token.endsWith('}}') ? '' : (body.match(/\s+$/)?.[0] ?? '');
  return label + trailingSpace;
}

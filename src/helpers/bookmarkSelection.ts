export function rangeIntersectsAnyNode(
  range: Pick<Range, 'intersectsNode'>,
  nodes: Iterable<Node>
) {
  for (const node of nodes) {
    if (range.intersectsNode(node)) {
      return true;
    }
  }

  return false;
}

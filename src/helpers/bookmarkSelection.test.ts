import { describe, expect, it, vi } from 'vitest';
import { rangeIntersectsAnyNode } from './bookmarkSelection';

describe('rangeIntersectsAnyNode', () => {
  it('returns true when any node intersects the range', () => {
    const firstNode = {} as Node;
    const secondNode = {} as Node;
    const range = {
      intersectsNode: vi.fn((node: Node) => node === secondNode)
    } as Pick<Range, 'intersectsNode'>;

    expect(rangeIntersectsAnyNode(range, [firstNode, secondNode])).toBe(true);
    expect(range.intersectsNode).toHaveBeenCalledTimes(2);
    expect(range.intersectsNode).toHaveBeenNthCalledWith(1, firstNode);
    expect(range.intersectsNode).toHaveBeenNthCalledWith(2, secondNode);
  });

  it('returns false when no nodes intersect the range', () => {
    const range = {
      intersectsNode: vi.fn(() => false)
    } as Pick<Range, 'intersectsNode'>;

    expect(rangeIntersectsAnyNode(range, [{} as Node, {} as Node])).toBe(false);
    expect(range.intersectsNode).toHaveBeenCalledTimes(2);
  });
});

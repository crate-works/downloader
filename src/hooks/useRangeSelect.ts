import type { MouseEvent } from 'react';
import { useCallback, useRef } from 'react';

type RangeApply = (ids: string[], shouldSelect: boolean) => void;

export type RangeCheckboxClick = (id: string, event: MouseEvent<HTMLInputElement>, willSelect: boolean) => void;

/**
 * Adds shift-click range selection to a list of checkboxes.
 *
 * `orderedIds` is the list in its current visible order (honouring the active
 * sort/filter). `apply` selects or deselects a batch of ids. The returned
 * handler is wired to each row's checkbox `onClick`:
 *
 * - A plain click records the clicked id as the anchor and lets the checkbox's
 *   normal `onChange` perform the single toggle.
 * - A shift-click selects the inclusive range between the anchor and the
 *   clicked row, applying `willSelect` (the clicked row's would-be new state) to
 *   every row in between. The anchor stays fixed so the range can be re-dragged.
 *
 * The anchor is local to this hook instance, so each list has its own range
 * scope. If the anchor is no longer in `orderedIds` (e.g. after paginating or
 * filtering), the shift-click falls back to a plain single toggle.
 */
export const useRangeSelect = (orderedIds: string[], apply: RangeApply): RangeCheckboxClick => {
  const anchorRef = useRef<string | null>(null);

  return useCallback(
    (id, event, willSelect) => {
      const anchorId = anchorRef.current;

      if (event.shiftKey && anchorId && anchorId !== id) {
        const anchorIdx = orderedIds.indexOf(anchorId);
        const targetIdx = orderedIds.indexOf(id);

        if (anchorIdx !== -1 && targetIdx !== -1) {
          // Prevent the native toggle (and its change event) so the whole range
          // is driven from `apply` instead of also single-toggling this row.
          event.preventDefault();
          const [lo, hi] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
          apply(orderedIds.slice(lo, hi + 1), willSelect);
          return;
        }
      }

      // Plain click, or no valid anchor: record the anchor and let the
      // checkbox's onChange handler perform the single toggle.
      anchorRef.current = id;
    },
    [orderedIds, apply],
  );
};

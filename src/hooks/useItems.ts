import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSelectionStore } from '#/store/selectionStore.ts';
import { itemsQueryOptions } from './queries.ts';

export const useItems = (collectionId: string, enabled = true) => {
  const { registerItemsForCollection } = useSelectionStore();

  const query = useQuery({
    ...itemsQueryOptions(collectionId),
    enabled: enabled && !!collectionId,
  });

  useEffect(() => {
    if (query.data) {
      registerItemsForCollection(collectionId, query.data);
    }
  }, [query.data, collectionId, registerItemsForCollection]);

  return query;
};

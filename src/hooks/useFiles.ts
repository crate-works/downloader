import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSelectionStore } from '#/store/selectionStore.ts';
import { filesQueryOptions } from './queries.ts';

export const useFiles = (itemId: string, enabled = true) => {
  const { addFileMetadata, registerFilesForItem } = useSelectionStore();

  const query = useQuery({
    ...filesQueryOptions(itemId),
    enabled: enabled && !!itemId,
  });

  useEffect(() => {
    if (query.data) {
      addFileMetadata(query.data);
      registerFilesForItem(itemId, query.data);
    }
  }, [query.data, itemId, addFileMetadata, registerFilesForItem]);

  return query;
};

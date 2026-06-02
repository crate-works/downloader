import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { ARCHIVAL_AUDIO_TYPES, ARCHIVAL_IMAGE_TYPES, ARCHIVAL_VIDEO_TYPES, getFileType } from '#/shared/types/file.ts';
import type { Entity, RoCrateFile } from '#/shared/types/index.ts';

type SelectionStateType = 'full' | 'partial' | 'none';

// Helper function for quality filtering
const isFileIncludedWithQuality = (file: RoCrateFile): boolean => {
  // Files without access cannot be selected
  if (file.access?.content === false) {
    return false;
  }

  const fileType = getFileType(file.mediaType);

  if (fileType === 'audio') {
    return !ARCHIVAL_AUDIO_TYPES.includes(file.mediaType);
  }

  if (fileType === 'video') {
    return !ARCHIVAL_VIDEO_TYPES.includes(file.mediaType);
  }

  return !ARCHIVAL_IMAGE_TYPES.includes(file.mediaType);
};

// Primitive atoms
const selectedCollectionsAtom = atom(new Set<string>());
const selectedItemsAtom = atom(new Set<string>());
const selectedFilesAtom = atom(new Set<string>());

const expandedCollectionsAtom = atom(new Set<string>());
const expandedItemsAtom = atom(new Set<string>());

const pendingCollectionsAtom = atom(new Set<string>());
const pendingItemsAtom = atom(new Set<string>());

const collectionItemsAtom = atom(new Map<string, string[]>());
const itemFilesAtom = atom(new Map<string, string[]>());

const fileMetadataAtom = atom(new Map<string, RoCrateFile>());

// Derived atoms
const pendingInfoAtom = atom((get) => ({
  pendingCollections: get(pendingCollectionsAtom).size,
  pendingItems: get(pendingItemsAtom).size,
}));

const selectedFilesListAtom = atom((get) => {
  const selectedFiles = get(selectedFilesAtom);
  const fileMetadata = get(fileMetadataAtom);
  const includedFiles: RoCrateFile[] = [];

  selectedFiles.forEach((fileId) => {
    const file = fileMetadata.get(fileId);
    if (file && isFileIncludedWithQuality(file)) {
      includedFiles.push(file);
    }
  });

  return includedFiles;
});

const selectedFileIdsAtom = atom((get) => {
  const selectedFiles = get(selectedFilesAtom);
  const fileMetadata = get(fileMetadataAtom);
  const includedFiles: string[] = [];

  selectedFiles.forEach((fileId) => {
    const file = fileMetadata.get(fileId);
    if (file && isFileIncludedWithQuality(file)) {
      includedFiles.push(fileId);
    }
  });

  return includedFiles;
});

const totalSelectedSizeAtom = atom((get) => {
  const selectedFiles = get(selectedFilesAtom);
  const fileMetadata = get(fileMetadataAtom);
  let total = 0;

  selectedFiles.forEach((fileId) => {
    const file = fileMetadata.get(fileId);
    if (file && isFileIncludedWithQuality(file)) {
      total += file.size;
    }
  });

  return total;
});

// Action atoms
const selectCollectionAtom = atom(null, (get, set, collectionId: string) => {
  const selectedCollections = get(selectedCollectionsAtom);
  const expandedCollections = get(expandedCollectionsAtom);
  const pendingCollections = get(pendingCollectionsAtom);
  const selectedItems = get(selectedItemsAtom);
  const pendingItems = get(pendingItemsAtom);
  const expandedItems = get(expandedItemsAtom);
  const selectedFiles = get(selectedFilesAtom);
  const collectionItems = get(collectionItemsAtom);
  const itemFiles = get(itemFilesAtom);
  const fileMetadata = get(fileMetadataAtom);

  const newSelectedCollections = new Set(selectedCollections);
  const newExpandedCollections = new Set(expandedCollections);
  const newPendingCollections = new Set(pendingCollections);
  const newSelectedItems = new Set(selectedItems);
  const newPendingItems = new Set(pendingItems);
  const newExpandedItems = new Set(expandedItems);
  const newSelectedFiles = new Set(selectedFiles);

  newSelectedCollections.add(collectionId);
  newExpandedCollections.add(collectionId);

  const existingItemIds = collectionItems.get(collectionId);
  if (existingItemIds) {
    existingItemIds.forEach((itemId) => {
      newSelectedItems.add(itemId);

      const existingFileIds = itemFiles.get(itemId);
      if (existingFileIds) {
        existingFileIds.forEach((fileId) => {
          const file = fileMetadata.get(fileId);
          if (file && isFileIncludedWithQuality(file)) {
            newSelectedFiles.add(fileId);
          }
        });
      } else {
        newPendingItems.add(itemId);
        newExpandedItems.add(itemId);
      }
    });
  } else {
    newPendingCollections.add(collectionId);
  }

  set(selectedCollectionsAtom, newSelectedCollections);
  set(expandedCollectionsAtom, newExpandedCollections);
  set(pendingCollectionsAtom, newPendingCollections);
  set(selectedItemsAtom, newSelectedItems);
  set(pendingItemsAtom, newPendingItems);
  set(expandedItemsAtom, newExpandedItems);
  set(selectedFilesAtom, newSelectedFiles);
});

const deselectCollectionAtom = atom(null, (get, set, collectionId: string) => {
  const selectedCollections = get(selectedCollectionsAtom);
  const pendingCollections = get(pendingCollectionsAtom);
  const selectedItems = get(selectedItemsAtom);
  const pendingItems = get(pendingItemsAtom);
  const selectedFiles = get(selectedFilesAtom);
  const collectionItems = get(collectionItemsAtom);
  const itemFiles = get(itemFilesAtom);

  const newSelectedCollections = new Set(selectedCollections);
  const newPendingCollections = new Set(pendingCollections);
  const newSelectedItems = new Set(selectedItems);
  const newPendingItems = new Set(pendingItems);
  const newSelectedFiles = new Set(selectedFiles);

  newSelectedCollections.delete(collectionId);
  newPendingCollections.delete(collectionId);

  const itemIds = collectionItems.get(collectionId) || [];
  itemIds.forEach((itemId) => {
    newSelectedItems.delete(itemId);
    newPendingItems.delete(itemId);

    const fileIds = itemFiles.get(itemId) || [];
    fileIds.forEach((fileId) => {
      newSelectedFiles.delete(fileId);
    });
  });

  set(selectedCollectionsAtom, newSelectedCollections);
  set(pendingCollectionsAtom, newPendingCollections);
  set(selectedItemsAtom, newSelectedItems);
  set(pendingItemsAtom, newPendingItems);
  set(selectedFilesAtom, newSelectedFiles);
});

const selectItemAtom = atom(null, (get, set, itemId: string) => {
  const selectedItems = get(selectedItemsAtom);
  const expandedItems = get(expandedItemsAtom);
  const pendingItems = get(pendingItemsAtom);
  const selectedFiles = get(selectedFilesAtom);
  const itemFiles = get(itemFilesAtom);
  const fileMetadata = get(fileMetadataAtom);

  const newSelectedItems = new Set(selectedItems);
  const newExpandedItems = new Set(expandedItems);
  const newPendingItems = new Set(pendingItems);
  const newSelectedFiles = new Set(selectedFiles);

  newSelectedItems.add(itemId);
  newExpandedItems.add(itemId);

  const existingFileIds = itemFiles.get(itemId);
  if (existingFileIds) {
    existingFileIds.forEach((fileId) => {
      const file = fileMetadata.get(fileId);
      if (file && isFileIncludedWithQuality(file)) {
        newSelectedFiles.add(fileId);
      }
    });
  } else {
    newPendingItems.add(itemId);
  }

  set(selectedItemsAtom, newSelectedItems);
  set(expandedItemsAtom, newExpandedItems);
  set(pendingItemsAtom, newPendingItems);
  set(selectedFilesAtom, newSelectedFiles);
});

const deselectItemAtom = atom(null, (get, set, itemId: string) => {
  const selectedItems = get(selectedItemsAtom);
  const pendingItems = get(pendingItemsAtom);
  const selectedFiles = get(selectedFilesAtom);
  const itemFiles = get(itemFilesAtom);

  const newSelectedItems = new Set(selectedItems);
  const newPendingItems = new Set(pendingItems);
  const newSelectedFiles = new Set(selectedFiles);

  newSelectedItems.delete(itemId);
  newPendingItems.delete(itemId);

  const fileIds = itemFiles.get(itemId) || [];
  fileIds.forEach((fileId) => {
    newSelectedFiles.delete(fileId);
  });

  set(selectedItemsAtom, newSelectedItems);
  set(pendingItemsAtom, newPendingItems);
  set(selectedFilesAtom, newSelectedFiles);
});

const toggleFileSelectionAtom = atom(null, (get, set, fileId: string) => {
  const selectedFiles = get(selectedFilesAtom);
  const newSet = new Set(selectedFiles);

  if (newSet.has(fileId)) {
    newSet.delete(fileId);
  } else {
    newSet.add(fileId);
  }

  set(selectedFilesAtom, newSet);
});

const setFilesSelectedAtom = atom(null, (get, set, { fileIds, selected }: { fileIds: string[]; selected: boolean }) => {
  const selectedFiles = get(selectedFilesAtom);
  const newSet = new Set(selectedFiles);

  for (const fileId of fileIds) {
    if (selected) {
      newSet.add(fileId);
    } else {
      newSet.delete(fileId);
    }
  }

  set(selectedFilesAtom, newSet);
});

const registerItemsForCollectionAtom = atom(null, (get, set, { collectionId, items }: { collectionId: string; items: Entity[] }) => {
  const collectionItems = get(collectionItemsAtom);
  const selectedCollections = get(selectedCollectionsAtom);
  const selectedItems = get(selectedItemsAtom);
  const pendingCollections = get(pendingCollectionsAtom);
  const pendingItems = get(pendingItemsAtom);
  const expandedItems = get(expandedItemsAtom);
  const selectedFiles = get(selectedFilesAtom);
  const itemFiles = get(itemFilesAtom);
  const fileMetadata = get(fileMetadataAtom);

  const itemIds = items.map((item) => item.id);
  const newCollectionItems = new Map(collectionItems);
  newCollectionItems.set(collectionId, itemIds);
  set(collectionItemsAtom, newCollectionItems);

  if (selectedCollections.has(collectionId)) {
    const newSelectedItems = new Set(selectedItems);
    const newPendingCollections = new Set(pendingCollections);
    const newPendingItems = new Set(pendingItems);
    const newExpandedItems = new Set(expandedItems);
    const newSelectedFiles = new Set(selectedFiles);

    newPendingCollections.delete(collectionId);

    itemIds.forEach((itemId) => {
      newSelectedItems.add(itemId);

      const existingFileIds = itemFiles.get(itemId);
      if (existingFileIds) {
        existingFileIds.forEach((fileId) => {
          const file = fileMetadata.get(fileId);
          if (file && isFileIncludedWithQuality(file)) {
            newSelectedFiles.add(fileId);
          }
        });
      } else {
        newPendingItems.add(itemId);
        newExpandedItems.add(itemId);
      }
    });

    set(selectedItemsAtom, newSelectedItems);
    set(pendingCollectionsAtom, newPendingCollections);
    set(pendingItemsAtom, newPendingItems);
    set(expandedItemsAtom, newExpandedItems);
    set(selectedFilesAtom, newSelectedFiles);
  }
});

const registerFilesForItemAtom = atom(null, (get, set, { itemId, files }: { itemId: string; files: RoCrateFile[] }) => {
  const itemFiles = get(itemFilesAtom);
  const selectedItems = get(selectedItemsAtom);
  const selectedFiles = get(selectedFilesAtom);
  const pendingItems = get(pendingItemsAtom);

  const fileIds = files.map((file) => file.id);
  const newItemFiles = new Map(itemFiles);
  newItemFiles.set(itemId, fileIds);
  set(itemFilesAtom, newItemFiles);

  if (selectedItems.has(itemId)) {
    const newSelectedFiles = new Set(selectedFiles);
    const newPendingItems = new Set(pendingItems);

    newPendingItems.delete(itemId);

    files.forEach((file) => {
      if (isFileIncludedWithQuality(file)) {
        newSelectedFiles.add(file.id);
      }
    });

    set(selectedFilesAtom, newSelectedFiles);
    set(pendingItemsAtom, newPendingItems);
  }
});

const toggleCollectionExpandAtom = atom(null, (get, set, collectionId: string) => {
  const expandedCollections = get(expandedCollectionsAtom);
  const newSet = new Set(expandedCollections);

  if (newSet.has(collectionId)) {
    newSet.delete(collectionId);
  } else {
    newSet.add(collectionId);
  }

  set(expandedCollectionsAtom, newSet);
});

const toggleItemExpandAtom = atom(null, (get, set, itemId: string) => {
  const expandedItems = get(expandedItemsAtom);
  const newSet = new Set(expandedItems);

  if (newSet.has(itemId)) {
    newSet.delete(itemId);
  } else {
    newSet.add(itemId);
  }

  set(expandedItemsAtom, newSet);
});

const addFileMetadataAtom = atom(null, (get, set, files: RoCrateFile[]) => {
  const fileMetadata = get(fileMetadataAtom);
  const newMap = new Map(fileMetadata);

  for (const file of files) {
    newMap.set(file.id, file);
  }

  set(fileMetadataAtom, newMap);
});

const clearSelectionAtom = atom(null, (_get, set) => {
  set(selectedCollectionsAtom, new Set());
  set(selectedItemsAtom, new Set());
  set(selectedFilesAtom, new Set());
  set(pendingCollectionsAtom, new Set());
  set(pendingItemsAtom, new Set());
});

// Helper functions to compute selection states
const getCollectionSelectionState = (
  collectionId: string,
  selectedCollections: Set<string>,
  collectionItems: Map<string, string[]>,
  selectedItems: Set<string>,
  pendingCollections: Set<string>,
  pendingItems: Set<string>,
  itemFiles: Map<string, string[]>,
  selectedFiles: Set<string>,
  fileMetadata: Map<string, RoCrateFile>,
): SelectionStateType => {
  if (!selectedCollections.has(collectionId)) {
    const itemIds = collectionItems.get(collectionId) || [];
    const hasSelectedItems = itemIds.some((itemId) => selectedItems.has(itemId));

    if (hasSelectedItems) {
      return 'partial';
    }

    return 'none';
  }

  const itemIds = collectionItems.get(collectionId) || [];
  if (itemIds.length === 0 && pendingCollections.has(collectionId)) {
    return 'full';
  }

  const allItemsFullySelected = itemIds.every((itemId) => {
    if (!selectedItems.has(itemId)) return false;
    const fileIds = itemFiles.get(itemId) || [];
    if (fileIds.length === 0 && pendingItems.has(itemId)) {
      return true;
    }

    return fileIds.every((fileId) => {
      const file = fileMetadata.get(fileId);
      if (file && !isFileIncludedWithQuality(file)) return true;

      return selectedFiles.has(fileId);
    });
  });

  return allItemsFullySelected ? 'full' : 'partial';
};

const getItemSelectionState = (
  itemId: string,
  selectedItems: Set<string>,
  pendingItems: Set<string>,
  itemFiles: Map<string, string[]>,
  selectedFiles: Set<string>,
  fileMetadata: Map<string, RoCrateFile>,
): SelectionStateType => {
  if (!selectedItems.has(itemId)) {
    const fileIds = itemFiles.get(itemId) || [];
    const hasSelectedFiles = fileIds.some((fileId) => selectedFiles.has(fileId));

    if (hasSelectedFiles) {
      return 'partial';
    }

    return 'none';
  }

  const fileIds = itemFiles.get(itemId) || [];
  if (fileIds.length === 0 && pendingItems.has(itemId)) {
    return 'full';
  }

  const allFilesSelected = fileIds.every((fileId) => {
    const file = fileMetadata.get(fileId);
    if (file && !isFileIncludedWithQuality(file)) return true;

    return selectedFiles.has(fileId);
  });

  return allFilesSelected ? 'full' : 'partial';
};

// Helper for components
const isFileIncluded = (file: RoCrateFile): boolean => {
  return isFileIncludedWithQuality(file);
};

// Custom hook for convenient access (similar to Zustand's useStore)
export const useSelectionStore = () => {
  const [selectedCollections] = useAtom(selectedCollectionsAtom);
  const [selectedItems] = useAtom(selectedItemsAtom);
  const [selectedFiles] = useAtom(selectedFilesAtom);
  const [expandedCollections] = useAtom(expandedCollectionsAtom);
  const [expandedItems] = useAtom(expandedItemsAtom);
  const [pendingCollections] = useAtom(pendingCollectionsAtom);
  const [pendingItems] = useAtom(pendingItemsAtom);
  const [collectionItems] = useAtom(collectionItemsAtom);
  const [itemFiles] = useAtom(itemFilesAtom);
  const [fileMetadata] = useAtom(fileMetadataAtom);

  const selectCollection = useSetAtom(selectCollectionAtom);
  const deselectCollection = useSetAtom(deselectCollectionAtom);
  const selectItem = useSetAtom(selectItemAtom);
  const deselectItem = useSetAtom(deselectItemAtom);
  const toggleFileSelection = useSetAtom(toggleFileSelectionAtom);
  const setFilesSelected = useSetAtom(setFilesSelectedAtom);
  const registerItemsForCollection = useSetAtom(registerItemsForCollectionAtom);
  const registerFilesForItem = useSetAtom(registerFilesForItemAtom);
  const toggleCollectionExpand = useSetAtom(toggleCollectionExpandAtom);
  const toggleItemExpand = useSetAtom(toggleItemExpandAtom);
  const addFileMetadata = useSetAtom(addFileMetadataAtom);
  const clearSelection = useSetAtom(clearSelectionAtom);

  const pendingInfo = useAtomValue(pendingInfoAtom);
  const selectedFilesList = useAtomValue(selectedFilesListAtom);
  const selectedFileIds = useAtomValue(selectedFileIdsAtom);
  const totalSelectedSize = useAtomValue(totalSelectedSizeAtom);

  return {
    // State
    selectedCollections,
    selectedItems,
    selectedFiles,
    expandedCollections,
    expandedItems,
    pendingCollections,
    pendingItems,
    collectionItems,
    itemFiles,
    fileMetadata,

    // Actions
    selectCollection,
    deselectCollection,
    selectItem,
    deselectItem,
    toggleFileSelection,
    setFilesSelected: useCallback((fileIds: string[], selected: boolean) => setFilesSelected({ fileIds, selected }), [setFilesSelected]),
    registerItemsForCollection: useCallback(
      (collectionId: string, items: Entity[]) => registerItemsForCollection({ collectionId, items }),
      [registerItemsForCollection],
    ),
    registerFilesForItem: useCallback((itemId: string, files: RoCrateFile[]) => registerFilesForItem({ itemId, files }), [registerFilesForItem]),
    toggleCollectionExpand,
    toggleItemExpand,
    addFileMetadata,
    clearSelection,

    // Derived
    getPendingInfo: () => pendingInfo,
    getSelectedFiles: () => selectedFilesList,
    getSelectedFileIds: () => selectedFileIds,
    getTotalSelectedSize: () => totalSelectedSize,
    isFileIncluded,
    getCollectionSelectionState: (collectionId: string) =>
      getCollectionSelectionState(
        collectionId,
        selectedCollections,
        collectionItems,
        selectedItems,
        pendingCollections,
        pendingItems,
        itemFiles,
        selectedFiles,
        fileMetadata,
      ),
    getItemSelectionState: (itemId: string) => getItemSelectionState(itemId, selectedItems, pendingItems, itemFiles, selectedFiles, fileMetadata),
  };
};

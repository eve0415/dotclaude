import { del, get, set } from 'idb-keyval';

/**
 * Directory-handle persistence so a returning user reconnects with one click
 * instead of re-navigating the system picker. Handles are structured-cloneable
 * into IndexedDB by spec; permissions do NOT persist across browser restarts,
 * so `requestPermission` must be re-invoked from a user gesture.
 */

const HANDLE_KEY = 'dotclaude:last-directory-handle';

export const persistDirectoryHandle = (handle: FileSystemDirectoryHandle): Promise<void> => set(HANDLE_KEY, handle);

export const loadPersistedDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | undefined> => {
  try {
    return await get<FileSystemDirectoryHandle>(HANDLE_KEY);
  } catch {
    return undefined;
  }
};

export const clearPersistedDirectoryHandle = (): Promise<void> => del(HANDLE_KEY);

/** True when reads are already allowed without prompting. */
export const handlePermissionGranted = async (handle: FileSystemDirectoryHandle): Promise<boolean> =>
  (await handle.queryPermission({ mode: 'read' })) === 'granted';

/** Must be called from a user gesture (click handler). */
export const requestHandlePermission = async (handle: FileSystemDirectoryHandle): Promise<boolean> =>
  (await handle.requestPermission({ mode: 'read' })) === 'granted';

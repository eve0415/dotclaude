import type { OpenedSource } from './picker';
import type { ClaudeIndex } from './scan';
import type { ReactNode } from 'react';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { openDemoSource } from './demo';
import {
  clearPersistedDirectoryHandle,
  handlePermissionGranted,
  loadPersistedDirectoryHandle,
  persistDirectoryHandle,
  requestHandlePermission,
} from './persist';
import { openDirectoryViaPicker, openFromDataTransfer, openViaFileInput, relistDirectoryHandle, supportsDirectoryPicker } from './picker';
import { scanEntries } from './scan';

interface DataSourceValue {
  source: OpenedSource | undefined;
  index: ClaudeIndex | undefined;
  /** A previously-used directory handle exists and can be reconnected with one click. */
  canRestore: boolean;
  restoreName: string | undefined;
  directoryPickerSupported: boolean;
  openDirectory: () => Promise<boolean>;
  openDirectoryFallback: () => Promise<boolean>;
  openFiles: () => Promise<boolean>;
  openDropped: (dataTransfer: DataTransfer) => Promise<boolean>;
  openDemo: () => Promise<boolean>;
  restoreLast: () => Promise<boolean>;
  refresh: () => Promise<void>;
  close: () => Promise<void>;
}

const DataSourceContext = createContext<DataSourceValue | undefined>(undefined);

// Feature detection must not run during SSR/hydration render — the server has no
// picker, so hydrate with `false` and let React re-render with the real value.
const subscribeNever = (): (() => void) => () => {};
const serverSnapshotFalse = (): boolean => false;
const useDirectoryPickerSupported = (): boolean => useSyncExternalStore(subscribeNever, supportsDirectoryPicker, serverSnapshotFalse);

export const DataSourceProvider = ({ children }: { children: ReactNode }) => {
  const [source, setSource] = useState<OpenedSource | undefined>();
  const directoryPickerSupported = useDirectoryPickerSupported();
  const [persistedHandle, setPersistedHandle] = useState<FileSystemDirectoryHandle | undefined>();

  useEffect(() => {
    const load = async (): Promise<void> => {
      setPersistedHandle(await loadPersistedDirectoryHandle());
    };
    void load();
  }, []);

  const adopt = useCallback(async (opened: OpenedSource | undefined): Promise<boolean> => {
    if (opened === undefined) return false;
    setSource(opened);
    if (opened.kind === 'directory-handle') {
      setPersistedHandle(opened.handle);
      await persistDirectoryHandle(opened.handle);
    }
    return true;
  }, []);

  const openDirectory = useCallback(async () => adopt(await openDirectoryViaPicker()), [adopt]);
  const openDirectoryFallback = useCallback(async () => adopt(await openViaFileInput({ directory: true })), [adopt]);
  const openFiles = useCallback(async () => adopt(await openViaFileInput({ directory: false })), [adopt]);
  const openDropped = useCallback(async (dataTransfer: DataTransfer) => adopt(await openFromDataTransfer(dataTransfer)), [adopt]);
  const openDemo = useCallback(async () => adopt(openDemoSource()), [adopt]);

  const restoreLast = useCallback(async () => {
    if (persistedHandle === undefined) return false;
    const granted = (await handlePermissionGranted(persistedHandle)) || (await requestHandlePermission(persistedHandle));
    if (!granted) return false;
    return adopt(await relistDirectoryHandle(persistedHandle));
  }, [adopt, persistedHandle]);

  const refresh = useCallback(async () => {
    if (source?.kind !== 'directory-handle') return;
    const relisted = await relistDirectoryHandle(source.handle);
    // The user may have opened a different source while the walk ran — only
    // apply the relisting if it still belongs to the current handle.
    setSource(current => (current?.kind === 'directory-handle' && current.handle === source.handle ? relisted : current));
  }, [source]);

  const close = useCallback(async () => {
    setSource(undefined);
    setPersistedHandle(undefined);
    await clearPersistedDirectoryHandle();
  }, []);

  const index = useMemo(() => (source === undefined ? undefined : scanEntries(source.entries)), [source]);

  const value = useMemo<DataSourceValue>(
    () => ({
      source,
      index,
      canRestore: persistedHandle !== undefined && source === undefined,
      restoreName: persistedHandle?.name,
      directoryPickerSupported,
      openDirectory,
      openDirectoryFallback,
      openFiles,
      openDropped,
      openDemo,
      restoreLast,
      refresh,
      close,
    }),
    [
      source,
      index,
      persistedHandle,
      directoryPickerSupported,
      openDirectory,
      openDirectoryFallback,
      openFiles,
      openDropped,
      openDemo,
      restoreLast,
      refresh,
      close,
    ],
  );

  return <DataSourceContext.Provider value={value}>{children}</DataSourceContext.Provider>;
};

export const useDataSource = (): DataSourceValue => {
  const value = useContext(DataSourceContext);
  if (value === undefined) throw new Error('useDataSource must be used within DataSourceProvider');
  return value;
};

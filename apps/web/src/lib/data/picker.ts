import type { FileEntry } from './file-entry';

import { entriesFromDirectoryHandle, entriesFromFiles } from './file-entry';

/** What the user opened — kept so the source can be re-listed (live refresh) and persisted. */
export type OpenedSource = { kind: 'directory-handle'; handle: FileSystemDirectoryHandle; entries: FileEntry[] } | { kind: 'file-list'; entries: FileEntry[] };

export const supportsDirectoryPicker = (): boolean => globalThis.window !== undefined && 'showDirectoryPicker' in globalThis;

/** Native FS Access API path (Chromium). Returns undefined when the user cancels. */
export const openDirectoryViaPicker = async (): Promise<OpenedSource | undefined> => {
  try {
    const handle = await globalThis.showDirectoryPicker({ id: 'dotclaude-data', mode: 'read' });
    return { kind: 'directory-handle', handle, entries: await entriesFromDirectoryHandle(handle) };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return undefined;
    throw error;
  }
};

/** Re-walk a persisted/held handle — picks up sessions written since the last scan. */
export const relistDirectoryHandle = async (handle: FileSystemDirectoryHandle): Promise<OpenedSource> => ({
  kind: 'directory-handle',
  handle,
  entries: await entriesFromDirectoryHandle(handle),
});

/** Fallback for every browser: `<input webkitdirectory>` or `<input type=file accept=.jsonl>`. */
export const openViaFileInput = (options: { directory: boolean }): Promise<OpenedSource | undefined> =>
  new Promise<OpenedSource | undefined>((resolve: (value?: OpenedSource) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (options.directory) {
      input.webkitdirectory = true;
    } else {
      input.accept = '.jsonl';
      input.multiple = true;
    }
    input.addEventListener('change', () => {
      const files = input.files === null ? [] : [...input.files];
      resolve(files.length === 0 ? undefined : { kind: 'file-list', entries: entriesFromFiles(files) });
    });
    input.addEventListener('cancel', () => {
      resolve();
    });
    input.click();
  });

const isDirectoryHandle = (handle: FileSystemHandle): handle is FileSystemDirectoryHandle => handle.kind === 'directory';

/** Drag-drop: prefer FS handles (Chromium) so the drop can be persisted; fall back to plain files. */
export const openFromDataTransfer = async (dataTransfer: DataTransfer): Promise<OpenedSource | undefined> => {
  const items = [...dataTransfer.items].filter(item => item.kind === 'file');
  const [first] = items;
  if (first !== undefined && items.length === 1 && typeof first.getAsFileSystemHandle === 'function') {
    const handle = await first.getAsFileSystemHandle();
    if (handle !== null && isDirectoryHandle(handle)) {
      return { kind: 'directory-handle', handle, entries: await entriesFromDirectoryHandle(handle) };
    }
  }
  const files: File[] = [];
  for (const item of items) {
    const file = item.getAsFile();
    if (file !== null) files.push(file);
  }
  return files.length === 0 ? undefined : { kind: 'file-list', entries: entriesFromFiles(files) };
};

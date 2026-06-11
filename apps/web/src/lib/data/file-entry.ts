/**
 * The data layer's one filesystem abstraction. Both access paths — File System
 * Access API directory handles and `<input webkitdirectory>` / drag-drop `File`
 * lists — normalize to a flat list of `FileEntry`, so scanning, parsing, and
 * queries never branch on how the data was opened.
 */
export interface FileEntry {
  /** Slash-separated path relative to the picked root, e.g. `projects/-x-y/uuid.jsonl`. */
  path: string;
  name: string;
  size: number;
  lastModified: number;
  getFile: () => Promise<File>;
}

/** Placeholder for disabled queries that still need a structurally valid entry. */
export const MISSING_FILE_ENTRY: FileEntry = {
  path: '',
  name: '',
  size: 0,
  lastModified: 0,
  getFile: () => Promise.reject(new Error('missing file entry')),
};

/** Stable identity for cache keys: same path + size + mtime ⇒ same parsed result. */
export const fileEntryKey = (entry: FileEntry): string => `${entry.path}:${entry.size}:${entry.lastModified}`;

const IGNORED_DIRECTORIES = new Set(['node_modules', '.git', 'shell-snapshots', 'file-history', 'cache', 'telemetry', 'paste-cache', 'backups']);

/** Recursively walk a directory handle into FileEntry[]. Skips bulky non-visualized directories. */
export const entriesFromDirectoryHandle = async (root: FileSystemDirectoryHandle): Promise<FileEntry[]> => {
  const entries: FileEntry[] = [];
  const walk = async (dir: FileSystemDirectoryHandle, prefix: string): Promise<void> => {
    for await (const handle of dir.values()) {
      if (handle.kind === 'directory') {
        if (IGNORED_DIRECTORIES.has(handle.name)) continue;
        await walk(handle, `${prefix}${handle.name}/`);
      } else {
        const file = await handle.getFile();
        entries.push({
          path: `${prefix}${handle.name}`,
          name: handle.name,
          size: file.size,
          lastModified: file.lastModified,
          getFile: () => handle.getFile(),
        });
      }
    }
  };
  await walk(root, '');
  return entries;
};

/**
 * Normalize a `FileList`/`File[]` (from `<input webkitdirectory>`, `<input type=file>`,
 * or drag-drop). `webkitRelativePath` includes the picked root directory name —
 * stripped so paths match the directory-handle walk.
 */
export const entriesFromFiles = (files: readonly File[]): FileEntry[] => {
  const entries: FileEntry[] = [];
  for (const file of files) {
    const relative = file.webkitRelativePath === '' ? file.name : file.webkitRelativePath;
    const segments = relative.split('/');
    const path = segments.length > 1 ? segments.slice(1).join('/') : relative;
    const topLevelDirs = segments.slice(1, -1);
    if (topLevelDirs.some(d => IGNORED_DIRECTORIES.has(d))) continue;
    entries.push({
      path,
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      getFile: () => Promise.resolve(file),
    });
  }
  return entries;
};

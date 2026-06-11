import type { FileEntry } from '#lib/data/file-entry';
import type { ReactNode } from 'react';

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@dotclaude/ui/components/dialog';
import { cn } from '@dotclaude/ui/lib/utils';
import { Image as ImageIcon, ImageOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useDataSource } from '#lib/data/data-source';
import { fileEntryKey } from '#lib/data/file-entry';

/**
 * Pasted-image attachments. Transcript records carry absolute image-cache
 * paths (`/home/…/.claude/image-cache/<session>/<n>.png`); when the picked
 * directory contains that file we render it — never fetched, the bytes stay
 * local like everything else.
 */

/** Map an absolute source path onto a path relative to the picked `~/.claude` root. */
const relativeImagePath = (sourcePath: string): string | undefined => {
  const marker = '/.claude/';
  const at = sourcePath.lastIndexOf(marker);
  return at === -1 ? undefined : sourcePath.slice(at + marker.length);
};

/** Path → entry index, built once per opened source instead of a linear scan per image chip. */
const entryMaps = new WeakMap<readonly FileEntry[], Map<string, FileEntry>>();
const entryByPath = (entries: readonly FileEntry[], path: string): FileEntry | undefined => {
  let map = entryMaps.get(entries);
  if (map === undefined) {
    map = new Map(entries.map(entry => [entry.path, entry]));
    entryMaps.set(entries, map);
  }
  return map.get(path);
};

const useImageEntry = (sourcePath: string): FileEntry | undefined => {
  const { source } = useDataSource();
  return useMemo(() => {
    const relative = relativeImagePath(sourcePath);
    if (relative === undefined || source === undefined) return;
    return entryByPath(source.entries, relative);
  }, [source, sourcePath]);
};

type ImageState = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; url: string };

const MISSING: ImageState = { status: 'missing' };
const LOADING: ImageState = { status: 'loading' };

/**
 * Object URL for the entry's file, revoked on unmount; 'missing' when absent or
 * unreadable. State is keyed by the entry so loading/missing fall out of the
 * render derivation — the effect only sets state after the async read.
 */
const useImageState = (entry: FileEntry | undefined): ImageState => {
  const [loaded, setLoaded] = useState<{ key: string; state: ImageState }>();
  useEffect(() => {
    if (entry === undefined) return;
    const key = fileEntryKey(entry);
    let cancelled = false;
    let url: string | undefined;
    const load = async (): Promise<void> => {
      try {
        const file = await entry.getFile();
        if (cancelled) return;
        url = URL.createObjectURL(file);
        setLoaded({ key, state: { status: 'ready', url } });
      } catch {
        if (!cancelled) setLoaded({ key, state: MISSING });
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (url !== undefined) URL.revokeObjectURL(url);
    };
  }, [entry]);
  if (entry === undefined) return MISSING;
  return loaded?.key === fileEntryKey(entry) ? loaded.state : LOADING;
};

const fileName = (sourcePath: string): string => sourcePath.split('/').at(-1) ?? sourcePath;

const MissingImage = ({ sourcePath }: { sourcePath: string }) => (
  <span
    title='Image file not found in the opened directory'
    className='border-border text-muted-foreground inline-flex h-20 max-w-60 items-center gap-2 rounded-md border border-dashed px-3 text-left'
  >
    <ImageOff aria-hidden className='size-4 shrink-0' />
    <span className='min-w-0'>
      <span className='block font-mono text-[10px] break-all'>{fileName(sourcePath)}</span>
      <span className='block text-[10px]'>not in opened data</span>
    </span>
  </span>
);

/** Click-to-enlarge wrapper: the trigger content opens the full-size image in a dialog. */
const ImageLightbox = ({
  url,
  label,
  triggerTitle,
  triggerClassName,
  children,
}: {
  url: string;
  label: string;
  triggerTitle: string;
  triggerClassName: string;
  children: ReactNode;
}) => (
  <Dialog>
    <DialogTrigger title={triggerTitle} className={triggerClassName}>
      {children}
    </DialogTrigger>
    <DialogContent className='w-fit max-w-[calc(100%-2rem)] p-2 sm:max-w-[90vw]'>
      <DialogTitle className='sr-only'>{label}</DialogTitle>
      <img src={url} alt={label} className='max-h-[85vh] rounded-sm object-contain' />
    </DialogContent>
  </Dialog>
);

/** Thumbnail that opens a full-size lightbox; dashed placeholder when the file is absent. */
export const ImageAttachment = ({ sourcePath, label }: { sourcePath: string; label: string }) => {
  const state = useImageState(useImageEntry(sourcePath));
  if (state.status === 'missing') return <MissingImage sourcePath={sourcePath} />;
  if (state.status === 'loading') return <span aria-label={`Loading ${label}`} className='bg-muted h-20 w-28 animate-pulse rounded-md' />;
  return (
    <ImageLightbox
      url={state.url}
      label={label}
      triggerTitle={`${label} — click to enlarge`}
      triggerClassName='border-border hover:border-primary/50 focus-visible:ring-ring inline-flex max-w-full overflow-hidden rounded-md border transition-colors focus-visible:ring-2 focus-visible:outline-none'
    >
      <img src={state.url} alt={label} className='max-h-32 max-w-full object-contain' />
    </ImageLightbox>
  );
};

const CHIP_CLASSES =
  'bg-muted text-muted-foreground inline-flex translate-y-px items-center gap-1 rounded-sm px-1.5 py-px align-baseline font-mono text-[11px]';

/** Inline replacement for a `[Image #N]` token — a chip that opens the same lightbox. */
export const ImageRefChip = ({ sourcePath, index }: { sourcePath: string; index: number }) => {
  const state = useImageState(useImageEntry(sourcePath));
  const label = `Image #${String(index)}`;
  if (state.status !== 'ready') {
    return (
      <span className={CHIP_CLASSES} title={state.status === 'missing' ? 'Image file not found in the opened directory' : undefined}>
        <ImageOff aria-hidden className='size-3' />
        {label}
      </span>
    );
  }
  return (
    <ImageLightbox
      url={state.url}
      label={label}
      triggerTitle={`${label} — click to view`}
      triggerClassName={cn(CHIP_CLASSES, 'hover:text-foreground hover:bg-muted/80 transition-colors')}
    >
      <ImageIcon aria-hidden className='size-3' />
      {label}
    </ImageLightbox>
  );
};

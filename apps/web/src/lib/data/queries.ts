import type { FileEntry } from './file-entry';
import type { ClaudeIndex, ProjectRef } from './scan';
import type { SessionSummary } from './worker-protocol';
import type { MemoryFile } from '@dotclaude/schemas/memory';

import { parseMemoryFile } from '@dotclaude/schemas/memory';
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { fileEntryKey } from './file-entry';
import { parseWorker } from './worker-client';

/**
 * Query options for everything derived from the opened files. Data lives only in
 * browser memory; keys embed `path:size:mtime` so a refreshed listing with new
 * writes re-parses exactly the files that changed.
 */

export const sessionRecordsQuery = (entry: FileEntry) =>
  queryOptions({
    queryKey: ['session-records', fileEntryKey(entry)],
    queryFn: async () => parseWorker.parseSession(await entry.getFile()),
  });

/**
 * Per-file summary cache keyed by `path:size:mtime`. The sweep query's key
 * concatenates every file key, so one appended transcript would otherwise
 * re-parse the whole directory — this keeps a refresh down to the delta.
 */
const summaryCache = new Map<string, SessionSummary>();

export const sessionSummariesQuery = (index: ClaudeIndex, onProgress?: (done: number, total: number) => void) => {
  const refs = index.projects.flatMap(project => project.sessions.map(session => ({ project, session })));
  return queryOptions({
    queryKey: ['session-summaries', refs.map(r => fileEntryKey(r.session.entry))],
    queryFn: async () => {
      const misses = refs.filter(r => !summaryCache.has(fileEntryKey(r.session.entry)));
      if (misses.length > 0) {
        const files = await Promise.all(misses.map(async r => ({ key: fileEntryKey(r.session.entry), file: await r.session.entry.getFile() })));
        const fresh = await parseWorker.summarizeMany(files, onProgress);
        for (const [key, summary] of fresh) summaryCache.set(key, summary);
      }
      const live = new Set(refs.map(r => fileEntryKey(r.session.entry)));
      for (const key of summaryCache.keys()) {
        if (!live.has(key)) summaryCache.delete(key);
      }
      return refs.map(r => ({
        project: r.project,
        session: r.session,
        summary: summaryCache.get(fileEntryKey(r.session.entry)),
      }));
    },
  });
};

const agentMetaSchema = z.looseObject({
  agentType: z.string().optional(),
  description: z.string().optional(),
  toolUseId: z.string().optional(),
});

export type AgentMeta = z.infer<typeof agentMetaSchema>;

export const agentMetaQuery = (entry: FileEntry) =>
  queryOptions({
    queryKey: ['agent-meta', fileEntryKey(entry)],
    queryFn: async (): Promise<AgentMeta> => {
      const file = await entry.getFile();
      const result = agentMetaSchema.safeParse(JSON.parse(await file.text()));
      return result.success ? result.data : {};
    },
  });

export interface ProjectMemory {
  entry: FileEntry;
  memory: MemoryFile;
}

export const projectMemoryQuery = (project: ProjectRef) =>
  queryOptions({
    queryKey: ['project-memory', project.encodedName, project.memoryFiles.map(fileEntryKey)],
    queryFn: async (): Promise<ProjectMemory[]> =>
      Promise.all(
        project.memoryFiles.map(async entry => {
          const file = await entry.getFile();
          return { entry, memory: parseMemoryFile(await file.text()) };
        }),
      ),
  });

export const historyQuery = (entry: FileEntry) =>
  queryOptions({
    queryKey: ['history', fileEntryKey(entry)],
    queryFn: async () => parseWorker.parseHistory(await entry.getFile()),
  });

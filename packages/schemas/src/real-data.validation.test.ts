import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { estimateCostUsd } from './cost';
import { parseHistoryLine } from './history';
import { parseMemoryFile } from './memory';
import { extractToolCalls, summarizeSession } from './session';
import { parseTranscriptLine } from './transcript';

/**
 * Integration check against this machine's real `~/.claude` data: every transcript
 * line, memory file, and history entry must parse. Skipped when no data exists
 * (CI). The scanning happens in helpers so the tests themselves are assertion-only.
 */

const root = '/home/node/.claude/projects';
const historyPath = '/home/node/.claude/history.jsonl';

interface TranscriptStats {
  files: number;
  lines: number;
  failed: number;
  toolCalls: number;
  pricedCost: number;
  unknownModels: string[];
}

const scanTranscripts = (): TranscriptStats => {
  const stats: TranscriptStats = { files: 0, lines: 0, failed: 0, toolCalls: 0, pricedCost: 0, unknownModels: [] };
  const unknownModels = new Set<string>();
  for (const dir of readdirSync(root)) {
    const dirPath = join(root, dir);
    if (!statSync(dirPath).isDirectory()) continue;
    for (const f of readdirSync(dirPath)) {
      if (!f.endsWith('.jsonl')) continue;
      stats.files += 1;
      const records = [];
      for (const line of readFileSync(join(dirPath, f), 'utf8').split('\n')) {
        if (line.trim() === '') continue;
        stats.lines += 1;
        const record = parseTranscriptLine(line);
        if (record === undefined) {
          stats.failed += 1;
          continue;
        }
        records.push(record);
      }
      const summary = summarizeSession(records);
      stats.toolCalls += extractToolCalls(records).length;
      for (const [model, usage] of Object.entries(summary.usageByModel)) {
        const cost = estimateCostUsd(model, usage);
        if (cost === undefined) unknownModels.add(model);
        else stats.pricedCost += cost;
      }
    }
  }
  stats.unknownModels = [...unknownModels];
  return stats;
};

const scanMemory = (): { memFiles: number; memNamed: number } => {
  let memFiles = 0;
  let memNamed = 0;
  for (const dir of readdirSync(root)) {
    const memDir = join(root, dir, 'memory');
    if (!existsSync(memDir)) continue;
    for (const f of readdirSync(memDir)) {
      if (!f.endsWith('.md') || f === 'MEMORY.md') continue;
      memFiles += 1;
      if (parseMemoryFile(readFileSync(join(memDir, f), 'utf8')).name !== undefined) memNamed += 1;
    }
  }
  return { memFiles, memNamed };
};

const scanHistory = (): { entries: number; failed: number } => {
  let entries = 0;
  let failed = 0;
  for (const line of readFileSync(historyPath, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    entries += 1;
    if (parseHistoryLine(line) === undefined) failed += 1;
  }
  return { entries, failed };
};

describe.skipIf(!existsSync(root))('real ~/.claude dataset', () => {
  it('parses every transcript line of every session', () => {
    const stats = scanTranscripts();
    expect(stats.files).toBeGreaterThan(0);
    expect(stats.failed).toBe(0);
    expect(stats.toolCalls).toBeGreaterThan(0);
    expect(stats.unknownModels).toEqual([]);
  });

  it('parses all memory files', () => {
    const { memFiles, memNamed } = scanMemory();
    expect(memNamed).toBe(memFiles);
  });

  it('parses all history entries', () => {
    const { entries, failed } = scanHistory();
    expect(entries).toBeGreaterThan(0);
    expect(failed).toBe(0);
  });
});

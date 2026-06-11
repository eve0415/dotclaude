import type { FileEntry } from './file-entry';
import type { OpenedSource } from './picker';

import { entriesFromFiles } from './file-entry';

/**
 * Synthetic ~/.claude data so visitors can explore every view without opening
 * their own directory. Generated in memory as real Files — it flows through the
 * exact same scan/parse pipeline as user data.
 */

const DAY_MS = 86_400_000;
const BASE_TIME = Date.parse('2026-06-01T09:00:00.000Z');

interface DemoTurn {
  prompt: string;
  thinking: string;
  reply: string;
  tool: { name: string; input: unknown; result: string; isError?: boolean };
  outputTokens: number;
}

const line = (value: object): string => `${JSON.stringify(value)}\n`;

const sessionJsonl = (sessionId: string, cwd: string, slug: string, model: string, startMs: number, turns: DemoTurn[]): string => {
  let out = '';
  let t = startMs;
  let uuidCounter = 0;
  const uuid = (): string => {
    uuidCounter += 1;
    return `${sessionId.slice(0, 8)}-demo-${uuidCounter}`;
  };
  const common = (): object => ({ sessionId, cwd, gitBranch: 'main', version: '2.1.172', isSidechain: false, slug });

  for (const turn of turns) {
    out += line({ type: 'user', ...common(), uuid: uuid(), timestamp: new Date(t).toISOString(), message: { role: 'user', content: turn.prompt } });
    t += 8000;
    const toolUseId = `toolu_demo_${uuidCounter}`;
    out += line({
      type: 'assistant',
      ...common(),
      uuid: uuid(),
      timestamp: new Date(t).toISOString(),
      message: {
        model,
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: turn.thinking },
          { type: 'text', text: turn.reply },
          { type: 'tool_use', id: toolUseId, name: turn.tool.name, input: turn.tool.input },
        ],
        stop_reason: 'tool_use',
        usage: {
          input_tokens: 12,
          output_tokens: turn.outputTokens,
          cache_creation_input_tokens: 2400,
          cache_read_input_tokens: 18_000,
          cache_creation: { ephemeral_5m_input_tokens: 2400, ephemeral_1h_input_tokens: 0 },
        },
      },
    });
    t += 15_000;
    out += line({
      type: 'user',
      ...common(),
      uuid: uuid(),
      timestamp: new Date(t).toISOString(),
      message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseId, content: turn.tool.result, is_error: turn.tool.isError === true }] },
    });
    t += 20_000;
  }
  return out;
};

const SESSION_A = 'aaaa1111-0000-4000-8000-000000000001';
const SESSION_B = 'bbbb2222-0000-4000-8000-000000000002';
const SESSION_C = 'cccc3333-0000-4000-8000-000000000003';

const demoFiles = (): File[] => {
  const files: [path: string, content: string, mtime: number][] = [
    [
      `.claude/projects/-workspaces-aurora/${SESSION_A}.jsonl`,
      sessionJsonl(SESSION_A, '/workspaces/aurora', 'fix-flaky-auth-tests', 'claude-opus-4-6', BASE_TIME, [
        {
          prompt: 'The auth integration tests fail roughly one run in five. Find the root cause and fix it.',
          thinking: 'Intermittent failures usually mean shared state or timing. Start by running the suite a few times and diffing the failures.',
          reply: "I'll run the failing suite in a loop first to characterize the flake before touching anything.",
          tool: {
            name: 'Bash',
            input: { command: 'for i in $(seq 1 5); do pnpm vitest run auth; done' },
            result: '3 passed, 2 failed — TokenRefresh races session teardown (ETIMEDOUT in afterEach)',
            isError: true,
          },
          outputTokens: 410,
        },
        {
          prompt: 'Makes sense. Apply the fix.',
          thinking: 'The teardown awaits the wrong promise. Await the refresh queue drain before closing the pool.',
          reply: 'The teardown closes the connection pool while a token refresh is still in flight. Awaiting the refresh queue drain fixes it.',
          tool: {
            name: 'Edit',
            input: { file_path: '/workspaces/aurora/tests/auth/teardown.ts' },
            result: 'Edited 1 file: awaited refreshQueue.drain() before pool.close()',
          },
          outputTokens: 280,
        },
      ]),
      BASE_TIME + DAY_MS * 0.2,
    ],
    [
      `.claude/projects/-workspaces-aurora/${SESSION_B}.jsonl`,
      sessionJsonl(SESSION_B, '/workspaces/aurora', 'add-billing-webhooks', 'claude-sonnet-4-6', BASE_TIME + DAY_MS * 2, [
        {
          prompt: 'Add Stripe webhook handling for invoice.paid and invoice.payment_failed.',
          thinking: 'Need signature verification, idempotency, and a retry-safe handler.',
          reply: 'Scaffolding the webhook route with signature verification and an idempotency table first.',
          tool: {
            name: 'Write',
            input: { file_path: '/workspaces/aurora/src/billing/webhooks.ts' },
            result: 'Created webhook handler with stripe.webhooks.constructEvent verification',
          },
          outputTokens: 620,
        },
      ]),
      BASE_TIME + DAY_MS * 2.1,
    ],
    [
      `.claude/projects/-home-eve-tools-relay/${SESSION_C}.jsonl`,
      sessionJsonl(SESSION_C, '/home/eve/tools/relay', 'profile-startup-time', 'claude-haiku-4-5', BASE_TIME + DAY_MS * 4, [
        {
          prompt: 'Startup takes 4 seconds. Profile it and tell me where the time goes.',
          thinking: 'Quick win: --cpu-prof on the entry point.',
          reply: 'Profiling the entry point with the V8 CPU profiler.',
          tool: {
            name: 'Bash',
            input: { command: 'node --cpu-prof dist/index.js --exit-after-boot' },
            result: '78% of startup inside loadPlugins() — synchronous glob over node_modules',
          },
          outputTokens: 190,
        },
      ]),
      BASE_TIME + DAY_MS * 4.3,
    ],
    [
      '.claude/projects/-workspaces-aurora/memory/MEMORY.md',
      '# Memory Index\n\n- [feedback-test-isolation](feedback-test-isolation.md) — always isolate integration test state\n',
      BASE_TIME,
    ],
    [
      '.claude/projects/-workspaces-aurora/memory/feedback-test-isolation.md',
      `---\nname: feedback-test-isolation\ndescription: Always isolate integration test state per run\nmetadata:\n  type: feedback\n  originSessionId: ${SESSION_A}\n---\n\nFlaky auth tests were caused by shared session state between runs.\n\n**Why:** teardown raced in-flight token refreshes.\n\n**How to apply:** await [[project-refresh-queue]] drain in every teardown.\n`,
      BASE_TIME,
    ],
    [
      '.claude/history.jsonl',
      [
        { display: 'The auth integration tests fail roughly one run in five…', timestamp: BASE_TIME, project: '/workspaces/aurora', sessionId: SESSION_A },
        { display: 'Add Stripe webhook handling for invoice.paid…', timestamp: BASE_TIME + DAY_MS * 2, project: '/workspaces/aurora', sessionId: SESSION_B },
        { display: 'Startup takes 4 seconds. Profile it…', timestamp: BASE_TIME + DAY_MS * 4, project: '/home/eve/tools/relay', sessionId: SESSION_C },
      ]
        .map(entry => `${JSON.stringify(entry)}\n`)
        .join(''),
      BASE_TIME + DAY_MS * 4,
    ],
  ];

  return files.map(([path, content, mtime]) => {
    const name = path.split('/').at(-1) ?? path;
    const file = new File([content], name, { lastModified: mtime });
    Object.defineProperty(file, 'webkitRelativePath', { value: path });
    return file;
  });
};

export const openDemoSource = (): OpenedSource => {
  const entries: FileEntry[] = entriesFromFiles(demoFiles());
  return { kind: 'file-list', entries };
};

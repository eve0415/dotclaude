/**
 * Stream a File's lines without holding the whole text in memory — transcripts
 * can be multi-megabyte, and the aggregate pass walks hundreds of them.
 * Only each incoming chunk is scanned for newlines; a single partial line is
 * carried across chunk boundaries (never re-scanning the accumulated buffer).
 */
export const streamLines = async function* (file: File): AsyncGenerator<string> {
  const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
  let carry = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = value.split('\n');
    // First piece completes the carried partial line; last piece becomes the new carry.
    lines[0] = carry + (lines[0] ?? '');
    carry = lines.pop() ?? '';
    for (const line of lines) {
      if (line !== '') yield line;
    }
  }
  if (carry !== '') yield carry;
};

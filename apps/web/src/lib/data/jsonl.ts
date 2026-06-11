/**
 * Stream a File's lines without holding the whole text in memory — transcripts
 * can be multi-megabyte, and the aggregate pass walks hundreds of them.
 */
export const streamLines = async function* (file: File): AsyncGenerator<string> {
  const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line !== '') yield line;
    }
  }
  if (buffer !== '') yield buffer;
};

export interface MemoryFile {
  name: string | undefined;
  description: string | undefined;
  /** `metadata.type`: user | feedback | project | reference | … */
  memoryType: string | undefined;
  originSessionId: string | undefined;
  /** Markdown body without the frontmatter block. */
  body: string;
  /** `[[wiki-link]]` targets referenced in the body. */
  links: string[];
}

const FRONTMATTER_DELIMITER = '---';

/**
 * Parse a memory markdown file: a small YAML-subset frontmatter block
 * (flat `key: value` pairs plus one optional nested `metadata:` map) and a body.
 * A full YAML parser is deliberately avoided — memory files are machine-written
 * with this exact shape, and unknown lines are simply skipped.
 */
export const parseMemoryFile = (text: string): MemoryFile => {
  const lines = text.split('\n');
  let body = text;
  let name: string | undefined;
  let description: string | undefined;
  let memoryType: string | undefined;
  let originSessionId: string | undefined;

  if (lines[0]?.trim() === FRONTMATTER_DELIMITER) {
    const endIndex = lines.findIndex((line, i) => i > 0 && line.trim() === FRONTMATTER_DELIMITER);
    if (endIndex > 0) {
      let inMetadata = false;
      for (const line of lines.slice(1, endIndex)) {
        if (line.trim() === '') continue;
        const indented = line.startsWith(' ') || line.startsWith('\t');
        if (!indented) inMetadata = false;
        const colon = line.indexOf(':');
        if (colon === -1) continue;
        const key = line.slice(0, colon).trim();
        const value = stripQuotes(line.slice(colon + 1).trim());
        if (!indented) {
          if (key === 'name') name = value;
          else if (key === 'description') description = value;
          else if (key === 'metadata' && value === '') inMetadata = true;
        } else if (inMetadata) {
          if (key === 'type') memoryType = value;
          else if (key === 'originSessionId') originSessionId = value;
        }
      }
      body = lines
        .slice(endIndex + 1)
        .join('\n')
        .trim();
    }
  }

  return { name, description, memoryType, originSessionId, body, links: extractWikiLinks(body) };
};

const stripQuotes = (value: string): string => {
  if (value.length >= 2 && ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"')))) {
    return value.slice(1, -1);
  }
  return value;
};

export const extractWikiLinks = (body: string): string[] => {
  const links = new Set<string>();
  for (const match of body.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const target = match[1]?.trim();
    if (target !== undefined && target !== '') links.add(target);
  }
  return [...links];
};

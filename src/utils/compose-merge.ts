/**
 * Marker-block parser/writer for docker-compose.yml (and the root .env).
 *
 * Design (see `plans/phase2_multi_service_generation.md` §D.1):
 *
 * The `# >>> stackr managed <name> >>>` / `# <<< stackr managed <name> <<<`
 * markers wrap *entries inside* the top-level `services:` and `volumes:`
 * maps — NOT the top-level keys themselves. A generated compose file looks
 * like this:
 *
 *   services:
 *     # >>> stackr managed services >>>
 *     auth_db: { ... }
 *     auth_rest_api: { ... }
 *     core_db: { ... }
 *     core_rest_api: { ... }
 *     # <<< stackr managed services <<<
 *
 *     # (user-added services go here, inside the same services: map)
 *
 *   volumes:
 *     # >>> stackr managed volumes >>>
 *     auth_postgres_data:
 *     core_postgres_data:
 *     # <<< stackr managed volumes <<<
 *
 * Why this layout: YAML treats the marker comments as whitespace, so user-
 * added entries at the same 2-space indent are naturally part of the same
 * top-level map. `writeMarkedBlock` can splice-replace managed entries
 * without touching user content.
 *
 * Phase 2 only exercises `initComposeWithMarkedBlocks` (fresh init); phase 3
 * uses `writeMarkedBlock` for preservation. Implementation + unit tests
 * cover both primitives now.
 */

/** Thrown when a marker block is requested that isn't present in the file. */
export class MarkerNotFoundError extends Error {
  constructor(name: string) {
    super(`Marker block "${name}" not found`);
    this.name = 'MarkerNotFoundError';
  }
}

export interface MarkerBlock {
  /** Index of the start-marker line (0-based). */
  start: number;
  /** Index of the end-marker line (0-based). */
  end: number;
  /** The content lines between (exclusive) the markers, joined with '\n'. */
  inner: string;
  /** Indentation (string of spaces) detected from the start marker. */
  indent: string;
  /** Line separator detected in the source ('\n' or '\r\n'). */
  lineSeparator: '\n' | '\r\n';
}

/**
 * Detect whether the content is CRLF or LF encoded. Returns the separator
 * actually used (first occurrence wins — mixed endings are treated as LF).
 */
function detectLineSeparator(content: string): '\n' | '\r\n' {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

/**
 * Find the start and end marker lines for a given block name.
 * Returns null if either marker is missing.
 */
export function readMarkedBlock(content: string, name: string): MarkerBlock | null {
  const sep = detectLineSeparator(content);
  const lines = content.split(sep);

  // Accept any amount of leading whitespace in front of the marker comment.
  const startRe = new RegExp(`^(\\s*)#\\s*>>>\\s*stackr managed ${escapeRegex(name)}\\s*(?:\\(.*?\\)\\s*)?>>>\\s*$`);
  const endRe = new RegExp(`^\\s*#\\s*<<<\\s*stackr managed ${escapeRegex(name)}\\s*<<<\\s*$`);

  let startIdx = -1;
  let endIdx = -1;
  let indent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (startIdx === -1) {
      const m = line.match(startRe);
      if (m) {
        startIdx = i;
        indent = m[1];
      }
    } else if (endRe.test(line)) {
      endIdx = i;
      break;
    }
  }

  if (startIdx === -1 || endIdx === -1) {
    return null;
  }

  const innerLines = lines.slice(startIdx + 1, endIdx);
  return {
    start: startIdx,
    end: endIdx,
    inner: innerLines.join(sep),
    indent,
    lineSeparator: sep,
  };
}

/**
 * Replace the contents of a named marker block with `inner`. Throws
 * `MarkerNotFoundError` if the block isn't present.
 *
 * `inner` MUST already be correctly indented for insertion between the
 * markers (the function does not re-indent). Callers use the same indent
 * level `renderDockerCompose` chose for the managed entries.
 *
 * Content outside the markers is preserved byte-for-byte (modulo the line
 * separator, which is re-used from the source).
 */
export function writeMarkedBlock(content: string, name: string, inner: string): string {
  const block = readMarkedBlock(content, name);
  if (!block) {
    throw new MarkerNotFoundError(name);
  }

  const sep = block.lineSeparator;
  const lines = content.split(sep);

  // Normalize the inner payload: strip leading/trailing newlines but keep
  // internal newlines. Split so we can splice it as line entries rather
  // than a single joined string (keeps the join deterministic).
  const innerLines = inner.length === 0 ? [] : inner.split(/\r?\n/);

  const before = lines.slice(0, block.start + 1); // include start marker
  const after = lines.slice(block.end);            // include end marker + rest

  return [...before, ...innerLines, ...after].join(sep);
}

/**
 * Build a fresh docker-compose.yml shell with two top-level keys
 * (`services:` and `volumes:`) containing stackr-managed marker blocks.
 *
 * `serviceEntries` and `volumeEntries` are the already-indented entry
 * strings (each line prefixed with 2 spaces) that get spliced between the
 * markers. `renderDockerCompose` produces them and then calls this helper.
 *
 * Deterministic, byte-stable output for identical inputs — phase 3
 * preservation tests depend on this.
 */
export function initComposeWithMarkedBlocks(
  serviceEntries: string,
  volumeEntries: string,
  options: { header?: string } = {}
): string {
  const header = options.header ?? '';
  const parts: string[] = [];

  if (header) {
    parts.push(header);
    if (!header.endsWith('\n')) parts.push('\n');
  }

  parts.push('services:\n');
  parts.push('  # >>> stackr managed services >>>\n');
  if (serviceEntries.length > 0) {
    parts.push(serviceEntries);
    if (!serviceEntries.endsWith('\n')) parts.push('\n');
  }
  parts.push('  # <<< stackr managed services <<<\n');
  parts.push('\n');
  parts.push('volumes:\n');
  parts.push('  # >>> stackr managed volumes >>>\n');
  if (volumeEntries.length > 0) {
    parts.push(volumeEntries);
    if (!volumeEntries.endsWith('\n')) parts.push('\n');
  }
  parts.push('  # <<< stackr managed volumes <<<\n');

  return parts.join('');
}

/**
 * Escape a string for use inside a `new RegExp(...)` literal.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

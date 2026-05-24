import {
  parseDocument,
  isMap,
  isScalar,
  type Document,
  type YAMLMap,
  type Pair,
  type Scalar,
} from 'yaml';

import { renderComposeInnerBlocks } from '../../generators/docker-compose.js';
import type { StackrConfigFile } from '../../types/config-file.js';

/**
 * Additive merge for `docker-compose.yml` / `docker-compose.prod.yml`.
 *
 * Behaviour:
 * - Strips any legacy `# >>> stackr managed services >>>` / `# <<<` marker
 *   comment lines that exist from pre-AST projects. One-time visible churn
 *   on the first regen; from then on no markers remain.
 * - For each service+volume entry stackr would emit for `newConfig`, adds
 *   it to the on-disk doc IF AND ONLY IF the key is missing. Existing
 *   entries are left untouched — users own their customizations to
 *   `auth_db`'s image tag, env vars, healthcheck overrides, etc.
 * - File-level comments, networks, secrets, custom services the user added
 *   themselves are all preserved by `yaml`'s CST-preserving parser.
 *
 * Pure: takes the current source text + the post-add config, returns the
 * new source text.
 */
export function mergeDockerCompose(
  source: string,
  newConfig: StackrConfigFile,
  mode: 'dev' | 'prod'
): string {
  const cleaned = stripStackrMarkers(source);

  const doc = parseDocument(cleaned, { keepSourceTokens: true });
  if (doc.errors.length > 0) {
    throw new Error(
      `mergeDockerCompose: source failed to parse as YAML — ${doc.errors[0].message}`
    );
  }

  const rendered = renderComposeInnerBlocks(newConfig, mode);
  const wrapped =
    'services:\n' +
    (rendered.services.length > 0 ? rendered.services : '  {}\n') +
    (mode === 'dev'
      ? '\nvolumes:\n' + (rendered.volumes.length > 0 ? rendered.volumes : '  {}\n')
      : '');
  const renderedDoc = parseDocument(wrapped);
  if (renderedDoc.errors.length > 0) {
    throw new Error(
      `mergeDockerCompose: render output failed to parse internally — ${renderedDoc.errors[0].message}. This is a stackr bug.`
    );
  }

  mergeMap(doc, renderedDoc, 'services');
  if (mode === 'dev') {
    mergeMap(doc, renderedDoc, 'volumes');
  }

  return doc.toString();
}

/**
 * Remove the stackr-managed marker comment lines (`# >>> stackr managed …`
 * / `# <<< stackr managed …`) from a YAML source string. Idempotent — a
 * file with no markers is returned unchanged. Used for legacy migration.
 */
export function stripStackrMarkers(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*#\s*(>>>|<<<)\s+stackr managed/i.test(line))
    .join('\n');
}

function mergeMap(
  targetDoc: Document,
  sourceDoc: Document,
  key: 'services' | 'volumes'
): void {
  const desired = sourceDoc.get(key);
  if (!isMap(desired)) return;
  if (desired.items.length === 0) return;

  const existing = targetDoc.get(key);
  if (!isMap(existing)) {
    targetDoc.set(key, desired);
    return;
  }

  for (const item of desired.items as Pair[]) {
    const itemKey = isScalar(item.key) ? (item.key as Scalar).value : item.key;
    if (typeof itemKey !== 'string') continue;
    if ((existing as YAMLMap).has(itemKey)) continue;
    (existing as YAMLMap).add(item);
  }
}

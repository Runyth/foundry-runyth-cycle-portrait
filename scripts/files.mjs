/** Source discovery for Actor portraits; no document mutations in this module. */
export const MODULE_ID = 'runyth-cycle-portrait';
export const EXTENSIONS = Object.freeze(['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg']);
const EXTENSION_RE = /\.(?:png|jpe?g|webp|avif|gif|svg)(?:[?#].*)?$/i;
const MAX_IMAGES = 3000;

export function isImagePath(path) {
  return typeof path === 'string' && EXTENSION_RE.test(path.trim());
}

/** Only web-safe file references are accepted. No data, javascript, or path traversal. */
export function assertSafePath(value, { allowEmpty = false } = {}) {
  const path = String(value ?? '').trim();
  if (allowEmpty && !path) return '';
  if (!path || path.length > 2048 || /[\u0000-\u001f\\]/.test(path)) throw new Error('Invalid image path');
  if (/^(?:javascript|data|file|blob):/i.test(path)) throw new Error('Unsupported image scheme');
  if (/^(?!https?:\/\/)[a-z][a-z0-9+.-]*:\/\//i.test(path) && !path.startsWith('s3://')) {
    throw new Error('Unsupported image scheme');
  }
  const withoutQuery = path.split(/[?#]/)[0];
  if (withoutQuery.split('/').some(segment => {
    try { return decodeURIComponent(segment) === '..'; } catch { return true; }
  })) throw new Error('Parent-directory paths are forbidden');
  if (path.startsWith('//')) throw new Error('Protocol-relative URLs are forbidden');
  return path;
}

export function hasWildcard(pattern) {
  return /[*?{}]/.test(pattern);
}

export function filename(path) {
  try {
    return decodeURIComponent(String(path).split(/[?#]/)[0].split('/').pop() || '');
  } catch {
    return String(path).split(/[?#]/)[0].split('/').pop() || '';
  }
}

export function fallbackPattern(image) {
  const path = assertSafePath(image);
  if (/^https?:\/\//i.test(path)) return path;
  if (hasWildcard(path)) return path;
  const slash = path.lastIndexOf('/');
  return `${slash < 0 ? '' : path.slice(0, slash + 1)}*`;
}

/** Supports *, **, ?, and non-nested comma-separated braces without eval. */
export function globExpression(pattern) {
  const text = assertSafePath(pattern);
  let expression = '^';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '*') {
      if (text[i + 1] === '*') {
        expression += '.*';
        i++;
      } else expression += '[^/]*';
    } else if (ch === '?') expression += '[^/]';
    else if (ch === '{') {
      const end = text.indexOf('}', i + 1);
      if (end === -1 || text.slice(i + 1, end).includes('{')) throw new Error('Invalid wildcard braces');
      const choices = text.slice(i + 1, end).split(',');
      if (choices.length > 32 || !choices.every(v => v && !/[/*?{}]/.test(v))) throw new Error('Invalid wildcard alternatives');
      expression += `(?:${choices.map(escapeRegex).join('|')})`;
      i = end;
    } else expression += escapeRegex(ch);
  }
  return new RegExp(`${expression}$`, 'i');
}

function escapeRegex(char) {
  return char.replace(/[\\^$+?.()|[\]{}]/g, '\\$&');
}

function browseSpec(pattern) {
  if (pattern.startsWith('s3://')) {
    const [, bucket, ...segments] = pattern.slice(5).split('/');
    if (!bucket || !segments.length) throw new Error('Invalid S3 pattern');
    return { source: 's3', bucket, path: segments.join('/') };
  }
  if (/^https?:\/\//i.test(pattern)) return { source: 'http', path: pattern };
  return { source: 'data', path: pattern };
}

/** Read through Foundry's authorized FilePicker API. Never fetch arbitrary remote URLs. */
export async function discoverImages(pattern, { browse, refresh = false } = {}) {
  const normalized = assertSafePath(pattern);
  if (!hasWildcard(normalized)) {
    if (!isImagePath(normalized)) throw new Error('The specified file is not a supported image');
    return [normalized];
  }
  const spec = browseSpec(normalized);
  if (spec.source === 'http') throw new Error('Remote directory enumeration is not supported');
  if (typeof browse !== 'function') throw new Error('File browsing is unavailable');
  const glob = globExpression(normalized);
  const opts = { wildcard: true, extensions: EXTENSIONS.map(e => `.${e}`), ...(spec.bucket ? { bucket: spec.bucket } : {}) };
  // Prefer Foundry's native wildcard resolver. Its supported wildcard syntax
  // varies by storage provider, so fall back to a bounded directory listing.
  let response;
  try { response = await browse(spec.source, spec.path, opts); }
  catch { response = null; }
  let files = Array.isArray(response?.files) ? response.files : [];
  if (!files.length) {
    const firstMeta = spec.path.search(/[*?{]/);
    const prefix = spec.path.slice(0, firstMeta);
    const directory = prefix.includes('/') ? prefix.slice(0, prefix.lastIndexOf('/')) : '';
    const listing = await browse(spec.source, directory, { ...opts, wildcard: false });
    files = Array.isArray(listing?.files) ? listing.files.slice(0, MAX_IMAGES * 2) : [];
  }
  const resolved = files.map(f => typeof f === 'string' ? f : f?.path).filter(v => typeof v === 'string');
  const normalizedFiles = spec.source === 's3' ? resolved.map(f => f.startsWith('s3://') ? f : `s3://${spec.bucket}/${f.replace(/^\/+/, '')}`) : resolved;
  const valid = normalizedFiles.filter(f => {
    try { return isImagePath(f) && glob.test(assertSafePath(f)); } catch { return false; }
  });
  // Browsers occasionally return a directory listing for a wildcard path; validation stays local.
  return [...new Set(valid)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).slice(0, MAX_IMAGES);
}

export function regexFilter(query, { regex = false } = {}) {
  const term = String(query ?? '');
  if (!regex) return name => name.toLocaleLowerCase().includes(term.toLocaleLowerCase());
  if (term.length > 120 || /(\([^)]*[+*][^)]*\)[+*{])|\\[1-9]|\(\?<?[=!]/.test(term)) {
    throw new Error('Expression is too complex');
  }
  let expression;
  try { expression = new RegExp(term, 'i'); } catch { throw new Error('Invalid regular expression'); }
  return name => expression.test(name);
}

export function makeFileRepository({ browse, now = () => Date.now(), ttl = 15_000 } = {}) {
  const cache = new Map();
  return {
    async list(pattern, { refresh = false } = {}) {
      const key = assertSafePath(pattern);
      const saved = cache.get(key);
      // Deduplicate unresolved requests before using the resolved TTL cache.
      if (!refresh && saved?.promise) return [...await saved.promise];
      if (!refresh && saved?.files && now() - saved.time < ttl) return [...saved.files];
      const promise = discoverImages(key, { browse });
      cache.set(key, { promise, time: now() });
      try {
        const files = await promise;
        cache.set(key, { files, time: now() });
        while (cache.size > 24) cache.delete(cache.keys().next().value);
        return [...files];
      } catch (error) {
        cache.delete(key);
        throw error;
      }
    },
    invalidate(pattern) { if (pattern) cache.delete(pattern); else cache.clear(); }
  };
}

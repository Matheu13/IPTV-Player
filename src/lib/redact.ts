/**
 * Deterministic 4-character hex hash function (FNV-1a based).
 * 100% universal across Browser, Web Worker, and Node.js environments.
 */
function deterministicHash4(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 4);
}

/**
 * Partial redaction helper:
 * Preserves the first 2 characters of a secret and appends a 4-character deterministic hash
 * of the secret (e.g. "mysecret123" -> "my…a83f").
 * This avoids blanket masking so we can distinguish between "config and server disagree" vs "both match".
 */
export function partialRedact(secret: string | null | undefined): string {
  if (secret === null || secret === undefined) return '';
  const str = String(secret);
  if (str.length === 0) return '';

  const hash = deterministicHash4(str);

  if (str.length <= 2) {
    return `*${str.slice(0, 1)}…${hash}`;
  }
  return `${str.slice(0, 2)}…${hash}`;
}

const CREDENTIAL_KEY_REGEX = /^(username|password|pass|pwd|token|auth|authorization|api_key|apikey|secret|key|user)$/i;
const CREDENTIAL_PREFIX_REGEX = /^(auth[_-]?|user[_-]?|pass[_-]?|token[_-]?|secret[_-]?)/i;

/**
 * Redacts credential-bearing query parameters and positional URL paths.
 * Xtream stream URLs embed credentials positionally:
 * e.g. http://host:port/live/USERNAME/PASSWORD/12345.ts
 *      http://host:port/movie/USERNAME/PASSWORD/12345.mp4
 *      http://host:port/series/USERNAME/PASSWORD/12345.mp4
 *      http://host:port/get.php?username=USERNAME&password=PASSWORD
 *      http://host:port/player_api.php?username=USERNAME&password=PASSWORD
 */
export function redactUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;

  try {
    const parsed = new URL(rawUrl);

    // 1. Redact username / password in URL authority (http://user:pass@host/)
    if (parsed.username) {
      parsed.username = partialRedact(parsed.username);
    }
    if (parsed.password) {
      parsed.password = partialRedact(parsed.password);
    }

    // 2. Redact credential-bearing query params
    for (const [key, value] of Array.from(parsed.searchParams.entries())) {
      if (CREDENTIAL_KEY_REGEX.test(key) || CREDENTIAL_PREFIX_REGEX.test(key)) {
        parsed.searchParams.set(key, partialRedact(value));
      }
    }

    // 3. Redact positional path segments for Xtream URLs:
    // Segments: ['', 'live', 'USERNAME', 'PASSWORD', '12345.ts']
    const segments = parsed.pathname.split('/');
    if (segments.length >= 4) {
      const section = segments[1]?.toLowerCase();
      // If the 1st segment is live, movie, series, play, or streaming prefix
      if (['live', 'movie', 'series', 'play', 'stream', 'xmltv.php', 'hls'].includes(section) || segments.length === 5) {
        // Redact segment 2 (username) and segment 3 (password)
        if (segments[2] && segments[2].length > 0) {
          segments[2] = partialRedact(segments[2]);
        }
        if (segments[3] && segments[3].length > 0) {
          segments[3] = partialRedact(segments[3]);
        }
        parsed.pathname = segments.join('/');
      }
    }

    return parsed.toString();
  } catch {
    // If it's a partial URL or regex-matchable string
    return rawUrl.replace(/(live|movie|series|play)\/([^/\s]+)\/([^/\s]+)\/([^\s]+)/gi, (_m, prefix, user, pass, file) => {
      return `${prefix}/${partialRedact(user)}/${partialRedact(pass)}/${file}`;
    }).replace(/([?&](?:username|password|pass|token|auth)=)([^&\s]+)/gi, (_m, prefix, val) => {
      return `${prefix}${partialRedact(val)}`;
    });
  }
}

/**
 * Universal redact function.
 * Every path that emits text — console, log files, diagnostics UI, error messages,
 * clipboard export, crash reports, test fixtures — MUST pass through this.
 */
export function redact<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    // Check if it's a JSON string
    if ((input.startsWith('{') && input.endsWith('}')) || (input.startsWith('[') && input.endsWith(']'))) {
      try {
        const parsed = JSON.parse(input);
        return JSON.stringify(redactObject(parsed)) as unknown as T;
      } catch {
        // Not valid JSON, continue to string redaction
      }
    }

    // 1. Replace embedded full URLs
    let redactedText = input.replace(/https?:\/\/[^\s"'<>]+/gi, (urlMatch) => {
      return redactUrl(urlMatch);
    });

    // 2. Replace any residual user:password@ credentials
    redactedText = redactedText.replace(/([a-zA-Z0-9_.-]+):([^\s@/:]{3,})@/g, (_m, u, p) => {
      return `${u}:${partialRedact(p)}@`;
    });

    // 3. Replace token=... or secret=... or password=... in query or free text
    redactedText = redactedText.replace(/(token|secret|password|passwd|api_key|auth)=([^\s&"'>]+)/gi, (_m, key, val) => {
      return `${key}=${partialRedact(val)}`;
    });

    return redactedText as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => redact(item)) as unknown as T;
  }

  if (input instanceof Error) {
    const redactedErr = new Error(redact(input.message));
    redactedErr.name = input.name;
    if (input.stack) {
      redactedErr.stack = redact(input.stack);
    }
    return redactedErr as unknown as T;
  }

  if (typeof input === 'object') {
    return redactObject(input) as unknown as T;
  }

  return input;
}

/**
 * Deep redaction of objects, protecting keys and nested URL values.
 */
export function redactObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return redact(obj);
  if (Array.isArray(obj)) return obj.map((item) => redactObject(item));

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSecretKey = CREDENTIAL_KEY_REGEX.test(key) || CREDENTIAL_PREFIX_REGEX.test(key);

    if (isSecretKey) {
      if (typeof value === 'string') {
        result[key] = partialRedact(value);
      } else if (value === null || value === undefined) {
        result[key] = value;
      } else {
        result[key] = partialRedact(String(value));
      }
    } else if (typeof value === 'string') {
      result[key] = redact(value);
    } else if (typeof value === 'object') {
      result[key] = redactObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

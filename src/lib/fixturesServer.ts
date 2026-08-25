import fs from 'fs';
import path from 'path';
import { redact } from './redact';
import {
  FIXTURE_AUTH_ACTIVE,
  FIXTURE_AUTH_EXPIRED,
  FIXTURE_AUTH_BANNED,
  FIXTURE_AUTH_DISABLED,
  FIXTURE_AUTH_BAD_CREDENTIALS,
  FIXTURE_CATEGORIES_VALID,
  FIXTURE_CATEGORIES_EMPTY,
  FIXTURE_STREAMS_SAMPLE,
  FIXTURE_STREAM_PROBE_RESULT,
  FIXTURE_ERROR_429_RATELIMIT,
  FIXTURE_ERROR_HTML_INTERSTITIAL,
  FIXTURE_ERROR_TRUNCATED_JSON_STRING,
} from './fixtures';

export const FIXTURES_DIR = path.resolve(process.cwd(), 'tests', 'fixtures');

/**
 * Server-only helper: Writes all scrubbed test fixtures to the tests/fixtures directory.
 */
export function writeAllFixtures(): void {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  const write = (filename: string, data: any) => {
    const filePath = path.join(FIXTURES_DIR, filename);
    const content = typeof data === 'string' ? data : JSON.stringify(redact(data), null, 2);
    fs.writeFileSync(filePath, content, { mode: 0o600 });
  };

  write('auth_active.json', FIXTURE_AUTH_ACTIVE);
  write('auth_expired.json', FIXTURE_AUTH_EXPIRED);
  write('auth_banned.json', FIXTURE_AUTH_BANNED);
  write('auth_disabled.json', FIXTURE_AUTH_DISABLED);
  write('auth_bad_credentials.json', FIXTURE_AUTH_BAD_CREDENTIALS);
  write('categories_valid.json', FIXTURE_CATEGORIES_VALID);
  write('categories_empty.json', FIXTURE_CATEGORIES_EMPTY);
  write('streams_sample.json', FIXTURE_STREAMS_SAMPLE);
  write('stream_probe_result.json', FIXTURE_STREAM_PROBE_RESULT);
  write('error_429_ratelimit.json', FIXTURE_ERROR_429_RATELIMIT);
  write('error_html_interstitial.html', FIXTURE_ERROR_HTML_INTERSTITIAL);
  write('error_truncated.json', FIXTURE_ERROR_TRUNCATED_JSON_STRING);

  console.log(`[Fixtures] Successfully wrote 12 scrubbed test fixtures to ${FIXTURES_DIR}`);
}

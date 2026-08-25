/**
 * Milestone 1 Error Taxonomy
 * Every failure mode maps to a distinct, actionable, user-visible message.
 */

export enum ErrorCode {
  AUTH_BAD_CREDENTIALS = 'AUTH_BAD_CREDENTIALS',
  AUTH_NON_ACTIVE_EXPIRED = 'AUTH_NON_ACTIVE_EXPIRED',
  AUTH_NON_ACTIVE_BANNED = 'AUTH_NON_ACTIVE_BANNED',
  AUTH_NON_ACTIVE_DISABLED = 'AUTH_NON_ACTIVE_DISABLED',
  CONNECTION_LIMIT_EXCEEDED = 'CONNECTION_LIMIT_EXCEEDED',
  CATEGORIES_EMPTY_BOUQUET_BUG = 'CATEGORIES_EMPTY_BOUQUET_BUG',
  RATE_LIMITED_429 = 'RATE_LIMITED_429',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  HTML_INTERSTITIAL_ERROR = 'HTML_INTERSTITIAL_ERROR',
  TRUNCATED_PARTIAL_JSON = 'TRUNCATED_PARTIAL_JSON',
  MALFORMED_JSON = 'MALFORMED_JSON',
  INVALID_CONTENT_TYPE = 'INVALID_CONTENT_TYPE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface TaxonomyErrorDetail {
  code: ErrorCode;
  httpStatus?: number;
  userTitle: string;
  userMessage: string;
  technicalDetails: string;
  isRetryable: boolean;
  retryStrategy: 'IMMEDIATE' | 'EXPONENTIAL_BACKOFF' | 'NO_RETRY' | 'MANUAL_INTERVENTION';
  backoffSeconds?: number;
  providerRemediation: string;
}

export class IPTVTaxonomyError extends Error {
  public readonly detail: TaxonomyErrorDetail;

  constructor(detail: TaxonomyErrorDetail) {
    super(detail.userMessage);
    this.name = 'IPTVTaxonomyError';
    this.detail = detail;
  }
}

/**
 * Classifies server responses or raw exceptions into the standardized 12 failure modes.
 */
export function classifyError(
  errorOrResponse: any,
  context?: {
    statusCode?: number;
    contentType?: string;
    rawBody?: string;
    endpoint?: string;
  }
): TaxonomyErrorDetail {
  const status = context?.statusCode || errorOrResponse?.status || errorOrResponse?.httpStatus;
  const contentType = (context?.contentType || errorOrResponse?.contentType || '').toLowerCase();
  const rawBody = (context?.rawBody || (typeof errorOrResponse === 'string' ? errorOrResponse : '')).trim();

  // 1. HTTP 429 / Rate Limit / Temporary IP Soft-Ban
  if (status === 429 || rawBody.includes('Too Many Requests') || rawBody.includes('Rate limit exceeded')) {
    const retryAfter = errorOrResponse?.retry_after_seconds || 60;
    return {
      code: ErrorCode.RATE_LIMITED_429,
      httpStatus: 429,
      userTitle: 'Rate Limit & Temporary IP Soft-Ban',
      userMessage: `Provider rate limit exceeded (HTTP 429). Exponential backoff activated (${retryAfter}s cooldown). Polling suppressed to avoid permanent IP block.`,
      technicalDetails: `Server returned 429. Retry-After header or payload specifies ${retryAfter} seconds cooldown.`,
      isRetryable: true,
      retryStrategy: 'EXPONENTIAL_BACKOFF',
      backoffSeconds: retryAfter,
      providerRemediation: 'Pause all playlist synchronization calls. Wait for backoff countdown before requesting again.',
    };
  }

  // 2. HTML interstitial / Cloudflare / ISP security challenge
  if (
    (contentType.includes('text/html') && (context?.endpoint?.includes('player_api') || context?.endpoint?.includes('.m3u8') || context?.endpoint?.includes('.ts'))) ||
    rawBody.includes('<!DOCTYPE html') ||
    rawBody.includes('Cloudflare') ||
    rawBody.includes('Attention Required!') ||
    rawBody.includes('DDoS protection')
  ) {
    return {
      code: ErrorCode.HTML_INTERSTITIAL_ERROR,
      httpStatus: status || 200,
      userTitle: 'ISP or Cloudflare Security Interstitial',
      userMessage: 'Streaming server returned an HTML security challenge instead of video/JSON data. The provider is behind Cloudflare or ISP blocking.',
      technicalDetails: `Expected application/json or video stream, but received text/html (Length: ${rawBody.length} chars).`,
      isRetryable: false,
      retryStrategy: 'MANUAL_INTERVENTION',
      providerRemediation: 'Check if provider requires a dedicated User-Agent header, VPN bypass, or if the server domain is blocked by your ISP.',
    };
  }

  // 3. Truncated vs Malformed JSON
  if (errorOrResponse instanceof SyntaxError || errorOrResponse?.name === 'SyntaxError' || rawBody.startsWith('{') || rawBody.startsWith('[')) {
    // Determine if it's truncated (e.g. abrupt EOF) vs truly malformed
    const isTruncated =
      (rawBody.startsWith('{') && !rawBody.endsWith('}')) ||
      (rawBody.startsWith('[') && !rawBody.endsWith(']')) ||
      errorOrResponse?.message?.includes('Unexpected end of JSON input') ||
      errorOrResponse?.message?.includes('JSON.parse: unexpected end of data');

    if (isTruncated) {
      return {
        code: ErrorCode.TRUNCATED_PARTIAL_JSON,
        userTitle: 'Connection Dropped Mid-Transfer (Truncated JSON)',
        userMessage: 'The provider connection dropped prematurely before the catalog finished downloading. Automatic single retry scheduled.',
        technicalDetails: `Incomplete JSON buffer received. Missing closing brackets. Buffer length: ${rawBody.length} bytes.`,
        isRetryable: true,
        retryStrategy: 'IMMEDIATE',
        providerRemediation: 'Retry request with a clean socket connection; if persistent, verify packet drop rate on provider route.',
      };
    } else {
      return {
        code: ErrorCode.MALFORMED_JSON,
        userTitle: 'Corrupt Response Data (Malformed JSON)',
        userMessage: 'The provider server returned an invalid JSON syntax structure that cannot be decoded.',
        technicalDetails: `Syntax error during JSON parsing: ${errorOrResponse?.message || 'Invalid token sequence'}.`,
        isRetryable: false,
        retryStrategy: 'NO_RETRY',
        providerRemediation: 'Contact provider support. The server-side script is outputting invalid characters into the response stream.',
      };
    }
  }

  // 4. Invalid Content-Type on video streams
  if (status === 200 && contentType && !contentType.includes('mpegurl') && !contentType.includes('mp2t') && !contentType.includes('octet-stream') && !contentType.includes('video') && !contentType.includes('application/json')) {
    return {
      code: ErrorCode.INVALID_CONTENT_TYPE,
      httpStatus: 200,
      userTitle: 'Invalid Stream MIME Type',
      userMessage: `Server returned HTTP 200 OK but with unexpected Content-Type '${contentType}' instead of a playable video stream.`,
      technicalDetails: `MIME type mismatch: Expected video/mp2t, application/vnd.apple.mpegurl, but received ${contentType}.`,
      isRetryable: true,
      retryStrategy: 'IMMEDIATE',
      providerRemediation: 'Switch stream container format (try .ts fallback instead of .m3u8).',
    };
  }

  // 5. Auth failures & Non-Active status checks
  if (errorOrResponse?.user_info || errorOrResponse?.auth !== undefined) {
    const userInfo = errorOrResponse.user_info || errorOrResponse;

    // Bad Credentials (auth === 0 with no status or invalid login)
    if (userInfo.auth === 0 && (!userInfo.status || userInfo.status === 'Invalid')) {
      return {
        code: ErrorCode.AUTH_BAD_CREDENTIALS,
        httpStatus: status || 200,
        userTitle: 'Authentication Failed',
        userMessage: 'Invalid username or password. The provider panel rejected the credentials.',
        technicalDetails: 'Response returned auth: 0 without active subscription.',
        isRetryable: false,
        retryStrategy: 'MANUAL_INTERVENTION',
        providerRemediation: 'Double check your username, password, and provider server URL.',
      };
    }

    // Status: Expired
    if (userInfo.status === 'Expired') {
      const expDate = userInfo.exp_date ? new Date(parseInt(userInfo.exp_date, 10) * 1000).toLocaleDateString() : 'Unknown';
      return {
        code: ErrorCode.AUTH_NON_ACTIVE_EXPIRED,
        httpStatus: status || 200,
        userTitle: 'Subscription Expired',
        userMessage: `Your IPTV subscription expired on ${expDate}. Playback is locked until renewed.`,
        technicalDetails: `Auth succeeded (auth: 1) but account status is literally 'Expired'. Exp timestamp: ${userInfo.exp_date}.`,
        isRetryable: false,
        retryStrategy: 'MANUAL_INTERVENTION',
        providerRemediation: 'Renew your subscription with your reseller or provider.',
      };
    }

    // Status: Banned
    if (userInfo.status === 'Banned') {
      return {
        code: ErrorCode.AUTH_NON_ACTIVE_BANNED,
        httpStatus: status || 200,
        userTitle: 'Account Banned',
        userMessage: 'Your account has been banned by the provider (often triggered by simultaneous connection breaches or TOS violations).',
        technicalDetails: 'Account status is literally "Banned". Server refused all stream generation.',
        isRetryable: false,
        retryStrategy: 'MANUAL_INTERVENTION',
        providerRemediation: 'Contact provider support to inquire about the account lock reason.',
      };
    }

    // Status: Disabled
    if (userInfo.status === 'Disabled') {
      return {
        code: ErrorCode.AUTH_NON_ACTIVE_DISABLED,
        httpStatus: status || 200,
        userTitle: 'Account Disabled',
        userMessage: 'Your account has been administratively disabled by the provider reseller.',
        technicalDetails: 'Account status is literally "Disabled".',
        isRetryable: false,
        retryStrategy: 'MANUAL_INTERVENTION',
        providerRemediation: 'Contact your reseller to un-pause or enable your line.',
      };
    }

    // Connection limit exceeded
    const activeCons = parseInt(userInfo.active_cons || '0', 10);
    const maxCons = parseInt(userInfo.max_connections || '1', 10);
    if (activeCons >= maxCons && maxCons > 0) {
      return {
        code: ErrorCode.CONNECTION_LIMIT_EXCEEDED,
        httpStatus: status || 200,
        userTitle: 'Connection Limit Reached',
        userMessage: `All available stream connections are in use (${activeCons}/${maxCons} active). Prevented opening new stream to avoid provider lock-out.`,
        technicalDetails: `Server reports active_cons (${activeCons}) >= max_connections (${maxCons}). Strict limit: 1.`,
        isRetryable: true,
        retryStrategy: 'EXPONENTIAL_BACKOFF',
        backoffSeconds: 15,
        providerRemediation: 'Ensure all other devices (smart TVs, phone apps) are stopped before playing.',
      };
    }
  }

  // 6. Network Timeout
  if (
    errorOrResponse?.name === 'AbortError' ||
    errorOrResponse?.code === 'ETIMEDOUT' ||
    errorOrResponse?.code === 'ECONNABORTED' ||
    errorOrResponse?.message?.includes('timed out') ||
    errorOrResponse?.message?.includes('timeout')
  ) {
    return {
      code: ErrorCode.NETWORK_TIMEOUT,
      userTitle: 'Network Request Timed Out',
      userMessage: 'The connection to the streaming server timed out. The server may be offline or unreachable.',
      technicalDetails: `Network timeout: ${errorOrResponse?.message || 'Socket timeout limit exceeded'}.`,
      isRetryable: true,
      retryStrategy: 'EXPONENTIAL_BACKOFF',
      backoffSeconds: 5,
      providerRemediation: 'Check your internet connection and verify if the server host/port is up.',
    };
  }

  // Default fallback
  return {
    code: ErrorCode.UNKNOWN_ERROR,
    httpStatus: status,
    userTitle: 'Unspecified Provider Error',
    userMessage: errorOrResponse?.message || 'An unexpected error occurred while communicating with the IPTV provider.',
    technicalDetails: String(errorOrResponse?.stack || errorOrResponse),
    isRetryable: false,
    retryStrategy: 'NO_RETRY',
    providerRemediation: 'Inspect diagnostic logs for complete payload traces.',
  };
}

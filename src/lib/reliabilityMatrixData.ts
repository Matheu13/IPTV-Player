/**
 * Phase 47: Reliability Matrix Data Model & Aggregator
 *
 * Tracks test vector executions, attempts, successes, failures, and success rates.
 * Clearly distinguishes Passed, Partial, Failed, Not Tested, and Insufficient Data states.
 */

export type ReliabilityVectorStatus = 'PASSED' | 'PARTIAL' | 'FAILED' | 'NOT_TESTED' | 'INSUFFICIENT_DATA';

export interface ReliabilityMatrixItem {
  id: string;
  name: string;
  category: string;
  description: string;
  attempts: number;
  successes: number;
  failures: number;
  successRate: number | null; // null if attempts === 0
  status: ReliabilityVectorStatus;
  lastTestedAt: number | null; // Monotonic or timestamp
  verificationDetails: string;
  testPayload?: {
    protocol?: string;
    simulatedError?: string;
    expectedBehavior?: string;
    observedBehavior?: string;
  };
}

export class ReliabilityMatrixData {
  public static getDefaultMatrix(): ReliabilityMatrixItem[] {
    return [
      {
        id: 'vec_conn_teardown',
        name: 'Connection Teardown',
        category: 'Lifecycle Protection',
        description: 'Verifies explicit media resource release, player instance destruction, and 0 ghost audio on stream close.',
        attempts: 0,
        successes: 0,
        failures: 0,
        successRate: null,
        status: 'NOT_TESTED',
        lastTestedAt: null,
        verificationDetails: 'Requires asynchronous confirmation of abort, element src unload, and decoder detach.',
        testPayload: {
          protocol: 'HLS / MPEG-TS',
          expectedBehavior: 'Player instance destroyed, 0 active connections remaining.',
        },
      },
      {
        id: 'vec_rapid_switching',
        name: 'Rapid Channel Switching',
        category: 'Burst Concurrency',
        description: 'Validates atomic channel switching sequence (A -> B -> C -> D -> E -> F -> G) without overlap or connection leaks.',
        attempts: 0,
        successes: 0,
        failures: 0,
        successRate: null,
        status: 'NOT_TESTED',
        lastTestedAt: null,
        verificationDetails: 'Tests burst channel transitions under 500ms intervals with guaranteed teardown pre-flight check.',
        testPayload: {
          protocol: 'HLS / TS / MP4',
          expectedBehavior: 'Zero concurrent provider connections; previous stream torn down prior to next init.',
        },
      },
      {
        id: 'vec_timeout_recovery',
        name: 'Timeout Recovery',
        category: 'Network Resilience',
        description: 'Tests player response to manifest/chunk loading timeouts with a single 800ms backoff retry.',
        attempts: 0,
        successes: 0,
        failures: 0,
        successRate: null,
        status: 'NOT_TESTED',
        lastTestedAt: null,
        verificationDetails: 'Enforces manifestLoadingTimeOut (6-8s) followed by exactly 1 retry before failing cleanly.',
        testPayload: {
          simulatedError: 'ETIMEDOUT: Connection hung waiting for master playlist chunk.',
          expectedBehavior: 'Single retry attempt, then graceful failure UI (no indefinite freeze).',
        },
      },
      {
        id: 'vec_http404_recovery',
        name: 'HTTP 404 / 503 Recovery',
        category: 'HTTP Fault Handling',
        description: 'Simulates dead provider endpoints and server errors; asserts retry-once discipline and actionable error output.',
        attempts: 0,
        successes: 0,
        failures: 0,
        successRate: null,
        status: 'NOT_TESTED',
        lastTestedAt: null,
        verificationDetails: 'Tests 404 Not Found & 503 Service Unavailable responses with immediate single-retry boundary.',
        testPayload: {
          simulatedError: 'HTTP 404 Not Found: Stream segment expired or channel removed.',
          expectedBehavior: 'Surfaces "Playback failed after 1 retry: HTTP 404 Not Found" to the UI.',
        },
      },
      {
        id: 'vec_malformed_manifest',
        name: 'Malformed Manifest',
        category: 'Parser Robustness',
        description: 'Tests player reaction to corrupted M3U8 playlists (missing EXT-X-TARGETDURATION, invalid tags, truncations).',
        attempts: 0,
        successes: 0,
        failures: 0,
        successRate: null,
        status: 'NOT_TESTED',
        lastTestedAt: null,
        verificationDetails: 'Asserts decoder parser fault isolation prevents unhandled exceptions or memory corruption.',
        testPayload: {
          simulatedError: 'MANIFEST_PARSING_ERROR: Corrupted #EXTINF tags.',
          expectedBehavior: 'Parser catches syntax fault, rejects stream, and logs descriptive diagnostic.',
        },
      },
      {
        id: 'vec_network_interruption',
        name: 'Network Interruption',
        category: 'Connection Loss',
        description: 'Simulates socket drop / offline state mid-playback; tests buffer underrun detection and recovery attempt.',
        attempts: 0,
        successes: 0,
        failures: 0,
        successRate: null,
        status: 'NOT_TESTED',
        lastTestedAt: null,
        verificationDetails: 'Tests offline event firing, retry-once attempt, and fallback UI presentation.',
        testPayload: {
          simulatedError: 'ERR_NETWORK_CHANGED / Offline connection loss.',
          expectedBehavior: 'Detects socket disconnect within 1.5s, retries once, displays network connection error.',
        },
      },
    ];
  }

  /**
   * Aggregates execution results and updates the vector item status deterministically.
   */
  public static recordVectorResult(
    item: ReliabilityMatrixItem,
    isSuccess: boolean,
    details?: string,
    observedBehavior?: string
  ): ReliabilityMatrixItem {
    const attempts = item.attempts + 1;
    const successes = item.successes + (isSuccess ? 1 : 0);
    const failures = item.failures + (isSuccess ? 0 : 1);
    const successRate = parseFloat(((successes / attempts) * 100).toFixed(1));

    let status: ReliabilityVectorStatus = 'PASSED';
    if (successes === 0) {
      status = 'FAILED';
    } else if (failures > 0) {
      status = 'PARTIAL';
    }

    return {
      ...item,
      attempts,
      successes,
      failures,
      successRate,
      status,
      lastTestedAt: Date.now(),
      verificationDetails: details || item.verificationDetails,
      testPayload: item.testPayload
        ? {
            ...item.testPayload,
            observedBehavior: observedBehavior || item.testPayload.observedBehavior,
          }
        : undefined,
    };
  }
}

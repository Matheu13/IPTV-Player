export interface SniffResult {
  detectedType: 'MPEG-TS' | 'HLS' | 'HTML-INTERSTITIAL' | 'UNKNOWN';
  confidence: number;
  syncByteCount: number;
  firstSyncOffset: number;
  isMpegTs188: boolean;
  isHls: boolean;
  isHtml: boolean;
  rawHeaderHex: string;
  rawHeaderText: string;
  demuxerNotes: string;
}

export interface StreamProbeResult {
  format: string;
  url: string;
  headStatus: number | string;
  headContentType: string | null;
  headRedirects: string[];
  headMethodUsed: 'HEAD' | 'GET_RANGE_FALLBACK';
  getRangeStatus: number | string;
  getContentType: string | null;
  bytesReceived: number;
  sniffResult: SniffResult;
  latencyMs: number;
  usableForPlayback: boolean;
}

export interface Milestone0DiagnosticReport {
  timestamp: string;
  targetServer: string;
  credentialRedacted: {
    username: string;
    password: string;
  };
  auth: {
    success: boolean;
    httpStatus: number;
    data: {
      status: string;
      exp_date: string | null;
      exp_date_human: string | null;
      max_connections: string | number;
      active_cons: string | number;
      allowed_output_formats: string[];
      server_info?: any;
      raw_redacted?: any;
    } | null;
    error?: string;
  };
  categories: {
    count: number;
    isEmpty: boolean;
    bouquetAnomalyDetected: boolean;
    sample: any[];
    raw_redacted: any;
  };
  streams: {
    count: number;
    firstThree: any[];
    raw_redacted: any;
  };
  streamProbes: StreamProbeResult[];
  overallAssessment: {
    streamType: 'HLS' | 'RAW_MPEG_TS' | 'MIXED' | 'UNUSABLE';
    preferredFormat: string;
    fallbackFormat: string | null;
    demuxerConfiguration: string;
    providerAnomalies: string[];
  };
}

export interface DiagnosticLogEntry {
  timestamp: string;
  component: string;
  errorClass: string | null;
  httpStatus: number | string;
  redactedUrl: string;
  durationMs: number;
  message: string;
}

export * from './lib/models';


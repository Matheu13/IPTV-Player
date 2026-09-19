# TARGET ARCHITECTURE SPECIFICATION

**Document Version:** 1.0.0  
**Status:** DRAFT — Awaiting Phase 1 Formal Gate Approval  
**Architecture Theme:** Single Authoritative State Machine, Layered Adapters, Strict SSRF Defense, and Clear Boundary Isolation.

---

## 1. END-TO-END SYSTEM ARCHITECTURE

The target architecture enforces a strict unidirectional data and control flow, eliminating competing playback controllers and isolating the consumer application from developer lab utilities.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PRESENTATION LAYER                                     │
│                                                                                        │
│   ┌────────────────────────────────────────┐   ┌───────────────────────────────────┐   │
│   │    Consumer Application Shell          │   │    Developer Diagnostics Lab      │   │
│   │    (Cinematic 10-Foot & Desktop UI)    │   │    (Quarantined Under /dev/lab)   │   │
│   │  - NavigationRail  - LiveTVScreen      │   │  - SourceTriageReport             │   │
│   │  - VideoPlayerShell - QuickZapOverlay  │   │  - DataLayerExplorer              │   │
│   │  - EpgGridScreen   - SettingsScreen    │   │  - Milestone Test Suites          │   │
│   └───────────────────┬────────────────────┘   └─────────────────┬─────────────────┘   │
└───────────────────────┼──────────────────────────────────────────┼─────────────────────┘
                        │ Normalized Remote & Mouse Events         │ Diagnostic Commands
                        ▼                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION CONTROLLER LAYER                              │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                       Authoritative PlaybackController                         │   │
│   │  - Session Generation & Cancellation Management (UUID v4 + monotonic sequence) │   │
│   │  - Authoritative Finite State Machine (FSM)                                    │   │
│   │  - Semantic Failover Orchestrator (Same-Channel Alternatives Only)             │   │
│   │  - Telemetry Normalizer & Provenance Tagging (LIVE / VERIFIED / UNKNOWN)       │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
└───────────────────────────────────────────┼────────────────────────────────────────────┘
                                            │ Lifecycle Commands (load, attach, play, destroy)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PLAYBACK ADAPTER LAYER                                    │
│                                                                                        │
│       ┌───────────────────────────┬───────────────────────────┬────────────────┐       │
│       │    BrowserHlsAdapter      │   BrowserMpegTsAdapter    │ NativeHtml5    │       │
│       │    (Hls.js Engine)        │   (mpegts.js Engine)      │ Adapter        │       │
│       └─────────────┬─────────────┴─────────────┬─────────────┴────────┬───────┘       │
└─────────────────────┼───────────────────────────┼──────────────────────┼───────────────┘
                      │ Render Surfaces & Events  │                      │
                      ▼                           ▼                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              RENDERER & HARDWARE LAYER                                 │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │             HTMLVideoElement (Canvas / WebGL / MediaSource Pipeline)           │   │
│   │             Spatial Focus Engine (Normalized D-Pad / Remote Navigation)        │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                            ▲
                                            │ Filtered Media Stream Packets
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               BACKEND SERVICE LAYER (Express)                          │
│                                                                                        │
│   ┌───────────────────────┬───────────────────────┬────────────────────────────────┐   │
│   │   Stream Proxy Router │   Ingestion Service   │   EPG & Catalog Service        │   │
│   │   - Strict SSRF Guard │   - Chunked M3U Parser│   - XMLTV Stream Parser        │   │
│   │   - Redirect Checker  │   - Xtream API Client │   - SQLite WAL Cache & Fuzzy   │   │
│   │   - Header Sanitizer  │   - Source Triage     │   - Now/Next Schedule Index    │   │
│   └───────────┬───────────┴───────────┬───────────┴────────────────┬───────────────┘   │
└───────────────┼───────────────────────┼────────────────────────────┼───────────────────┘
                ▼                       ▼                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               PERSISTENCE & SECURITY LAYER                             │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │   SQLite Database (WAL Mode: data/iptv_player.db)                              │   │
│   │   - iptv_sources (encrypted tokens)   - iptv_channels (composite unique keys)  │   │
│   │   - iptv_categories                   - epg_programs (timestamp indexed)       │   │
│   │   - iptv_triage_quarantine            - playback_history & favorites           │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. AUTHORITATIVE PLAYBACK FINITE STATE MACHINE (FSM)

The playback engine transitions deterministically across the following explicit states. Every state transition MUST have an identifiable originating cause.

```text
                                  ┌──────────────┐
                                  │     IDLE     │
                                  └──────┬───────┘
                                         │ Channel Selected / load(channel, source)
                                         ▼
                                  ┌──────────────┐
                                  │  REQUESTED   │
                                  └──────┬───────┘
                                         │ Resolving Endpoint & Validating URL
                                         ▼
                                  ┌──────────────┐
                                  │  RESOLVING   │
                                  └──────┬───────┘
                                         │ Adapter Instantiated & Media Element Assigned
                                         ▼
                                  ┌──────────────┐
                                  │  CONNECTING  │
                                  └──────┬───────┘
                                         │ Manifest Fetch Initiated
                                         ▼
                             ┌───────────────────────┐
                             │   MANIFEST_LOADING    │
                             └───────────┬───────────┘
                                         │ Manifest Parsed (Levels / Tracks Discovered)
                                         ▼
                             ┌───────────────────────┐
                             │    MANIFEST_READY     │
                             └───────────┬───────────┘
                                         │ Initial Audio/Video Segments Buffered
                                         ▼
                             ┌───────────────────────┐
                             │    MEDIA_ATTACHED     │
                             └───────────┬───────────┘
                                         │ First Decoded Frame Rendered (currentTime > 0)
                                         ▼
                             ┌───────────────────────┐
                     ┌──────>│      FIRST_FRAME      ├───────┐
                     │       └───────────┬───────────┘       │
                     │                   │ video.onplaying   │
                     │                   ▼                   │
                     │       ┌───────────────────────┐       │
                     │       │        PLAYING        │       │
                     │       └─────┬───────────▲─────┘       │
                     │ Buffer Empty│           │ Buffer Full │
                     │ or Underflow│           │ (buffered   │
                     │             ▼           │  >= 1.5s)   │
                     │       ┌─────────────────┴─────┐       │
                     │       │       BUFFERING       │       │
                     │       └─────┬─────────────────┘       │
                     │             │ Buffer Stall Timeout    │
                     │             ▼                         │
                     │       ┌───────────────────────┐       │
                     │       │      RECOVERING       │       │
                     │       │(hls.recoverMediaError)│       │
                     │       └─────┬───────────▲─────┘       │
                     │             │           │ Recovery    │
                     │             │ Recovery  │ Succeeded   │
                     │             │ Failed    └─────────────┘
                     │             ▼
                     │       ┌───────────────────────┐
                     │       │     FAILING_OVER      │
                     │       │ (Search Same Channel) │
                     │       └─────┬───────────▲─────┘
                     │             │ Alternative Alternative
                     │             │ Found     │ Failed
                     └─────────────┘           ▼
                                     ┌───────────────────┐
                                     │    UNAVAILABLE    │
                                     │ (Card / OSD Error)│
                                     └───────────────────┘
```

### State Definitions & Trigger Criteria

| State | Entry Trigger | Telemetry Emitted | Permitted Exit States |
| :--- | :--- | :--- | :--- |
| **IDLE** | Engine initialized or stream explicitly stopped by user. | `session: null`, `state: 'IDLE'` | `REQUESTED` |
| **REQUESTED** | User tunes channel. Generates new UUID v4 `sessionId`. | `channelId`, `timestamp`, `generation` | `RESOLVING`, `IDLE` (cancelled) |
| **RESOLVING** | Querying SQLite for stream variants and security checks. | `sourceType`, `streamProtocol` | `CONNECTING`, `UNAVAILABLE` |
| **CONNECTING** | Playback adapter initialized; binding to `<video>`. | `adapterType: 'HLS'\|'MPEGTS'` | `MANIFEST_LOADING`, `FAILED` |
| **MANIFEST_LOADING** | HTTP request dispatched for master manifest or probe. | `requestUrl`, `requestTimestamp` | `MANIFEST_READY`, `RECOVERING` |
| **MANIFEST_READY** | Manifest parsed; levels, audio, and subs discovered. | `availableLevels[]`, `audioTracks[]` | `MEDIA_ATTACHED`, `FAILED` |
| **MEDIA_ATTACHED** | Segments parsed and pushed into MediaSource buffers. | `bufferStartSec`, `bufferEndSec` | `FIRST_FRAME`, `BUFFERING` |
| **FIRST_FRAME** | Hardware/software video renderer paints first frame. | `firstFrameLatencyMs`, `dimensions` | `PLAYING`, `BUFFERING` |
| **PLAYING** | `<video>` is actively rendering (`playing` event fired). | Real `bitrate`, `fps`, `droppedFrames` | `BUFFERING`, `RECOVERING`, `STOPPED` |
| **BUFFERING** | Media buffer runs below 0.3s playback threshold. | `bufferDepletionTimestamp`, `stallCount`| `PLAYING`, `RECOVERING` |
| **RECOVERING** | Executing tiered internal adapter recovery. | `recoveryStep`, `attemptCount` | `PLAYING`, `FAILING_OVER` |
| **FAILING_OVER** | Primary endpoint failed; switching to alternate source. | `failedSourceId`, `nextSourceId` | `CONNECTING`, `UNAVAILABLE` |
| **UNAVAILABLE** | All valid channel sources exhausted; user notified. | `errorCode`, `forensicLogSummary` | `REQUESTED` (user re-tune) |

---

## 3. PLAYBACK ADAPTER SPECIFICATION

All playback engines must implement the unified `IPlaybackAdapter` contract:

```typescript
export interface IPlaybackAdapter {
  readonly adapterType: 'HLS' | 'MPEGTS' | 'HTML5';
  readonly isAttached: boolean;

  // Lifecycle
  load(sourceUrl: string, config?: PlaybackConfig): Promise<void>;
  attachMedia(element: HTMLVideoElement): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  stop(): Promise<void>;
  destroy(): Promise<void>;

  // Controls
  setVolume(volume: number): void;
  setLevel(levelIndex: number): void;
  setAudioTrack(trackIndex: number): void;
  setSubtitleTrack(trackIndex: number): void;

  // Observability
  getLevels(): PlaybackQualityLevel[];
  getAudioTracks(): PlaybackAudioTrack[];
  getSubtitleTracks(): PlaybackSubtitleTrack[];
  getTelemetry(): PlaybackTelemetry;

  // Event Subscription
  onStateChange(listener: (state: AuthoritativePlaybackState) => void): () => void;
  onError(listener: (error: ClassifiedPlaybackError) => void): () => void;
}
```

---

## 4. SECURITY BOUNDARY & SSRF ARCHITECTURE

The stream proxy and remote playlist ingestion endpoints enforce defense-in-depth network isolation:

```text
Incoming Request (/api/stream/proxy?url=...)
   │
   ▼
[ URL Syntax & Protocol Check ] ── Fail ──> HTTP 400 Bad Request
   │ (Must be http:// or https://)
   ▼
[ Hostname & IP Sanitizer ]
   │ - Detect Decimal/Hex IPs (e.g. 0x7f000001, 2130706433)
   │ - Strip Authentication Credentials
   ▼
[ DNS Resolution (lookup A/AAAA) ] ── Fail ──> HTTP 502 DNS Failure
   │
   ▼
[ Strict IP CIDR Filter ] ── Match ──> HTTP 403 Forbidden (SSRF Blocked)
   │ Checks Resolved IP against:
   │  * 0.0.0.0/8
   │  * 127.0.0.0/8 (Loopback)
   │  * 10.0.0.0/8 (Private Class A)
   │  * 172.16.0.0/12 (Private Class B)
   │  * 192.168.0.0/16 (Private Class C)
   │  * 169.254.0.0/16 (Link-Local / AWS / GCP Metadata)
   │  * ::1/128, fe80::/10, fc00::/7 (IPv6 Loopback / Private)
   ▼
[ Upstream Fetch with Pinning ]
   │
   ▼
[ HTTP 3xx Redirect Interceptor ] ── Redirect Received?
   │                                           │ YES
   │                                           ▼
   │                              [ Loop back to Hostname & IP Sanitizer ]
   │                              (Re-validate every hop; max 3 hops)
   ▼ NO
[ Stream Content-Type Validation ]
   │ (Must match video/*, application/x-mpegurl, audio/*)
   ▼
Stream Piped to Client
```

---

## 5. TV INPUT ARCHITECTURE & NORMALIZATION

```text
  [ Android TV Remote ]       [ Fire TV Remote ]      [ Desktop Keyboard ]
           │                          │                         │
           ▼                          ▼                         ▼
   Raw Keycode / Event        Raw Keycode / Event       Standard DOM keydown
           │                          │                         │
           └──────────────────────────┼─────────────────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │      TvInputAdapter       │
                        │ (Maps platform keycodes to│
                        │   normalized actions)     │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │    Normalized Actions     │
                        │ - UP / DOWN / LEFT / RIGHT│
                        │ - SELECT / BACK           │
                        │ - CHANNEL_UP / CH_DOWN    │
                        │ - PLAY_PAUSE / MENU       │
                        └─────────────┬─────────────┘
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │      TvFocusEngine        │
                        │ (Maintains active focus,  │
                        │  zone traps, 2D geometry) │
                        └─────────────┬─────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
┌──────────────────────────┐                        ┌──────────────────────────┐
│ Focused Component Visual │                        │ Global Player Action     │
│ (Highlight / Ring / Scal)│                        │ (Zap Next / Toggle Play) │
└──────────────────────────┘                        └──────────────────────────┘
```

# REMEDIATION PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Document Version:** 1.0.0  
**Status:** DRAFT — Awaiting Phase 1 Formal Gate Approval  
**Author:** Principal Software Architect & Core Engineering Team  
**Scope:** IPTV Player Forensic Remediation, State Machine Unification, Security Hardening, and Production Standardization.

---

## 1. PRODUCT OVERVIEW & VISION

The IPTV Player is an enterprise-grade, high-performance streaming application designed to deliver live television, EPG (Electronic Program Guide), VOD (Video on Demand), and catch-up services across web browsers, desktop environments, and 10-foot TV interfaces (Android TV / Fire TV).

The platform's core differentiator is **uncompromising technical integrity**:
* No optimistic states or fabricated telemetry.
* Real-time telemetry provenance with verifiable hardware/stream metrics.
* Robust security architecture resistant to SSRF, credential leakage, and unauthorized operational access.
* Deterministic playback lifecycle managed by a single authoritative state machine.
* Clear architectural boundary separating the consumer product from developer lab, diagnostic benches, and simulated test fixtures.

---

## 2. PRODUCT GOALS

1. **Deterministic Playback Lifecycle**: Deliver a single authoritative playback state machine where state transitions (`IDLE`, `CONNECTING`, `MANIFEST_PARSED`, `FIRST_FRAME`, `PLAYING`, `BUFFERING`, `RECOVERING`, `FAILING_OVER`, `FAILED`, `UNAVAILABLE`) are strictly triggered by verified renderer and network events.
2. **Zero Fabricated Telemetry**: Guarantee that every displayed metric (resolution, framerate, bitrate, active codec, hardware acceleration status, audio tracks, subtitle tracks) is extracted from live player telemetry (`hls.js`, `mpegts.js`, HTMLVideoElement) with documented provenance (`LIVE`, `VERIFIED`, `UNKNOWN`).
3. **Semantic Failover**: Ensure stream failover preserves channel identity (e.g. tuning to BBC One only fails over to alternative verified endpoints of BBC One; public demo streams such as Akamai or Tears of Steel are strictly prohibited in production failover).
4. **End-to-End Security Hardening**: Eliminate all hardcoded provider credentials, remediate proxy and playlist SSRF vulnerabilities with strict CIDR blocking and redirect re-validation, encrypt credentials at rest, and authenticate/lock down operational server endpoints.
5. **Separation of Product and Diagnostics**: Partition the user-facing cinematic 10-foot and desktop interface (`src/ui/`) away from experimental milestone suites and diagnostic workbenches (`src/components/Milestone*.tsx`).
6. **Robust Spatial & Remote TV Navigation**: Deliver a normalized TV input system supporting directional D-pad, Back, Select, and functional channel zapping (`CHANNEL_UP`, `CHANNEL_DOWN`, `PLAY_PAUSE`, `MENU`) without competing global event listeners.
7. **Production Data Reliability**: Maintain a resilient local database layer (SQLite WAL) capable of handling real-world 10,000+ channel playlists and XMLTV EPG data without silent constraint failures or batch rollbacks.

---

## 3. NON-GOALS (EXPLICIT OUT-OF-SCOPE BOUNDARIES)

To maintain focused execution and avoid scope creep, the following capabilities are explicitly **NOT** being implemented during this remediation:
* **Native C/C++ MPV Binary Bundling**: We will NOT compile or bundle a native C MPV binary or libmpv shared library in this web/Node.js container. All simulated MPV bridges claiming native IPC will be explicitly isolated to test fixtures or marked `SIMULATED` / `NOT IMPLEMENTED ON CURRENT PLATFORM`.
* **DRM License Server Implementation**: Widevine, FairPlay, or PlayReady key server infrastructures are not implemented. Supported streams are standard clear HLS, MPEG-TS, and HTTP live streams.
* **Proprietary P2P Mesh Network Protocol**: Peer-to-peer WebRTC mesh streaming will not be deployed into production runtime; existing simulated P2P modules will be quarantined to lab diagnostics.
* **Cloud Transcoding & Packaging Service**: The application acts as a client player and lightweight edge proxy; it will not transcode HEVC/AV1 streams to H.264 on the server.
* **Hardware-Specific Android TV APK Compilation**: While Android TV key codes and 10-foot leanback navigation are fully supported via standard browser/WebView event adapters, native Java/Kotlin Android build toolchains (`gradle`, Android SDK) are not part of this container runtime.

---

## 4. FUNCTIONAL REQUIREMENTS

### 4.1 Provider Management & Ingestion
* **FR-PROV-01 (M3U & M3U8 Parsing)**: The system shall parse standard Extended M3U playlists, extracting `tvg-id`, `tvg-name`, `tvg-logo`, `group-title`, `catchup`, `catchup-days`, and stream URIs using robust regex tokenizers tolerant of unescaped quotes and non-standard line breaks.
* **FR-PROV-02 (Xtream Codes API Ingestion)**: The system shall authenticate against Xtream Codes-compatible APIs (`get_live_categories`, `get_live_streams`, `get_vod_categories`, `get_vod_streams`, `get_series`), storing provider metadata securely.
* **FR-PROV-03 (High-Capacity Playlist Ingestion)**: The ingestion pipeline shall process playlists exceeding 10,000 channels using chunked batch insertions (500 channels/batch) inside SQLite transactions, avoiding transaction timeouts and UI freezes.
* **FR-PROV-04 (Source Triage & Quarantine)**: Channels failing schema validation, missing URLs, or encountering duplicate ID collisions shall be segmented into a quarantine triage table with explicit `Reason Codes` (`MISSING_STREAM_URL`, `SCHEMA_MISMATCH`, `DUPLICATE_ID`, `SILENT_CONSTRAINT_VIOLATION`, `UNSUPPORTED_PROTOCOL`).

### 4.2 Playback Engine & State Machine
* **FR-PLAY-01 (Authoritative State Machine)**: All playback operations shall be governed by a single `PlaybackController`. No UI component or secondary context shall independently assert `PLAYING` or `BUFFERING`.
* **FR-PLAY-02 (Verification of First Frame)**: State `PLAYING` shall ONLY be emitted when the playback adapter detects verifiable rendering of media (e.g. `HTMLVideoElement.currentTime > 0` with a valid frame decoded, or `Hls.Events.FRAG_BUFFERED` followed by video `playing` event).
* **FR-PLAY-03 (Cancellation & Session Generation)**: Every playback initiation shall generate a unique `sessionId` (UUID v4) and increment an atomic generation counter. All asynchronous callbacks (manifest download, segment parsing, adapter events) from prior sessions must be discarded immediately upon session cancellation.
* **FR-PLAY-04 (Adaptive Bitrate & Quality Control)**: For HLS streams, the player shall discover actual available levels from the master manifest, surface them to the UI, and allow user selection (`AUTO` or specific height/bitrate).
* **FR-PLAY-05 (Audio & Subtitle Track Selection)**: The player shall extract real audio tracks (`hls.audioTracks`) and subtitle tracks (`hls.subtitleTracks`) from the media pipeline. Selecting a track must execute `hls.audioTrack = index` or enable the corresponding `VTTCue` / WebVTT track on the video element.

### 4.3 Error Handling & Failover
* **FR-FAIL-01 (Error Classification)**: All playback errors shall be categorized into a normalized taxonomy (`NETWORK_TIMEOUT`, `MANIFEST_404`, `MANIFEST_403`, `SEGMENT_CORRUPT`, `MEDIA_DECODE_ERROR`, `CORS_REJECTED`, `UNSUPPORTED_CONTAINER`).
* **FR-FAIL-02 (Deterministic Recovery)**: Recoverable HLS errors (network stall, buffer append stall) shall trigger tiered internal recovery (`hls.recoverMediaError()` -> `hls.swapAudioCodec()` -> reload manifest) before escalating to stream failover.
* **FR-FAIL-03 (Semantic Failover Only)**: If primary stream fails recovery, failover must search for alternative stream URLs associated with the exact same channel record in the database. If no valid mirror exists, the player shall transition to `UNAVAILABLE` and display an informative error card.

### 4.4 TV / Leanback & Input Architecture
* **FR-TV-01 (Spatial Focus Engine)**: The application shall preserve and enhance the 2D spatial focus engine (`tvFocusEngine.ts`), providing deterministic visual focus states across navigation rails, channel grids, EPG timelines, and player control overlays.
* **FR-TV-02 (Normalized TV Input Pipeline)**: Raw platform input events (Keyboard, Gamepad, Android TV Remote) shall be translated through a dedicated `InputAdapter` into normalized actions (`UP`, `DOWN`, `LEFT`, `RIGHT`, `SELECT`, `BACK`, `PLAY_PAUSE`, `CHANNEL_UP`, `CHANNEL_DOWN`, `MENU`).
* **FR-TV-03 (Functional Remote Key Handlers)**: The system shall implement functional behaviors for previously empty remote stubs:
  * `CHANNEL_UP` / `CHANNEL_DOWN`: Switches to the adjacent channel in the active bouquet while maintaining focus and full playback lifecycle teardown.
  * `PLAY_PAUSE`: Toggles active stream playback without desynchronizing adapter state.
  * `MENU`: Opens the channel quick-zap or stream diagnostics drawer.
* **FR-TV-04 (Focus Traps & Modal Isolation)**: Modals, settings drawers, and player overlays shall trap spatial focus while open, restoring focus to the origin element upon dismissal.

### 4.5 Security & Backend Protection
* **FR-SEC-01 (Strict SSRF Defense)**: The proxy server (`/api/stream/proxy`, `/api/m3u/fetch-remote`) shall validate all requested URLs against:
  * Loopback addresses (`127.0.0.0/8`, `localhost`, `::1`).
  * Private IPv4 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
  * Link-local and cloud metadata addresses (`169.254.0.0/16`, `fe80::/10`, `metadata.google.internal`).
  * Multicast and reserved ranges (`224.0.0.0/4`, `240.0.0.0/4`).
  * Non-standard decimal, octal, or hex IP encodings.
* **FR-SEC-02 (Redirect Re-Validation)**: All HTTP 301/302/307/308 redirect targets encountered during stream proxying or playlist fetching must be independently re-validated against the SSRF filter before following.
* **FR-SEC-03 (Zero Plaintext Secrets)**: Provider passwords, tokens, and stream URLs containing embedded credentials shall be stripped or hashed before persistence in SQLite and scrubbed from client-facing diagnostic logs.
* **FR-SEC-04 (Endpoint Authorization)**: Administrative and operational backend endpoints (`/api/m4/epg/clear`, `/api/m1/sqlite/clear-errors`, etc.) shall require session authorization or be restricted strictly to local developer diagnostics mode.

---

## 5. NON-FUNCTIONAL REQUIREMENTS (NFR)

* **NFR-01 (Reliability & Uptime)**: Playback session switching must execute 100 consecutive rapid channel changes without unhandled exceptions, memory leaks, or orphaned audio contexts.
* **NFR-02 (Performance)**: Channel tune time (user select to first frame displayed) must achieve < 1,500ms on high-speed connections for valid HLS endpoints.
* **NFR-03 (Observability)**: Every playback session must emit a structured forensic timeline containing timestamped state transitions, network latencies, dropped frames, and adapter event logs.
* **NFR-04 (Maintainability)**: Modular file structure where no single file exceeds 800 lines of code; backend Express server must be factored into discrete service, route, and middleware modules.
* **NFR-05 (Cross-Platform Compatibility)**: Functional compatibility across modern evergreen browsers (Chrome, Edge, Firefox, Safari desktop/mobile) and TV WebViews (Chromium on Android TV 9+, Silk on Fire OS 7+).

---

## 6. USER PERSONAS & KEY WORKFLOWS

1. **Leanback TV Viewer (Living Room)**: Uses an infrared or Bluetooth remote control (D-pad, Back, Select, Ch+/Ch-). Expects rapid channel zapping, unobtrusive OSD (On-Screen Display), real-time EPG now/next data, and no frozen interfaces.
2. **Desktop Power User**: Navigates via mouse, keyboard shortcuts, or multi-view matrices. Wants deep stream diagnostics, manual audio/subtitle selection, and source management.
3. **Field Operations / QA Engineer**: Audits provider lineup health, analyzes failed streams in the Source Triage report, and monitors SQLite ingestion diagnostics.

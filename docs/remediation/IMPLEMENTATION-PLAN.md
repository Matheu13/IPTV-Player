# REMEDIATION IMPLEMENTATION PLAN

**Document Version:** 1.0.0  
**Status:** DRAFT — Awaiting Phase 1 Formal Gate Approval  
**Operating Directive:** Strict phase sequencing. No phase skipping. Explicit approval required at each gate.

---

## 1. PHASE DEPENDENCY GRAPH

```text
Phase 0: Forensic Baseline (COMPLETED)
   │
   ▼
Phase 1: PRD + Target Architecture + Implementation Plan (CURRENT)
   │
   ▼
Phase 2: Security Containment
   │ - Credential purging & SSRF hardening (Blocking prerequisite for all streaming)
   ▼
Phase 3: Domain Model & Source of Truth
   │ - Canonical interfaces & types (Prerequisite for state machine & adapters)
   ▼
Phase 4: Playback State Machine
   │ - Authoritative FSM with generation cancellation
   ▼
Phase 5: Browser Playback Adapters
   │ - BrowserHlsAdapter, BrowserMpegTsAdapter, NativeHtml5Adapter
   ▼
Phase 6: Elimination of Fabricated Playback Data
   │ - Provenance tagging (LIVE, VERIFIED, UNKNOWN)
   ▼
Phase 7: Real Quality / Audio / Subtitle Control
   │ - Master playlist level discovery & WebVTT track activation
   ▼
Phase 8: Failover & Recovery
   │ - Semantic same-channel failover (Zero public demo fallback)
   ▼
Phase 9: Connection Management
   │ - Atomic teardown, concurrency guard, rapid switching protection
   ▼
Phase 10: Data Ingestion & Validation
   │ - High-capacity SQLite chunking & layered reachability checks
   ▼
Phase 11: Server Architecture Modularization
   │ - Decomposition of 2,670-line server.ts into clean controllers/services
   ▼
Phase 12: Separation of Product from Lab/Diagnostics
   │ - Consumer shell isolation; developer milestone harness quarantine
   ▼
Phase 13: TV / Leanback Input Architecture
   │ - Functional Channel Up/Down, Play/Pause, normalized input adapters
   ▼
Phase 14: UI Reconnection
   │ - Consumer UI connected to authoritative state machine
   ▼
Phase 15: Diagnostics Rebuild
   │ - Forensic session timeline & real-time telemetry dashboard
   ▼
Phase 16: Comprehensive Testing Matrix
   │ - Unit, integration, security, TV spatial, and regression suites
   ▼
Phase 17: Build, Deployment & Cross-Platform Verification
   │ - Multi-environment build pipeline & package sanity
   ▼
Phase 18: Performance & Reliability Benchmarking
   │ - First-frame latency, memory profiling, rapid zapping stress tests
   ▼
Phase 19: Final Forensic Audit
   │ - Differential audit against Phase 0 baseline
   ▼
Phase 20: Production Readiness Review
   │ - Formal sign-off and production release certification
```

---

## 2. PHASE-BY-PHASE EXECUTION DETAILS

### Phase 2: Security Containment
* **Objectives**: Eliminate exposed credentials in scripts/source; harden stream proxy and playlist fetchers against SSRF, loopback, private CIDR, metadata, and unvalidated redirects; protect operational backend endpoints.
* **Dependencies**: Phase 1 Approval.
* **Key Tasks**:
  1. Purge live provider credentials from `scripts/test_seg.ts`, `src/lib/streamProxy.ts`, and `src/lib/sourceMonitorEngine.ts`.
  2. Implement `src/lib/ssrfValidator.ts` providing strict IP/DNS resolution, CIDR range checks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`, IPv6 loopback/link-local/unique-local), and decimal/hex IP normalization.
  3. Update `streamProxy.ts` and `server.ts` to re-validate every HTTP 3xx redirect hop before issuing network requests.
  4. Implement endpoint authorization / dev-mode fencing for destructive operations (`/api/m4/epg/clear`, `/api/m1/sqlite/clear-errors`).
* **Deliverables**: Security Containment Report (`docs/remediation/PHASE-02-SECURITY-REPORT.md`), SSRF unit test suite.
* **Gate**: Formal User Approval required.

### Phase 3: Domain Model & Source of Truth
* **Objectives**: Create single authoritative domain models for `Provider`, `Channel`, `StreamSource`, `PlaybackSession`, `PlaybackState`, `AudioTrack`, `SubtitleTrack`, `QualityLevel`, and `ClassifiedError`.
* **Dependencies**: Phase 2 Approval.
* **Key Tasks**:
  1. Establish `src/domain/` directory.
  2. Define canonical interfaces for channels, composite primary keys (`sourceId:channelId`), stream sources, and session contexts.
  3. Deprecate divergent, overlapping type definitions across `types.ts`, `models.ts`, and `unifiedIptvEngine.ts`.
* **Deliverables**: `src/domain/index.ts`, `docs/remediation/PHASE-03-DOMAIN-MODEL.md`.
* **Gate**: Formal User Approval required.

### Phase 4: Playback State Machine
* **Objectives**: Implement a single authoritative finite state machine (`PlaybackController.ts`) with strict state transitions, generation tracking, and asynchronous cancellation.
* **Dependencies**: Phase 3 Approval.
* **Key Tasks**:
  1. Build `PlaybackController` with states: `IDLE`, `REQUESTED`, `RESOLVING`, `CONNECTING`, `MANIFEST_LOADING`, `MANIFEST_READY`, `MEDIA_ATTACHED`, `FIRST_FRAME`, `PLAYING`, `BUFFERING`, `RECOVERING`, `FAILING_OVER`, `UNAVAILABLE`.
  2. Implement atomic session generation counter; invalidate stale callbacks.
  3. Ensure `FIRST_FRAME` requires verifiable media rendering before transitioning to `PLAYING`.
* **Deliverables**: `src/lib/playback/PlaybackController.ts`, FSM unit tests.
* **Gate**: Formal User Approval required.

### Phase 5: Browser Playback Adapters
* **Objectives**: Implement standardized playback adapters for HLS (`hls.js`), MPEG-TS (`mpegts.js`), and Native HTML5 video.
* **Dependencies**: Phase 4 Approval.
* **Key Tasks**:
  1. Build `BrowserHlsAdapter` with genuine error handling (`MEDIA_ERROR`, `NETWORK_ERROR`), buffer stall detection, and codec recovery.
  2. Build `BrowserMpegTsAdapter` with lifecycle management and demuxer error handlers.
  3. Build `NativeHtml5Adapter` for direct video container playback.
* **Deliverables**: `src/lib/playback/adapters/`, adapter test suites.
* **Gate**: Formal User Approval required.

### Phase 6: Elimination of Fabricated Playback Data
* **Objectives**: Strip all artificial timers, hardcoded telemetry (6.4 Mbps, 60 FPS, D3D11VA, 1920x1080), and fake metrics.
* **Dependencies**: Phase 5 Approval.
* **Key Tasks**:
  1. Replace optimistic buffering timers in `PlaybackContext.tsx` with true adapter buffer telemetry.
  2. Build `TelemetryCollector` extracting live metrics from `video.videoWidth`, `video.videoHeight`, `hls.stats`, and `video.webkitDroppedFrameCount` / MediaCapabilities.
  3. Tag all telemetry fields with provenance (`LIVE`, `VERIFIED`, `UNKNOWN`).
* **Deliverables**: `src/lib/playback/TelemetryCollector.ts`, telemetry provenance audit.
* **Gate**: Formal User Approval required.

### Phase 7: Real Quality / Audio / Subtitle Control
* **Objectives**: Wire real stream levels, audio tracks, and subtitle tracks to the UI.
* **Dependencies**: Phase 6 Approval.
* **Key Tasks**:
  1. Extract real HLS levels and expose `AUTO` and manual level selection.
  2. Discover live audio tracks from `hls.audioTracks`; execute actual track switching.
  3. Discover WebVTT / 608 / 708 subtitle tracks; toggle renderer text tracks.
  4. Display "No subtitles available" when streams omit subtitle tracks.
* **Deliverables**: Track control implementation, verification tests.
* **Gate**: Formal User Approval required.

### Phase 8: Failover & Recovery
* **Objectives**: Unify failover logic into a single deterministic engine preserving channel semantic identity; eradicate all public demo streams from production failover.
* **Dependencies**: Phase 7 Approval.
* **Key Tasks**:
  1. Remove Akamai, Tears of Steel, Oceans, and Mux fallbacks from production paths.
  2. Implement semantic failover querying alternative verified stream endpoints for the same channel.
  3. Transition to `UNAVAILABLE` when valid alternatives are exhausted.
* **Deliverables**: `src/lib/playback/FailoverOrchestrator.ts`, failover test suite.
* **Gate**: Formal User Approval required.

### Phase 9: Connection Management
* **Objectives**: Enforce robust connection lifecycle management preventing race conditions during rapid zapping.
* **Dependencies**: Phase 8 Approval.
* **Key Tasks**:
  1. Build atomic teardown routine ensuring old adapters, MediaSource buffers, and network listeners are completely destroyed before new connections attach.
  2. Implement rapid channel switching test (100 switches) validating zero memory leaks or orphaned audio.
* **Deliverables**: `src/lib/playback/ConnectionGuardian.ts`, stress test report.
* **Gate**: Formal User Approval required.

### Phase 10: Data Ingestion & Validation
* **Objectives**: Optimize M3U and Xtream ingestion for 10,000+ channel playlists; implement layered validation.
* **Dependencies**: Phase 9 Approval.
* **Key Tasks**:
  1. Implement chunked SQLite insertions (500 channels/transaction) preventing UI thread lock and transaction timeouts.
  2. Route malformed/missing-URL channels to Source Triage with explicit Reason Codes.
  3. Implement layered stream validation (Reachable -> Manifest Valid -> Media Accessible).
* **Deliverables**: Ingestion pipeline updates, Source Triage integration.
* **Gate**: Formal User Approval required.

### Phase 11: Server Architecture Modularization
* **Objectives**: Break monolithic 2,670-line `server.ts` into modular controllers, routes, and services.
* **Dependencies**: Phase 10 Approval.
* **Key Tasks**:
  1. Factor routes into `server/routes/` (`proxy.ts`, `epg.ts`, `sources.ts`, `diagnostics.ts`).
  2. Factor services into `server/services/` (`ssrfService.ts`, `sqliteService.ts`, `xtreamService.ts`).
  3. Establish structured error handling and security middleware.
* **Deliverables**: Modular `server/` directory, slim `server.ts`.
* **Gate**: Formal User Approval required.

### Phase 12: Separation of Product from Lab/Diagnostics
* **Objectives**: Separate the user-facing IPTV product from the 50+ developer milestone surfaces and synthetic fixtures.
* **Dependencies**: Phase 11 Approval.
* **Key Tasks**:
  1. Ensure root consumer UI loads `AppShell.tsx` (cinematic 10-foot/desktop player).
  2. Relocate milestone test suites and debug panels behind an explicit `/dev/lab` route or hidden developer drawer.
  3. Clearly label all synthetic fixtures as `TEST FIXTURE / SIMULATED`.
* **Deliverables**: Clean application routing, isolated developer workbench.
* **Gate**: Formal User Approval required.

### Phase 13: TV / Leanback Input Architecture
* **Objectives**: Unify TV remote handling and implement actual functional behaviors for remote keys.
* **Dependencies**: Phase 12 Approval.
* **Key Tasks**:
  1. Implement `CHANNEL_UP` and `CHANNEL_DOWN` zapping adjacent channels with full teardown.
  2. Implement `PLAY_PAUSE` toggle and `MENU` overlay triggers.
  3. Eliminate competing global `keydown` listeners across components.
  4. Label TV support honestly: `VERIFIED IN BROWSER ADAPTER / NOT VERIFIED ON PHYSICAL TV HARDWARE`.
* **Deliverables**: `src/lib/tv/`, TV navigation test suite.
* **Gate**: Formal User Approval required.

### Phases 14–20: UI Reconnection through Production Certification
* **Phase 14**: Reconnect UI to authoritative state machine and true telemetry.
* **Phase 15**: Rebuild forensic diagnostics with real session timelines.
* **Phase 16**: Full automated test execution (Unit, Integration, Security, E2E).
* **Phase 17**: Production build, package sanity, and cross-platform verification.
* **Phase 18**: Performance benchmarks (latency, memory, CPU).
* **Phase 19**: Differential forensic audit against Phase 0 baseline.
* **Phase 20**: Formal Production Readiness review and sign-off.

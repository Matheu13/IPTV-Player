# PHASE 0: FULL FORENSIC BASELINE AUDIT

**Date:** 2026-09-19  
**Audit Scope:** Repository Inventory, Architecture Map, Playback State Machine, Security & SSRF Analysis, Telemetry Provenance, TV Navigation, and Dependency Review.  
**Auditor:** Principal Software Architect & Forensic Remediation Team  
**Compliance Mandate:** Zero Hallucination, Zero Fabricated Success, Truthful State Machine, Absolute Separation of Lab/Simulation from Production.

---

## 1. EXECUTIVE SUMMARY & REPOSITORY INVENTORY

A forensic audit of the codebase was conducted across all files, configurations, scripts, and runtime modules. The repository represents an ambitious IPTV and media management application, but currently exhibits severe architectural fragmentation, competing sources of truth, simulated subsystems masquerading as production capabilities, critical security vulnerabilities, and hardcoded/optimistic telemetry.

### Repository Composition
* **Language & Framework:** TypeScript 5.8.2, React 19.0.1, Vite 6.2.3, Express 4.21.2, Tailwind CSS 4.1.14, Motion 12.23.24.
* **Streaming Libraries:** `hls.js` (1.7.1), `mpegts.js` (1.8.2).
* **Database & Persistence:** SQLite WAL database located at `data/iptv_player.db` via `sqliteEpgDb.ts` and `sqliteDbServer.ts`.
* **Codebase Volume:**
  * Backend: `server.ts` contains **2,670 lines** with over **75 distinct API routes** consolidating proxy, diagnostics, test suites, EPG ingestion, and database management.
  * Engine Layer (`src/lib/`): **66 files** containing core parsers, state models, platform bridges, and numerous simulated engines.
  * Component Layer (`src/components/`): **78 files**, heavily dominated by milestone testing surfaces (`MilestoneXTestSuite.tsx`, `Milestone1` through `Milestone42`).
  * UI Layer (`src/ui/`): **32 components and 10 screens** providing an alternative cinematic 10-foot television interface (`AppShell.tsx`, `LiveTVScreen.tsx`, `CinematicShell.tsx`).
  * Test & Validation Scripts (`scripts/`): **34 scripts** executing benchmark and milestone validations.
  * Test Fixtures (`tests/fixtures/`): **12 JSON/HTML mock files**.

---

## 2. SECURITY FINDINGS & VULNERABILITY AUDIT

### Finding SEC-01: Exposed Provider Credentials in Source Code
* **Status:** Critical Exposure
* **Rule 9 Secret Declaration:**
  * `SECRET DETECTED`:
    * File: `scripts/test_seg.ts` (Line 4)
    * Type: Live Provider Credential (URL embedding username and password)
    * Status: Exposed in source code
    * Action Required: Rotate/revoke external credentials immediately; remove from source in Phase 2.
  * `SECRET DETECTED`:
    * File: `src/lib/streamProxy.ts` (Lines 60, 70–71, 77–78)
    * Type: Hardcoded fallback provider credentials (username and password)
    * Status: Exposed in source code
    * Action Required: Remove hardcoded fallback credentials from source in Phase 2.
  * `SECRET DETECTED`:
    * File: `src/lib/sourceMonitorEngine.ts` (Lines 143, 250)
    * Type: Hardcoded external provider endpoint URLs
    * Status: Exposed in source code
    * Action Required: Move to secure environment/database configuration.

### Finding SEC-02: Severe SSRF (Server-Side Request Forgery) in Stream Proxy
* **Files:** `src/lib/streamProxy.ts` (Lines 36–50), `server.ts` (Lines 450–550, 1304–1350)
* **Vulnerability Analysis:**
  * Function `isAllowedProxyUrl()` only checks:
    ```typescript
    const blockedHosts = ['169.254.169.254', 'metadata.google.internal', 'metadata'];
    if (blockedHosts.includes(parsed.hostname.toLowerCase())) return false;
    ```
  * **Critical Gaps:**
    1. Does **not** block `localhost`, `127.0.0.1`, `127.0.0.0/8`, or `0.0.0.0`.
    2. Does **not** block private IPv4 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
    3. Does **not** block IPv6 loopback (`::1`), link-local (`fe80::/10`), or unique local (`fc00::/7`).
    4. Does **not** block decimal or hexadecimal IP encodings (e.g., `2130706433` for `127.0.0.1`).
    5. **Redirect SSRF:** `fetchManifestWithRedirects()` follows HTTP 301/302 redirects up to 3 hops without re-validating the redirect target against `isAllowedProxyUrl()`. A public URL can redirect the proxy into the internal network or cloud metadata.
    6. DNS Rebinding: Hostnames are validated as strings without pinning resolved DNS A/AAAA records.

### Finding SEC-03: Plaintext Credential Persistence
* **Files:** `src/lib/sqliteEpgDb.ts`, `src/lib/sqliteDbServer.ts`
* **Vulnerability Analysis:**
  * Provider accounts, passwords, and tokens in `iptv_sources` are stored in plaintext in the SQLite database and inside `metadata_json` strings without cryptographic hashing or encryption at rest.

### Finding SEC-04: Unauthenticated Operational & Diagnostic API Endpoints
* **Files:** `server.ts`
* **Vulnerability Analysis:**
  * All 75+ Express routes are completely unauthenticated.
  * Anyone who can reach port 3000 can invoke destructive and administrative endpoints including:
    * `POST /api/m4/epg/clear` (drops EPG tables)
    * `POST /api/m1/sqlite/clear-errors`
    * `POST /api/m1/connection/request` / `teardown`
    * `POST /api/sources/import-channel-catalog`
    * `GET /api/export-diagnostics`

---

## 3. ARCHITECTURAL MAP & COMPETING SOURCES OF TRUTH

The application currently has **no single authoritative state machine**. Instead, multiple independent components maintain disconnected, competing states.

```
                               CURRENT FRAGMENTED ARCHITECTURE
                               
   [ Consumer UI: AppShell.tsx ]                   [ Developer Lab: App.tsx ]
                │                                               │
        (usePlayback Hook)                              (50+ Milestone Tabs)
                │                                               │
     ┌──────────┴──────────┐                          ┌─────────┴─────────┐
     ▼                     ▼                          ▼                   ▼
PlaybackContext.tsx   VideoPlayerShell.tsx     PlayerEngine.ts    SimulatedMpvBridge.ts
 (Optimistic State)   (Direct new Hls())     (Singleton Engine)   (In-Memory Fake)
  - Fake 60 FPS        - Akamai Fallback      - Oceans AES        - D3D11VA
  - Fake 6.4 Mbps      - Tears of Steel       - Mux Test Stream   - Static Tracks
  - 280ms Buffering    - Custom Retry Loop    - Detached from UI  - Detached from HTML5
```

### Problem ARCH-01: Competing Playback Controllers
1. **Controller A (`src/ui/context/PlaybackContext.tsx`):**
   * Drives the consumer UI in `AppShell.tsx`.
   * Directly sets `isPlaying: true` and `isBuffering: true` on channel selection.
   * Clears buffering via an optimistic timer:
     ```typescript
     setTimeout(() => {
       setState((prev) => ({ ...prev, isBuffering: false }));
     }, 280);
     ```
   * Hardcodes initial video telemetry: `resolution: '1920x1080'`, `fps: 60`, `bitrateMbps: 6.4`, `activeDecoder: 'D3D11VA / GPU Zero-Copy'`.
   * Hardcodes fake audio tracks (Main Stereo, English Surround 5.1, Commentary) and subtitle tracks (English CC, Spanish) regardless of stream content.

2. **Controller B (`src/lib/playerEngine.ts`):**
   * Singleton `globalPlayerEngine` with its own `PlayerEngineState`.
   * Owns an `attachMediaElement()` handler and separate failover logic.
   * Completely ignored by `AppShell.tsx` and `PlaybackContext.tsx`.

3. **Controller C (`src/ui/components/VideoPlayerShell.tsx`):**
   * Renders the `<video>` element.
   * Directly instantiates `new Hls()` inside `useEffect`.
   * Implements its own retry counter, error recovery, and alternative stream failover.
   * Does **not** push actual playback metrics (bitrate, real resolution, active audio/sub tracks) back into `PlaybackContext`.

### Problem ARCH-02: Public Demo Streams Used as Production Failover
* **Files:** `src/ui/components/VideoPlayerShell.tsx` (Lines 193–209), `src/lib/playerEngine.ts` (Lines 93–97)
* **Finding:** When a user's selected channel fails, the failover logic switches playback to unrelated public test streams:
  * `https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8`
  * `https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8`
  * `https://playertest.longtailvideo.com/adaptive/oceans/oceans.m3u8`
  * `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`
* **Impact:** Direct violation of Rule 2 and Rule 8. If the user tunes to "BBC One" and it fails, the application plays "Tears of Steel" or an Akamai test clip while displaying the channel badge for BBC One.

### Problem ARCH-03: Simulated MPV Bridge Presented as Native IPC
* **File:** `src/lib/mpvBridge.ts`
* **Finding:**
  * Defined as `export class SimulatedMpvBridge`.
  * Generates fake JSON-RPC logs, hardcoded audio/sub tracks, and synthetic stats (`hwdec: 'd3d11va'`, `codec: 'h264 (High) / avc1'`, `fps: 59.94`).
  * There is **no native MPV binary, no IPC UNIX socket, and no named pipe** connected in the Node.js container or browser.
  * In `App.tsx` and `MpvBridgeInspector.tsx`, this is presented to users as "MPV Native IPC Bridge: Native MPV player integration and IPC socket."

### Problem ARCH-04: Synthetic 14,917 Channel Catalog
* **Files:** `src/lib/channelGenerator.ts`, `src/lib/unifiedIptvEngine.ts`
* **Finding:**
  * `channelGenerator.ts` generates 14,917 synthetic channels with fake category ratios, channel names ("Sky Sports 1", "HBO East HD"), and dummy stream links.
  * The application previously loaded this synthetic catalog and reported it as an ingested live provider.

### Problem ARCH-05: Monolithic Express Server
* **File:** `server.ts` (2,670 lines)
* **Finding:**
  * Combines stream proxying, segment rewriting, EPG parsing, XMLTV file ingestion, Stalker portal auth, diagnostic runners, test suites, SQLite table diagnostics, and Vite development middleware into a single file with no separation of concerns.

---

## 4. TV & REMOTE CONTROL SUBSYSTEM AUDIT

* **Files:** `src/lib/tvFocusEngine.ts`, `src/lib/tvRemoteInput.ts`, `src/lib/leanbackSpatialEngine.ts`
* **Spatial Focus Engine:**
  * `TvFocusEngine` implements a well-structured 2D grid/node registry (`UP`, `DOWN`, `LEFT`, `RIGHT`, focus history, zone traps). This foundation is sound and should be preserved.
* **Remote Input Deficiencies:**
  1. `TvRemoteInputBridge` attaches directly to the browser `window.addEventListener('keydown')`. Browser keyboard events are useful for testing, but must not be claimed as native Android TV or Fire TV hardware verification.
  2. Critical remote actions are **empty no-op stubs**:
     ```typescript
     // src/lib/tvRemoteInput.ts: Lines 99-104
     case 'CHANNEL_UP':
     case 'CHANNEL_DOWN':
     case 'PLAY_PAUSE':
     case 'MENU':
       break; // Literal no-op!
     ```
  3. Key listeners compete: `AppShell.tsx`, `VideoPlayerShell.tsx`, `TvRemoteInput.ts`, and `playerEngine.ts` each register independent global `keydown` listeners with differing key mappings.

---

## 5. REPOSITORY SEARCH AUDIT FINDINGS

As required by Phase 0, a forensic scan was performed across all source files for forbidden patterns and anti-patterns:

| Search Pattern | Occurrences | Primary Locations | Forensic Assessment |
| :--- | :---: | :--- | :--- |
| `setTimeout` | 117 in 65 files | `PlaybackContext.tsx`, `SettingsScreen.tsx`, `ChannelManagementZapper.tsx`, `VideoPlayerShell.tsx` | Used for artificial buffering states (280ms), mock latency delays, and digit buffers. |
| `setInterval` | 27 in 26 files | `LivePlayerSurface.tsx`, `channelHealthWatchdogEngine.ts`, `p2pCdnMeshEngine.ts` | Used for simulated metric oscillation (random bitrate and packet drift). |
| `Math.random` | 77 in 29 files | `ultraLowLatencyEngine.ts`, `hybridRfTunerEngine.ts`, `forensicWatermarkEngine.ts`, `p2pCdnMeshEngine.ts` | Fabricated telemetry (fake SNR, fake peer counts, fake dropped frames). |
| `mock/fake/simulated` | 58 in 42 files | `mpvBridge.ts`, `androidMobilePlatform.ts`, `server.ts`, `EpgStreamSurface.tsx` | Simulated platform bridges and fake provider data. |
| `hardcoded_telemetry` | 70 in 26 files | `PlaybackContext.tsx`, `windowsPlatform.ts`, `milestone_34_tests.ts` | Static strings (`1920x1080`, `6.4 Mbps`, `d3d11va`, `7680x4320`). |
| `failover` | 86 in 18 files | `VideoPlayerShell.tsx`, `playerEngine.ts`, `UnifiedPlaybackScreen.tsx` | Competing failover pipelines and demo stream fallbacks. |
| `credentials` | 273 in 54 files | `redact.ts`, `server.ts`, `streamProxy.ts`, `test_seg.ts`, `stalkerClient.ts` | Sensitive parameters and exposed test credentials. |

---

## 6. DEAD & UNUSED CODE CANDIDATES

1. `src/components/categoryNormalizer.ts`: Exact duplicate of `src/lib/categoryNormalizer.ts`.
2. `server.js` (root build output if present): Superseded by `dist/server.cjs`.
3. Experimental milestone test panels (`MilestoneXTestSuite.tsx`) mounted inside the consumer UI path: Should be isolated into an explicit developer diagnostics harness.
4. Simulated native engines (`src/lib/hybridRfTunerEngine.ts`, `src/lib/p2pCdnMeshEngine.ts`, `src/lib/scte35DaiEngine.ts`): Not backed by real hardware or backend services; currently simulate metrics via `Math.random()`.

---

## 7. RISK REGISTER

| Risk ID | Severity | Description | Remediation Phase |
| :--- | :---: | :--- | :---: |
| **RISK-SEC-01** | CRITICAL | Plaintext credentials exposed in test scripts and source files | Phase 2 |
| **RISK-SEC-02** | CRITICAL | SSRF vulnerability allowing arbitrary internal network and cloud metadata access via stream proxy and remote playlist fetch | Phase 2 |
| **RISK-PLAY-01** | CRITICAL | Multiple competing playback state machines producing desynchronized, misleading UI states | Phase 4 & 5 |
| **RISK-PLAY-02** | HIGH | Public demo videos (Akamai/Mux/Tears of Steel) used as channel failover | Phase 8 |
| **RISK-TEL-01** | HIGH | Fabricated playback metrics (bitrate, resolution, audio/sub tracks, decoder) presented as real | Phase 6 & 7 |
| **RISK-ARCH-01**| MEDIUM | 2,670-line monolithic Express server with no module boundaries | Phase 11 |
| **RISK-UI-01**  | MEDIUM | Consumer IPTV product mixed with 50+ milestone test tabs | Phase 12 |
| **RISK-TV-01**  | MEDIUM | Empty no-op stubs for channel up/down and play/pause remote commands | Phase 13 |

---

## 8. PROPOSED REMEDIATION ROADMAP

Following the non-negotiable operating rules, the remediation will proceed strictly through the approved phases:

* **Phase 1:** PRD, Target Architecture Specification, Implementation Plan, and Acceptance Criteria.
* **Phase 2:** Security Containment (Revoke/remove exposed credentials, harden SSRF with strict CIDR/private IP validation and redirect re-checks, authenticate/protect server APIs).
* **Phase 3:** Authoritative Domain Models & Canonical Types (`Provider`, `Channel`, `StreamSource`, `PlaybackSession`).
* **Phase 4:** Authoritative Playback State Machine (Single source of truth with generation/session cancellation).
* **Phase 5:** Unified Browser Playback Adapters (`BrowserHlsAdapter`, `BrowserMpegTsAdapter`, `NativeHtml5Adapter`).
* **Phase 6:** Elimination of Fabricated Telemetry (Real telemetry provenance: `LIVE`, `VERIFIED`, `UNKNOWN`).
* **Phase 7:** Real Stream Track & Level Controls (Actual HLS level discovery, real audio/subtitle selection).
* **Phase 8:** Semantic Failover & Recovery (Failover to valid alternative streams of the same channel; zero demo video fallbacks).
* **Phase 9:** Real Connection Lifecycle Management.
* **Phase 10:** Ingestion & Layered Stream Validation.
* **Phase 11:** Modular Server Architecture Refactoring.
* **Phase 12:** Strict Product UI vs. Developer Lab/Diagnostics Separation.
* **Phase 13:** TV & Leanback Input Architecture (Implementation of actual channel up/down, play/pause, normalized input).
* **Phases 14–20:** UI Reconnection, Rebuilt Diagnostics, Exhaustive Verification, Performance Benchmarks, and Final Audit.

---

## 9. PHASE 0 CONCLUSION & GATE

Phase 0 forensic audit is complete. **No production code has been modified during this phase.**
All findings, security risks, competing state authorities, and simulation inventories are fully documented.

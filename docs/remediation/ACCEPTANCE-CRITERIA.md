# REMEDIATION OBJECTIVE ACCEPTANCE CRITERIA

**Document Version:** 1.0.0  
**Status:** DRAFT — Awaiting Phase 1 Formal Gate Approval  
**Testing Rule:** A feature is accepted ONLY when validated end-to-end with concrete evidence. No subjective scoring.

---

## 1. SECURITY & SSRF ACCEPTANCE CRITERIA

| ID | Feature / Requirement | Objective Acceptance Criteria | Verification Method |
| :--- | :--- | :--- | :--- |
| **AC-SEC-01** | Zero Plaintext Credentials in Source | No plaintext passwords, tokens, or credential-embedded URLs exist in any source or script file (excluding explicit `.env.example` templates). | Automated regex grep across all files; must return 0 matches. |
| **AC-SEC-02** | Loopback & Localhost SSRF Rejection | Stream proxy and remote fetchers reject `http://localhost:*`, `http://127.0.0.1:*`, `http://0.0.0.0:*`, `http://[::1]:*`, and decimal/hex representations (e.g. `http://2130706433/`) with HTTP 403. | Automated security test sending requests with loopback payloads. |
| **AC-SEC-03** | Private Network CIDR Rejection | Proxy rejects requests resolving to `10.0.0.0/8`, `172.16.0.0/12`, and `192.168.0.0/16` with HTTP 403 before any TCP handshake is initiated. | Mock DNS resolver returning private IP ranges; verify proxy aborts. |
| **AC-SEC-04** | Cloud Metadata SSRF Defense | Proxy rejects requests to `169.254.169.254`, `metadata.google.internal`, and AWS/GCP metadata endpoints with HTTP 403. | Security test attempting to proxy cloud metadata paths. |
| **AC-SEC-05** | Redirect SSRF Re-Validation | If an allowed public URL redirects (HTTP 301/302/307/308) to a loopback, private IP, or metadata endpoint, the proxy intercepts the redirect and returns HTTP 403. | Mock server issuing redirect to `http://127.0.0.1:3000/internal`; verify blocked. |
| **AC-SEC-06** | Operational Endpoint Fencing | Destructive endpoints (`/api/m4/epg/clear`, `/api/m1/sqlite/clear-errors`) cannot be invoked anonymously in production mode; require admin authorization. | Curl request without auth token returns HTTP 401/403. |

---

## 2. PLAYBACK STATE MACHINE ACCEPTANCE CRITERIA

| ID | Feature / Requirement | Objective Acceptance Criteria | Verification Method |
| :--- | :--- | :--- | :--- |
| **AC-PLAY-01** | Single Authoritative State Machine | The entire UI hierarchy derives playback state exclusively from `PlaybackController`. No competing contexts maintain independent `isPlaying` or `isBuffering` flags. | Component AST scan verifying 100% of player components consume `PlaybackController`. |
| **AC-PLAY-02** | No Optimistic Buffering Timers | State `BUFFERING` is cleared ONLY when `video.buffered` contains sufficient playback margin (>= 1.0s) and `video.currentTime` advances. No `setTimeout` clears buffering. | Source inspection + automated test observing buffering during network throttling. |
| **AC-PLAY-03** | Truthful `PLAYING` State | State transitions to `PLAYING` ONLY after `video.currentTime > 0` is observed and at least one video frame has rendered. | Event log audit during stream startup verifying `FIRST_FRAME` precedes `PLAYING`. |
| **AC-PLAY-04** | Session Cancellation & Stale Callback Immunity | In a rapid channel switch (A -> B within 100ms), no async event, segment buffer, or error from channel A modifies the player state or video element after channel B is requested. | Rapid switching test verifying session generation sequence and zero bleed-through. |
| **AC-PLAY-05** | Native Teardown on Stop | Calling `stop()` destroys the active `Hls` / `mpegts` instance, cancels pending network requests, pauses video, and removes all event listeners. | Memory heap comparison and active network listener count before and after stop. |

---

## 3. TELEMETRY & MEDIA CONTROLS ACCEPTANCE CRITERIA

| ID | Feature / Requirement | Objective Acceptance Criteria | Verification Method |
| :--- | :--- | :--- | :--- |
| **AC-TEL-01** | Telemetry Provenance Tagging | Every displayed metric (resolution, fps, bitrate, audio track) exposes its provenance: `LIVE`, `VERIFIED`, or `UNKNOWN`. | UI inspection and telemetry object validation. |
| **AC-TEL-02** | Real HLS Quality Level Discovery | Player UI displays the exact level ladder present in the stream's master playlist. Selecting a level sets `hls.currentLevel = index`. | Testing against multi-bitrate HLS fixture with 3 discrete levels. |
| **AC-TEL-03** | Real Audio Track Switching | Player extracts `hls.audioTracks`. Selecting an audio track sets `hls.audioTrack = index` and triggers audio track change event on media pipeline. | Test against multi-audio stream fixture (ENG/SPA); verify audio track switch. |
| **AC-TEL-04** | Truthful Subtitle Handling | If a stream has no subtitle tracks, UI displays "No subtitles available". If subtitles exist, selecting a track enables the corresponding `track.mode = 'showing'`. | Test against streams with and without WebVTT subtitle tracks. |

---

## 4. FAILOVER & RECOVERY ACCEPTANCE CRITERIA

| ID | Feature / Requirement | Objective Acceptance Criteria | Verification Method |
| :--- | :--- | :--- | :--- |
| **AC-FAIL-01** | Semantic Channel Preservation | If Channel "BBC One" fails on Source 1, failover searches ONLY for alternative streams belonging to "BBC One". Under NO circumstances are Akamai, Tears of Steel, or Mux demo streams loaded as failover. | Induce network failure on live channel; inspect failover target URL and channel ID. |
| **AC-FAIL-02** | Deterministic Error Classification | Network timeouts, HTTP 403, HTTP 404, corrupt segments, and decode errors are categorized accurately in telemetry logs. | Mock network errors across each HTTP status code and inspect emitted error object. |
| **AC-FAIL-03** | Transition to `UNAVAILABLE` | When all valid sources for a channel are exhausted, player transitions cleanly to `UNAVAILABLE` and displays an informative error card without infinite reload loops. | Disconnect all network sources for a channel; verify clean transition to `UNAVAILABLE`. |

---

## 5. TV / LEANBACK & NAVIGATION ACCEPTANCE CRITERIA

| ID | Feature / Requirement | Objective Acceptance Criteria | Verification Method |
| :--- | :--- | :--- | :--- |
| **AC-TV-01** | Single Global Keydown Pipeline | All platform input events are routed through a single `TvInputAdapter`. No competing `window.addEventListener('keydown')` handlers exist in leaf components. | Source audit verifying keydown listener registration occurs only in the root TV adapter. |
| **AC-TV-02** | Functional Channel Up / Down | Pressing `CHANNEL_UP` or `CHANNEL_DOWN` remote buttons zaps to the next or previous channel in the current category with full teardown and startup of the new stream. | Dispatching `KeyboardEvent` with `PageUp` / `PageDown` / TV keycodes and verifying channel tune. |
| **AC-TV-03** | Functional Play / Pause Remote Key | Pressing `PLAY_PAUSE` remote key toggles stream playback/pause without desynchronizing state machine. | Dispatching media play/pause key event and verifying video state. |
| **AC-TV-04** | Spatial Focus Trapping in Modals | When a settings modal or OSD drawer opens, D-pad navigation is strictly constrained within the modal until closed via `BACK` key. | D-pad traversal test verifying focus cannot escape open modal. |

---

## 6. DATA LAYER & HIGH-CAPACITY INGESTION ACCEPTANCE CRITERIA

| ID | Feature / Requirement | Objective Acceptance Criteria | Verification Method |
| :--- | :--- | :--- | :--- |
| **AC-DATA-01** | 10,000+ Channel Ingestion Stability | Ingestion of a 10,000+ channel M3U playlist completes without browser tab crash, memory exhaustion, or SQLite lock timeout. | Ingest 14,000+ test catalog into SQLite in chunked transactions; verify table row count. |
| **AC-DATA-02** | Source Triage Segmentation | Malformed channels (missing stream URLs, corrupt attribute tags, duplicate IDs) are automatically isolated in `iptv_triage_quarantine` with accurate Reason Codes. | Ingest playlist with 50 deliberate defects; verify exactly 50 records in triage table. |
| **AC-DATA-03** | Resilient XMLTV EPG Parsing | XMLTV parser handles large EPG files (50MB+) using streaming SAX or chunked regex parsing without exceeding Node/Vite heap limits. | Ingest 7-day multi-channel XMLTV feed; verify EPG schedule records in database. |

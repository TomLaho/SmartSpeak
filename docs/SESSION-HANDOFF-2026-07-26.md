# Session handoff — SmartSpeak Play launch, 26/07/2026

Paste this at the start of the new conversation, or just say: *"Read docs/SESSION-HANDOFF-2026-07-26.md and docs/PLAY-LAUNCH-PLAYBOOK.md."*

## What the app is

SmartSpeak — speech-training PWA (Next.js, static export) deployed to Netlify at `https://smartspeak-app.netlify.app`. Being shipped to Google Play as a **TWA** (Trusted Web Activity — an Android wrapper around the live website). Package: `app.smartspeak.twa`.

## What was fixed this session

1. **Diagnosed gotcha #1 — microphone dead in the Android build.** The original PWABuilder-generated `.aab` was missing `RECORD_AUDIO` from its manifest (confirmed with a UTF-16-aware binary check: `INTERNET` present, `RECORD_AUDIO` absent). Not fixable by config — required a rebuild.
2. **Merged the overnight improvement branch into `main` and deployed to production.** Build + lint clean, transcription intact (only unused threaded-wasm assets removed).
3. **Rebuilt the TWA with Bubblewrap** (delegated to a Sonnet agent, then independently verified against the actual `.aab` base manifest, not the agent's self-report):
   - `RECORD_AUDIO` ✅ · `INTERNET` ✅ · package `app.smartspeak.twa` ✅ · `BILLING` ✅ · `PAY` ✅
   - Intentional deviations, reviewed and correct: notifications enabled (Play Billing requires it), `minSdk 21`, modern-AGP manifest cleanups.
4. **Created a fresh upload keystore** and independently verified its SHA-256 matches the bundle.
5. **Updated `public/.well-known/assetlinks.json`** to the new upload-key fingerprint and pushed to `main` (commit `117202a`). Live and verified.

## Current artefacts

| Item | Value |
|---|---|
| Good `.aab` | `C:\Users\lahog\ClaudeCode\smartspeak-twa\app\build\outputs\bundle\release\app-release.aab` (3.3 MB) |
| **Stale/broken `.aab` — never upload** | `C:\Users\lahog\ClaudeCode\SmartSpeak\Google Play package\SmartSpeak.aab` |
| Keystore | `C:\Users\lahog\ClaudeCode\smartspeak-twa\smartspeak-upload.keystore` |
| Alias / password | `smartspeak` / `SmartSpeak2024!` (store + key) |
| Upload key SHA-256 | `58:5F:7C:A8:ED:AC:8F:36:C4:C0:1E:BF:58:1F:32:2F:73:25:8A:20:CF:50:D5:B6:58:ED:23:CD:15:2B:56:98` |
| Store assets | `SmartSpeak\store-assets\` (feature graphic + 4 screenshots) |

## The one open technical task

**Add Google's App-signing SHA-256 as a *second* fingerprint in `assetlinks.json`.** Play re-signs the delivered app with Google's own key, so the upload-key fingerprint alone is not enough — testers installing from Play will see the URL bar until this is added. Tom gets that fingerprint from Play Console → Test and release → Setup → App integrity → App signing → *App signing key certificate* → SHA-256, and hands it over. Append it to the existing `sha256_cert_fingerprints` array (keep the upload key entry — sideloaded builds need it), commit, push; Netlify redeploys. Tom must then uninstall + reinstall to clear the cached verification.

## Everything else is Tom's manual Play Console work

Fully sequenced in `docs/PLAY-LAUNCH-PLAYBOOK.md` — written for zero Play Console experience, one action per step. He has ADHD; keep instructions literal (exact sidebar path, exact button label, explicit "done when" check) and never bundle three actions into one sentence.

## Critical path

Closed testing: **12 testers opted in for 14 continuous days** before production is allowed (personal developer accounts only — organisation accounts are exempt; account type is unverified as of this handoff). Nothing shortens this. Starting it today is the single highest-value action; everything else can run in parallel during the 14 days.

## Not yet verified

- Whether the mic prompt + transcription actually work on the installed Android build (needs a real device test — playbook Step 6).
- Play developer account type (personal vs organisation) — determines whether production today is even possible.

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
| TWA wrapper project | `SmartSpeak\android\` — **moved** from `ClaudeCode\smartspeak-twa\` on 26/07; git-ignored wholesale via `/android/` in `.gitignore` |
| Good `.aab` | `SmartSpeak\android\app\build\outputs\bundle\release\app-release.aab` |
| Keystore | `SmartSpeak\android\smartspeak-upload.keystore` (also backed up to Tom's Google Drive) |
| Alias / password | `smartspeak` / `SmartSpeak2024!` (store + key) |
| Upload key SHA-256 | `58:5F:7C:A8:ED:AC:8F:36:C4:C0:1E:BF:58:1F:32:2F:73:25:8A:20:CF:50:D5:B6:58:ED:23:CD:15:2B:56:98` |
| Play App-signing SHA-256 | `A9:9C:E7:CF:51:D6:3E:82:D9:92:B8:A5:E7:30:DA:9E:D5:1D:53:B5:5B:76:39:9A:12:3B:2B:68:C7:16:3C:1E` |
| Store assets | `SmartSpeak\store-assets\` (feature graphic + 4 screenshots) |
| Defunct PWABuilder key | `ClaudeCode\SmartSpeak - Keystore\` — never used for any upload; superseded. Safe to archive or delete. |

> The old broken PWABuilder `.aab` (`SmartSpeak\Google Play package\`) has been deleted by Tom.

## Second round of fixes — same day, after device testing

Tom tested the installed build and reported 7 issues. All fixed, built, verified and pushed (commit `2407158` plus docs):

| # | Issue | Root cause | Fix |
|---|---|---|---|
| 1 | Onboarding sheet's CTA clipped off-screen | `app/train/layout.tsx` set `z-10` on the content wrapper, creating a stacking context that trapped the `z-50` modal *below* the `z-30` tab bar | Removed the `z-10`; also constrained the sheet to `max-h-[92dvh]` with scroll + safe-area padding |
| 2 | First tap dropped straight into an exercise | Onboarding CTA called `router.push` to the recommended rep | Button now only dismisses; copy points at the modules. Removed the now-orphaned `startFirstRep` + `useRouter` |
| 3 | "Try again" / "Re-score" invisible (dark-on-dark) | `variant="secondary"` carries `text-secondary-foreground` = `222.2 47.4% 11.2%` (near-black); the `className` override only replaced the background | Added explicit `text-white` + border. Same latent bug fixed in `profile/page.tsx` Cancel |
| 4 | Module stuck on "In progress"; "Next up" hidden behind "Keep going to reveal it" | `moduleProgress.pct` was mastery-only (bestScore ≥ 70), so a completed-but-low-scoring rep moved nothing | Split completion from mastery in `lib/selection.ts` (`completedCount`/`completedPct` + `moduleStatusLabel`); rewrote the module view as a Duolingo-style path showing **every** rep with done/mastered/current/upcoming/locked states and lit connectors |
| 5 | Overall score 46 while every visible metric was 80+ | `overallScore` averaged only the exercise's *focus* dimensions, which were the low ones | Straight unweighted average of all measured dimensions shown on screen |
| 6 | Google App-signing key not trusted | — | Added `A9:9C:E7:…:1E` as a second fingerprint in `assetlinks.json` (upload key retained for sideloading) |
| 7 | Splash was a hard-edged grey square on black | Bubblewrap generated `splash.png` by upscaling `icon-512.png`, whose dark-grey tile doesn't match the `#0C0B10` splash background | Generated new splash assets at all 5 densities: squircle-clipped mark on transparent + wordmark + tagline. Bundle also shrank 3.3 MB → 2.36 MB (old splash set was 2.03 MB of upscaled gradient; new is 578 KB) |

### New bundle — verified independently, not self-reported

`app-release.aab`, versionCode **3**, versionName **1.0.1**, also copied to `C:\Users\lahog\Desktop\smartspeak-v3-app-release.aab`.

Checked directly against the extracted `base/manifest/AndroidManifest.xml` and via `jarsigner`/`keytool`:
`RECORD_AUDIO` ✅ · `INTERNET` ✅ · `com.android.vending.BILLING` ✅ · package `app.smartspeak.twa` ✅ · versionCode `3` ✅ · signed by the upload key `58:5F:7C…98` ✅ (matches assetlinks entry 1) · new splash present at all 5 densities ✅

### Build gotchas worth knowing next time

- **Do not run `bubblewrap build` when `twa-manifest.json` has changed** — it prompts to regenerate the project, which **overwrites the custom `splash.png` assets** from `iconUrl`. Build with `.\gradlew.bat bundleRelease --no-daemon` from `SmartSpeak\android\` instead, and bump `versionCode`/`versionName` directly in `app/build.gradle` (keeping `twa-manifest.json` in sync manually).
- `local.properties` with `sdk.dir=C:\Users\lahog\AppData\Local\Android\Sdk` is required for direct Gradle builds; Bubblewrap injects it itself.
- The keystore password sits in cleartext in `android/app/build.gradle` (`signingConfigs.release`). This is why `/android/` is git-ignored in full rather than selectively — verified with `git check-ignore`. **Never `git add -f` anything under `android/`.**

## No open technical tasks

Everything on the code, web and build side is done and verified. What remains is entirely Tom's manual Play Console work.

## Everything else is Tom's manual Play Console work

Fully sequenced in `docs/PLAY-LAUNCH-PLAYBOOK.md` — written for zero Play Console experience, one action per step. He has ADHD; keep instructions literal (exact sidebar path, exact button label, explicit "done when" check) and never bundle three actions into one sentence.

## Critical path

Closed testing: **12 testers opted in for 14 continuous days** before production is allowed (personal developer accounts only — organisation accounts are exempt; account type is unverified as of this handoff). Nothing shortens this. Starting it today is the single highest-value action; everything else can run in parallel during the 14 days.

## Not yet verified

- **Play developer account type (personal vs organisation)** — determines whether the 12-tester/14-day closed test is required at all. Highest-leverage unknown; check before advising on timelines.
- The seven fixes above are verified by build, lint and bundle inspection, **not** by a real device test. Tom needs to reinstall and confirm on-device.

Microphone + transcription are confirmed working on the installed Android build (Tom tested it).

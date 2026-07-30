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
| Alias / password | alias `smartspeak`; password lives in `android/app/build.gradle` (`signingConfigs.release`) on Tom's machine and in his password manager — **never record it in this repo, it is public.** The old value leaked in commit `2407158`; see playbook Step 1b |
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

## 27/07/2026 — Play compliance warnings

Two emails from Play, both with a **31 Aug 2026** deadline.

**1. Target API level — FIXED.** Play requires API 36 (Android 16) for all updates from 31/08/2026 ([source](https://support.google.com/googleplay/android-developer/answer/11926878)). Bumped `targetSdkVersion` 35 → 36. This forced `androidbrowserhelper` 2.6.2 → 2.7.2 (for API 36 behaviour support), which in turn forced `minSdkVersion` 21 → 23 — 2.7.x declares minSdk 23 and the manifest merger refuses the mismatch. Android 5.x is long dead and a TWA needs a modern Chrome anyway, so the coverage cost is negligible.

**2. Play Billing Library ≥ 8.0.0 — BLOCKED UPSTREAM, deliberately deferred.**

This one cannot currently be fixed. The chain:
- Play requires `com.android.billingclient:billing` ≥ 8.0.0 from 31/08/2026.
- The TWA purchase bridge is `com.google.androidbrowserhelper:billing`, whose **latest release is 1.1.0** (verified against `dl.google.com/dl/android/maven2` — everything above it is a `1.0.0-alphaNN`).
- 1.1.0 pulls in `billingclient:7.1.1` and **calls `SkuDetailsParams` / `SkuDetailsParams$Builder` / `SkuDetailsResponseListener`**, all of which billingclient **8.0.0 removed**.
- Pinning 9.1.0 fails the build at R8 with missing-class errors in `PlayBillingWrapper.querySkuDetails` and `ConnectedBillingWrapper.lambda$querySkuDetails$1`. Suppressing those with `-dontwarn` would produce a bundle that **crashes the moment a user tries to buy** — strictly worse than the current state.

**Decision (Tom, 27/07): wait and monitor.** Rationale: nothing can be sold until the payments profile is verified and `pro_unlock` exists, the deadline is ~5 weeks out, and Google is very likely to ship a compatible helper. The 7.1.1 dependency stands, with the reasoning recorded in a comment in `android/app/build.gradle`.

**Action required before mid-August:** re-check `https://dl.google.com/dl/android/maven2/com/google/androidbrowserhelper/billing/maven-metadata.xml` for a release above 1.1.0. If none has appeared, the fallback options are (a) strip the billing dependency entirely — the web app feature-detects and degrades to the free preview with no crash — or (b) write a native Digital Goods bridge against billingclient 9. Do not let this slip past 31/08 unaddressed, or app updates start getting rejected.

### Current bundle

`SmartSpeak-publish-v3.aab` on the Desktop (and `android/app/build/outputs/bundle/release/app-release.aab`). versionCode **4**, versionName **1.0.2**.

Verified by inspecting the extracted `base/manifest/AndroidManifest.xml` and `jarsigner`:
`RECORD_AUDIO` ✅ · `INTERNET` ✅ · `BILLING` ✅ · package `app.smartspeak.twa` ✅ · versionCode `4` ✅ · minSdk `23` ✅ · targetSdk `36` ✅ · `jar verified`, signed by the upload key ✅

### Housekeeping, 27/07

- Deleted: `.next` (159 MB), `out` (65 MB), `tsconfig.tsbuildinfo` — all regenerated by `npm run build`. ~224 MB freed.
- Deleted: `ClaudeCode\SmartSpeak - Keystore\` — the defunct PWABuilder key, never used for any Play upload and superseded by the current upload key.
- `vercel.json` is dead weight (the site is on Netlify; the live security headers come from `public/_headers`, confirmed against the running site). Left in place — harmless, and `next.config.mjs` references it.
- `pnpm-lock.yaml` is the only lockfile — **do not delete**, Netlify's build depends on it.

## 30/07/2026 — RR launch-readiness run (pushed to `main`)

Full write-up: [`docs/reviews/2026-07-30-rr-review.md`](./reviews/2026-07-30-rr-review.md). Headline:
the 29/07 test-suite work was merged to `main` along with three launch fixes.

**The blocker this run found.** Inside the TWA, Play Billing feature-detects as available, so the paywall
rendered a live "Unlock for $10" button — but `pro_unlock` doesn't exist in Play Console, so every tap
rejected with *"Something went wrong with the purchase."* **Every tester would have dead-ended after 3
of 25 exercises on a button that can never work.**

**The fix.** The app now asks Play whether `pro_unlock` exists. Play answers "no such product" → the full
curriculum is granted. It **fails closed** on any error or missing service, and it **reverts itself** the
moment the product goes Active in Console — no flag to remember. Pinned by 5 new tests (94 total).

> ⚠️ **Consequence: do NOT activate `pro_unlock` until closed testing finishes** — doing so switches the
> paywall on for all testers mid-test. Playbook Step 10 now says this explicitly.

Also fixed: the intro screen warns once about the ~55 MB first-take model download (was silent, and the
comment understated it as 40 MB); a screen wake lock is held during recording so Android's 30 s screen
timeout can't truncate a 45–90 s take.

**No `.aab` rebuild.** Nothing native changed — versionCode 4 / 1.0.2 on the Desktop stays valid. These
are web changes; they reach testers through the Netlify deploy.

**One thing to confirm on-device before sending opt-in links:** install, burn 3 reps, confirm rep 4 opens
instead of showing the paywall. That proves the grace fires against the real Digital Goods API.

## Not yet verified

- **Play developer account type (personal vs organisation)** — determines whether the 12-tester/14-day closed test is required at all. Highest-leverage unknown; check before advising on timelines.
- The seven fixes above are verified by build, lint and bundle inspection, **not** by a real device test. Tom needs to reinstall and confirm on-device.

Microphone + transcription are confirmed working on the installed Android build (Tom tested it).

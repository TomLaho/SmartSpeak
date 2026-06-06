# Shipping SmartSpeak to the Google Play Store

SmartSpeak is a PWA. We publish it to Play as a **Trusted Web Activity (TWA)** —
a thin Android wrapper around the deployed web app — and monetize with a single
one-time **$5 in-app product** ("Pro") via **Google Play Billing**.

> Free preview: the first **3 distinct exercises** are free; the rest require Pro.
> Gating lives in `lib/entitlement.ts` (`FREE_EXERCISE_LIMIT`). Billing uses the
> TWA **Digital Goods API** — feature-detected, so the web build runs fine without it.

---

## 0. Before you start
- [ ] **Deploy the PWA** to your HTTPS domain (e.g. `https://smartspeak.app`). The
      manifest is already served at `/manifest.webmanifest`.
- [ ] **Google Play Developer account** — one-time **$25** (play.google.com/console).
- [ ] Local tooling for Bubblewrap: **Node 18+** and a **JDK 17**. Bubblewrap fetches
      the Android SDK for you on first run.
- [ ] Finalize two things in this repo (see “Code to finalize” at the bottom).

---

## 1. Build the Android app (TWA)

### Option A — Bubblewrap (CLI)
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://YOUR_DOMAIN/manifest.webmanifest
#  • applicationId:  app.smartspeak.twa   (your reverse-domain id; remember it)
#  • "Include support for Play Billing?"  →  YES
bubblewrap build
#  → produces app-release-signed.aab  (upload this to Play)
```
If you skipped billing at init, set it in `twa-manifest.json` and rebuild:
```json
"features": { "playBilling": { "enabled": true } }
```

### Option B — PWABuilder (web UI)
1. Go to https://www.pwabuilder.com → enter your URL.
2. **Package for stores → Android**. Turn ON **Google Play Billing**.
3. Download the package (signed `.aab` + the `assetlinks.json`).

Both options rasterize our SVG/PNG icons into the required Play icon set and read
the manifest (`standalone`, portrait, categories, maskable icon) we already ship.

---

## 2. Verify domain ownership (removes the browser URL bar)
Host **`https://YOUR_DOMAIN/.well-known/assetlinks.json`** with the fingerprint of
your **Play App Signing** key (Play Console → *Test and release → App integrity →
App signing key certificate → SHA-256*):

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.smartspeak.twa",
    "sha256_cert_fingerprints": ["AB:CD:...:YOUR_SHA256"]
  }
}]
```
(If you serve the app from this Next.js repo, drop the file at `public/.well-known/assetlinks.json`.)

---

## 3. Create the in-app product
Play Console → *Monetize → Products → In-app products → Create*:
- **Product ID:** `pro_unlock`  ← must match `PRODUCT_ID` in `lib/entitlement.ts`
- **Type:** one-time (non-consumable)
- **Price:** $5.00 (Play auto-localizes)
- Activate it.

Add **license testers** (Play Console → *Setup → License testing*) so you can test
the purchase without being charged.

> **Acknowledgement:** non-consumable purchases must be acknowledged within 3 days
> or Play auto-refunds them. `purchasePro()` calls `service.acknowledge(token)` if
> the Digital Goods API exposes it; confirm this works for your runtime during
> testing. If your Digital Goods version doesn’t acknowledge client-side, add a
> tiny serverless endpoint that calls the Play Developer API to acknowledge.

---

## 4. Store listing (Play Console → *Grow → Main store listing*)
- [ ] App name, short description, full description
- [ ] **App icon** 512×512 (export from `public/icon-512.png`)
- [ ] **Feature graphic** 1024×500
- [ ] **Phone screenshots** ×2+ (home path, a results screen with the timeline)
- [ ] Category: *Education* (or *Productivity*)
- [ ] Contact email + **Privacy policy URL → `https://YOUR_DOMAIN/privacy`**

## 5. Compliance (Play Console → *Policy → App content*)
- [ ] **Data safety:** declare *No data collected/shared*; note audio is processed
      on-device and not transmitted. (Matches `/privacy`.)
- [ ] **Content rating** questionnaire
- [ ] **Target audience** (adults / general)
- [ ] Permissions: microphone — used only during recording
- [ ] Ads: none

## 6. Test → release
1. Upload the `.aab` to **Internal testing**; install via the opt-in link.
2. Confirm: app opens **without a URL bar** (asset links OK), recording +
   on-device transcription work, and **buy `pro_unlock`** as a license tester →
   the paywall unlocks and survives reinstall (restore).
3. Promote Internal → **Closed** → **Production**. First review takes a few days.

---

## Costs
| Item | Cost |
|---|---|
| Play Developer account | **$25 once** |
| Google fee per sale | 15% of $5 (small-business rate) |
| Transcription / AI | **$0** (on-device) |
| Backend | **$0** (none required) |
| Hosting | your PWA host |

## Code to finalize before publishing
- [ ] `app/privacy/page.tsx` & `app/terms/page.tsx` — set the real **contact email**
      (placeholder: `support@smartspeak.app`).
- [ ] **Self-host the speech model** for reliability: today `lib/transcribe.worker.ts`
      pulls `Xenova/whisper-tiny.en` from the HF CDN. For production, host the model
      on your domain and set `env.localModelPath` / `env.remoteHost` accordingly.
- [ ] Confirm the purchase **acknowledgement** path (see step 3).
- [ ] (Optional) enable WASM threads (COOP/COEP headers) or WebGPU to speed up
      first-time transcription on mobile.

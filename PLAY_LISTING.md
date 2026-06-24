# SmartSpeak — Play Console answer pack

Ready-to-paste answers and copy for every Play Console task. Package name is
**`app.smartspeak.twa`** everywhere. Contact email is **lahoguetom@gmail.com**.

Production domain: **`smartspeak-kappa.vercel.app`**.

---

## A. The two URLs Console keeps asking for
| Field | Value |
|---|---|
| Privacy policy URL | `https://smartspeak-kappa.vercel.app/privacy` |
| (Terms, if asked) | `https://smartspeak-kappa.vercel.app/terms` |

> These pages already exist in the app and now show your Gmail. They go live the
> moment you push to the branch Vercel deploys to production — do that **before**
> submitting, or the reviewer hits the old build.

---

## B. "Let us know about the content of your app" (the checklist in your screenshot)

| Task | Answer | Notes |
|---|---|---|
| **Set privacy policy** | `https://smartspeak-kappa.vercel.app/privacy` | — |
| **Sign-in / App access** | *All functionality available without special access* | No login exists. The Pro in-app purchase is **not** a login gate, so reviewers need no credentials. |
| **Ads** | **No**, app contains no ads | True — no ad SDKs. |
| **Content rating** | Start questionnaire → category **Utility / Productivity / Education**. Answer **No** to violence, sexual content, profanity, drugs, gambling, location sharing, user-to-user communication. | Result will be *Everyone / PEGI 3*. |
| **Target audience** | Target age group: **18 and over** only. "Designed for children?" → **No**. | Keeps you out of the Families program and its extra obligations — correct for a work tool. |
| **Data safety** | See section C — declare **no data collected, no data shared**. | Must match the privacy policy. It does. |
| **Government apps** | **No** | Not a government app. |
| **Financial features** | **No** | An in-app purchase is not a "financial feature" (those mean banking, lending, crypto, investing). |
| **Health** | **No** to all | ⚠️ Critical: SmartSpeak is **productivity/education, not health**. Answering No here is both accurate and what keeps a *personal* developer account eligible (personal accounts can't publish health apps). Don't let listing copy drift into health claims. |

---

## C. Data safety form — exact answers
1. **Does your app collect or share any required user data types?** → **No.**
   - Audio is processed **on-device** and never transmitted, so under Play's
     definition it is **not "collected."** Progress/XP live in local storage on
     the device only.
2. Because you answer No to collection, the rest collapses:
   - Data encrypted in transit: N/A (nothing transmitted).
   - Users can request deletion: data is local; "Reset all progress" clears it.
3. This is consistent with `/privacy`. If a reviewer questions the mic, the
   answer is: mic permission is used only live during a recording; audio stays on
   the device.

---

## D. Store listing copy (paste-ready)

**App name** (30 max): `SmartSpeak`

**Short description** (80 max):
```
Your pocket presentation coach — 1-minute daily reps to nail work presentations.
```

**Full description** (4000 max):
```
SmartSpeak is your pocket presentation coach for work. In about a minute a day,
you rehearse the moments that actually move your career — reading out findings,
walking a deck, pitching a strategy, defending a plan, giving a status update,
and handling tough questions under pressure.

Record a short take and get instant, private feedback on:

• Delivery — your real speaking pace, the pauses before your key numbers, vocal
  energy and emphasis, and the filler words ("um", "like", "you know") that leak
  authority.
• Structure — leading with the point (BLUF), turning data into a clear "so what",
  and making one idea land.
• Influence & Q&A — the 60-second executive summary, a confident ask, and staying
  answer-first when your plan gets challenged.

It's built as a daily habit: short, work-scenario exercises with streaks, XP and a
daily goal, organised into focused modules so you always know your next rep.

Private by design. Everything runs on your device — recording, analysis and
transcription. Your voice never leaves your phone, there are no accounts, and
nothing is uploaded to a server. It even works offline after the first use.

Free preview: the first three exercises are free. A single one-time Pro purchase
unlocks the full curriculum — no subscription, tied to your Google account so it
restores on any device.
```

> Per Google's "deliver exactly what's promised" rule: every claim above is true
> of the build. Don't add features to the copy you haven't shipped.

---

## E. Graphic assets — what you have vs. still need
| Asset | Spec | Status |
|---|---|---|
| App icon | 512×512 PNG | ✅ `public/icon-512.png` |
| Feature graphic | 1024×500 PNG/JPG | ❌ **Need to create** — required for listing |
| Phone screenshots | 2–8, min 1080px side | ❌ **Need to capture** (e.g. the train home path + a results/score screen) |

To capture screenshots: run the deployed app on your phone (or Chrome DevTools
device mode at a phone size), and shoot 2–4 clean frames — home path, an exercise
mid-take, and a results screen with the score rings.

---

## F. Critical-path sequence from here
1. **Push current code to production** (privacy email + `assetlinks.json`) so Vercel redeploys. Verify `https://smartspeak-kappa.vercel.app/privacy` loads and shows your Gmail.
2. In Play Console → **Test and release → App integrity → App signing** → copy the **SHA-256 certificate fingerprint**.
3. Paste it into `public/.well-known/assetlinks.json` (replace `REPLACE_WITH_PLAY_APP_SIGNING_SHA256`), push again, then confirm `https://smartspeak-kappa.vercel.app/.well-known/assetlinks.json` returns the JSON.
4. **Package the TWA** (PWABuilder or Bubblewrap) against `https://smartspeak-kappa.vercel.app`:
   - applicationId / package id = **`app.smartspeak.twa`** (must match exactly)
   - enable **Google Play Billing** and tick **Microphone (RECORD_AUDIO)**
   - upload the signed `.aab`.
5. Create the in-app product: **`pro_unlock`**, one-time (non-consumable), $10. Add yourself as a **license tester**.
6. Complete all section-B declarations + store listing + graphics above.
7. Upload to **Internal testing** → confirm: opens with **no URL bar**, mic + on-device transcription work, and buying `pro_unlock` unlocks Pro and survives reinstall.
8. Start the **closed test: 14 days, 12+ testers** — mandatory for personal accounts before production. This is the long pole; start it as early as step 7 allows.
9. Promote Closed → **Production**.

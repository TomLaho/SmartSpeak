# SmartSpeak — Google Play Launch Playbook

**Written for: Tom, zero Play Console experience. Date: 26/07/2026.**
Follow top to bottom. One action per step. Don't skip, don't reorder.

---

## PART 0 — Read this first (2 min)

### Where everything stands

| Thing | Status |
|---|---|
| Web app (PWA) at smartspeak-app.netlify.app | ✅ Live, deployed, verified |
| Android App Bundle (`.aab`) | ✅ Built + verified (mic permission, billing, correct package) |
| Upload signing key | ✅ Created — **you must back it up (Step 1)** |
| Digital asset links (kills the URL bar) | ✅ Done — both upload key and Google's App-signing key are live |
| Privacy policy URL in Play Console | ❌ Not done (Step 5) |
| `pro_unlock` in-app product | ❌ Not done (Step 10) |
| Closed test (12 testers / 14 days) | ❌ Not started (Step 11) — **this is the long pole** |

### The honest timeline reality

You said "publish today." Here's the truth so you don't get blindsided:

- **If your Play developer account is a *personal* account** (signed up as an individual), Google *requires* a closed test with **12 testers who stay opted in for 14 continuous days** before you can apply for production. So the earliest production date is **~9 August 2026**, not today.
- **If it's an *organisation* account** (registered with an ABN/company), that requirement does **not** apply and you can push to production today.

**What you CAN finish today either way:** upload the build, get it installed and tested on your phone, fix the asset links, create the paid product, and start the 14-day clock. That's the whole critical path. Do it today and the clock starts today.

Check which account type you have: Play Console → **Settings** (gear, bottom-left) → **Developer account** → **Account details** → look at "Account type".

### The two files you must not confuse

| File | Use it? |
|---|---|
| `C:\Users\lahog\Desktop\smartspeak-v3-app-release.aab` | ✅ **THIS ONE.** Version code 3 — verified mic + billing + new splash. Already on your Desktop. |
| `C:\Users\lahog\ClaudeCode\smartspeak-twa\app\build\outputs\bundle\release\app-release.aab` | ✅ Same file, at its build location. |
| `C:\Users\lahog\ClaudeCode\SmartSpeak\Google Play package\SmartSpeak.aab` | ❌ **NEVER.** Old broken build — microphone doesn't work. Safe to delete the whole folder. |

---

## PART 1 — Do this before touching Play Console

### ☐ Step 1 — Back up the signing key (5 min, DO NOT SKIP)

This file is your app's identity. Lose it and you can never update SmartSpeak again — you'd have to publish a brand-new app and lose all users and reviews. There is no recovery. Google cannot help you.

1. Open File Explorer, paste this into the address bar and press Enter:
   ```
   C:\Users\lahog\ClaudeCode\smartspeak-twa
   ```
2. Find the file **`smartspeak-upload.keystore`**. Right-click → **Copy**.
3. Paste it into **two** places that aren't this computer's hard drive — e.g. your Google Drive folder AND a USB stick. (Two, not one.)
4. Open your password manager. Create a new entry:
   - **Title:** SmartSpeak Android upload key
   - **Password:** `SmartSpeak2024!`
   - **Notes:** `Alias: smartspeak | Store password AND key password are both SmartSpeak2024! | Keystore file backed up in <wherever you put it>`
5. ✅ **Done when:** the keystore file exists in two non-local places and the password is in your password manager.

> The old PWABuilder key is dead. Nothing was ever uploaded with it, so it doesn't matter. Ignore it.

### ☐ Step 2 — Find the .aab (already done for you)

1. Look on your **Desktop** for **`smartspeak-v3-app-release.aab`** (2.4 MB).
2. ✅ **Done when:** you can see that file. It's already there — nothing to copy.

---

## PART 2 — Play Console

Open https://play.google.com/console in Chrome and sign in. Select the **SmartSpeak** app.

> **Orientation:** the left-hand sidebar is your map. Everything below tells you exactly which sidebar item to click. If you get lost, click the app name at the top-left to get back to the app dashboard.

### ☐ Step 3 — Upload the build to Internal testing (10 min)

1. Left sidebar → **Test and release** → **Testing** → **Internal testing**.
2. Top-right → blue **Create new release** button.
3. You'll see a box labelled **App bundles**. Drag `smartspeak-v3-app-release.aab` from your Desktop into it. Wait for the upload bar to finish (~30 seconds).
4. If a dialog appears offering **Play App Signing** / "Use Google-generated key" → click **Continue** / **Accept**. This is correct and required.
5. Scroll down to **Release notes**. In the box, paste:
   ```
   First internal build. Speech training exercises with live transcription.
   ```
6. Top-right → **Next**, then **Save and publish** (or **Start rollout to Internal testing** → **Rollout**).
7. ✅ **Done when:** the release shows status **Available to internal testers** (may take 5–15 min to process).

**If it errors:** read the red text. Most likely causes — you grabbed the wrong .aab (see PART 0 table), or version code already used. Screenshot the error and send it to Claude.

### ☐ Step 4 — Add yourself as an internal tester (5 min)

1. Still on **Internal testing** → click the **Testers** tab (next to "Releases").
2. Click **Create email list**.
3. **List name:** `Internal — me`
4. In the email box, type your Google account email → press Enter.
5. Click **Save changes**, then tick the checkbox next to the list, then **Save changes** again.
6. Scroll to the bottom → **How testers join your test** → click **Copy link**.
7. Open that link **on your Android phone**, in Chrome, signed in with the same Google account.
8. Tap **Become a tester** → then **Download it on Google Play** → **Install**.
9. ✅ **Done when:** SmartSpeak is installed on your phone from the Play Store.

> If the Play Store says "item not found", wait 15 minutes and try again. Propagation is slow. This is normal, not a bug.

### ☐ Step 5 — Fix the privacy policy URL (3 min)

You can do this while waiting for the build to process.

1. Left sidebar → **Monitor and improve** → **Policy** → **App content**.
2. Find **Privacy policy** in the list → click **Manage** (or **Start**).
3. Paste exactly:
   ```
   https://smartspeak-app.netlify.app/privacy
   ```
4. Click **Save**.
5. ✅ **Done when:** the Privacy policy row shows a green tick / "Completed".

---

## PART 3 — Test the two things that were broken

Do this on your phone, on the build you just installed from Play.

### ☐ Step 6 — Test the microphone (3 min)

1. Open SmartSpeak on your phone.
2. Start any exercise and tap record.
3. Android should pop up: **"Allow SmartSpeak to record audio?"** → tap **Allow** / **While using the app**.
4. Speak a sentence.
5. ✅ **PASS =** your words appear as transcribed text.
6. ❌ **FAIL =** no permission prompt appears, or nothing transcribes → stop, screenshot, send to Claude.

### ☐ Step 7 — Test the URL bar (1 min)

1. Look at the very top of the app screen.
2. ✅ **PASS =** no address bar. It looks like a real app, edge to edge.
3. ⚠️ If you still see a thin bar showing `smartspeak-app.netlify.app`: **uninstall the app, then reinstall it** from the Play link. Android caches a failed verification, so a fresh install is needed to pick up the fingerprints that are already live. It should be gone after that.

---

## PART 4 — Kill the URL bar for real

### ✅ Step 8 — Google signing fingerprint — ALREADY DONE

You sent the App-signing SHA-256 (`A9:9C:E7:…:1E`) and it is now live in `assetlinks.json` alongside the upload key. **Nothing to do here.**

All you need to do is **uninstall and reinstall** SmartSpeak once after your next install, so the phone re-runs the verification instead of using its cached "failed" result. Then the URL bar should be gone.

<details>
<summary>Why this was needed (for reference)</summary>

Google re-signs your app with *its own* key when it delivers it from the Play Store. So the website needs to trust that key too, not just yours.

1. Left sidebar → **Test and release** → **Setup** → **App integrity** → **App signing** tab.
2. Find the section **App signing key certificate**.
3. Find the line labelled **SHA-256 certificate fingerprint**. It looks like:
   `AB:CD:12:34:...` (32 pairs, colon-separated)
4. Click the small **copy** icon next to it.
5. Paste it into your Claude conversation with the message:
   ```
   Here's the App signing key SHA-256: <paste>
   ```
6. Claude adds it to `assetlinks.json`, pushes, Netlify redeploys (~2 min).
7. On your phone: **uninstall SmartSpeak, then reinstall it** from the Play link.
8. ✅ **Done when:** you reopen the app and the URL bar is gone.

> **Copy the SHA-256, not the SHA-1.** They're right next to each other on that page. SHA-**256** is the long one.

</details>

---

## PART 5 — Money and store listing

### ☐ Step 9 — Fill in the store listing (20 min)

Skip any field marked optional. Speed over polish — you can edit all of this later.

1. Left sidebar → **Grow users** → **Store presence** → **Main store listing**.
2. Fill in:
   - **App name:** `SmartSpeak`
   - **Short description** (max 80 chars): `Speech training exercises with live transcription and progress tracking.`
   - **Full description:** write 3–4 short paragraphs about what it does, who it's for, what's free vs paid.
3. **Graphics** — the files are already made for you:
   - **App icon:** 512×512 PNG (in `C:\Users\lahog\ClaudeCode\SmartSpeak\public\` — look for the largest icon file)
   - **Feature graphic:** `C:\Users\lahog\ClaudeCode\SmartSpeak\store-assets\feature-graphic.png`
   - **Phone screenshots:** all four in `C:\Users\lahog\ClaudeCode\SmartSpeak\store-assets\screenshots\` (minimum 2 required — upload all 4)
4. Click **Save**.
5. Then work through every remaining item in **App content** (left sidebar → Policy → App content) that still shows an incomplete/red status: Data safety, Ads declaration, Content rating questionnaire, Target audience, Government apps. Answer honestly; each is a short form.
6. ✅ **Done when:** every row in **App content** shows a green tick.

> **Feedback email — `info@kairoanalytics.com` is a fine choice.** A monitored role address beats a personal one, and it's the right *kind* of address for the field. Two things to be aware of:
> - It is **public** on your store listing, so it will attract spam. Make sure it's filtered, not forwarded raw to your main inbox.
> - It publicly links SmartSpeak to Kairo Analytics. If you'd rather keep the app and the consulting brand separate — different audiences, different positioning — set up `hello@smartspeak.app` or similar instead. Purely a branding call; there's no technical difference. You can change it any time.

> **Data safety hint:** SmartSpeak records audio. Declare that you collect audio, state whether it leaves the device, and that it's used for app functionality. Be accurate — a false declaration here gets apps pulled.

### ☐ Step 10 — Create the `pro_unlock` product (10 min)

> **If you see "Finish setting up your app on the dashboard"** — that's expected, not a bug. Play locks the Monetise section behind two prerequisites. Clear them in this order, then come back:
>
> **10a.** ☐ Left sidebar → **Dashboard** → the **Set up your app** panel. Work down that checklist until every item has a green tick (it's the same set as Step 9: store listing, content rating, data safety, target audience, ads, privacy policy).
>
> **10b.** ☐ Left sidebar → **Monetise** → **Monetisation setup** → **Payments profile**. If it says no profile is linked, click **Create payments profile** and complete it. You need an Australian business/personal payments profile (name, address, and for a business, your ABN). **This is the step most people are actually blocked by** — you cannot sell anything until it exists, and it can take a day or two to verify.
>
> **Do not let this block Step 11.** The closed test does not need `pro_unlock` to exist. Start the 14-day clock first, sort monetisation during those two weeks.

1. Left sidebar → **Monetise** → **Products** → **In-app products**.
2. Top-right → **Create product**.
3. Fill in:
   - **Product ID:** `pro_unlock` ← **must be exactly this. Cannot be changed later.**
   - **Name:** `SmartSpeak Pro`
   - **Description:** what unlocking gets them
4. **Pricing** → **Set price** → enter your AUD price → Google auto-converts to other currencies → **Apply**.
5. **Save** → then **Activate** (top-right). It must say **Active**, not Draft.
6. ✅ **Done when:** `pro_unlock` shows status **Active**.

> Purchases won't work in testing until the release is published to a test track *and* you add your account under **Setup → License testing** (that lets you make test purchases without being charged). Do that if you want to test buying.

---

## PART 6 — Start the clock

### ☐ Step 11 — Launch the closed test (15 min + recruiting)

**This is your critical path. Every day you delay is a day added to launch.**

1. Left sidebar → **Test and release** → **Testing** → **Closed testing**.
2. Click **Create track** (name it `Closed test`) → then **Create new release**.
3. Under **App bundles**, click **Add from library** → select the same build you uploaded in Step 3. (Don't re-upload the file.)
4. Add release notes → **Next** → **Save and publish**.
5. **Testers** tab → **Create email list** → name it `Closed testers` → add **12+ Google account email addresses** (use 14–15 for safety margin in case someone drops out). See **Step 11b** if you don't have 12 people.
6. **Save changes**, tick the list, **Save changes**.
7. Copy the opt-in link and send it to all 12 people. It looks like this:
   ```
   https://play.google.com/apps/testing/app.smartspeak.twa
   ```
8. ✅ **Done when:** 12 people have opened the link and tapped **Become a tester**.

> **Which link is which** — you asked about both:
> | Link | What it is |
> |---|---|
> | `play.google.com/apps/testing/app.smartspeak.twa` | ✅ **The tester opt-in page.** This is the one you share. Works during closed testing. |
> | `play.google.com/store/apps/details?id=app.smartspeak.twa` | The public store page. Returns "not found" until you're live in production. Don't share it yet. |

### ☐ Step 11b — You don't have 12 Android-owning friends. Here's what to do.

**Check this first, it may make the whole problem disappear:** Settings → Developer account → Account details → **Account type**. If it says *Organisation*, the 12-tester/14-day rule does not apply to you at all — skip straight to production (Step 12). Only *Personal* accounts are subject to it. Check before you spend effort recruiting.

If you are on a personal account, in order of preference:

1. **☐ Reciprocal testing communities — the normal, accepted route.** Thousands of solo devs are in exactly your position, so a whole ecosystem exists where developers test each other's apps. You join, you install and open 11 other people's apps for 14 days, they do the same for yours. Free, legitimate, and Google is fine with it.
   - `r/AndroidClosedTesting` and `r/TestMyApp` on Reddit
   - Search "Google Play closed testing group" on Telegram or Discord — several large, active ones
   - Post your opt-in link, commit to testing theirs, be responsive
2. **☐ Widen your own net beyond close friends.** You need 12 Google accounts, not 12 best mates. Colleagues, gym contacts, extended family, LinkedIn network, your Kairo clients. A one-line ask — "install this, open it a couple of times over two weeks, don't uninstall" — is a low bar and most people say yes.
3. **⚠️ Paid tester services — I'd avoid these.** They exist ($50–150 for 12 testers) and they work often enough that people use them, but Google has been actively cracking down on fake or low-engagement testers. The downside risk is your production application getting rejected or the developer account flagged, which costs you far more than two weeks. Not worth it when option 1 is free.

**What will not work:** switching to **open testing** instead. Open testing does not satisfy the requirement — Google specifically requires a *closed* test. Don't waste a week finding that out.

**Testers must actually engage.** Google looks at whether testers genuinely used the app, not just that 12 accounts opted in. Ask people to open it a few times across the two weeks, not once on day one.

**Tell your testers, word for word:**
> "Tap this link, tap Become a tester, install SmartSpeak, and open it a few times over the next two weeks. **Do not uninstall it and do not leave the tester program** — if you drop out, the 14-day counter resets and I can't launch."

9. Write the date you hit 12 opted-in testers on your calendar. **+14 days from that date** is the earliest you can apply for production.

### ☐ Step 12 — After 14 days

1. Left sidebar → **Test and release** → **Production** → **Create new release**.
2. Add the build from library, add release notes, submit for review.
3. Review takes anywhere from a few hours to 7 days for a first submission.

---

---

## PART 7 — How to ship changes after launch

**The single most useful thing to understand about this app:** SmartSpeak is a **TWA** — the Android app is a thin native shell around the live website at `smartspeak-app.netlify.app`. That splits every future change into two very different categories.

| Change type | How it ships | Play upload needed? | Time to reach testers |
|---|---|---|---|
| Anything in the web app — screens, layout, colours, copy, scoring logic, bug fixes, new exercises | `git push` → Netlify auto-deploys | ❌ **No** | ~2 min |
| `assetlinks.json` (signing fingerprints) | `git push` → Netlify | ❌ **No** | ~2 min |
| Splash screen, app icon, app name, permissions, Play Billing config, target SDK | Rebuild the `.aab` → upload to Play | ✅ **Yes** | Hours (Play review) |

So ~95% of what you'll ever change needs **no Play release at all**. That is the big advantage of the TWA approach and it means you are not blocked by review turnaround for product iteration.

### ☐ Route A — web change (the common case)

1. I push to `main`.
2. Netlify builds and deploys automatically (~2 minutes).
3. ☐ On your phone: **fully close SmartSpeak** (swipe it out of the recent-apps list — don't just press back), then reopen it.
4. ✅ **Done when:** you see the change. The service worker serves pages network-first, so one clean reopen is enough. If it's stubborn, open it twice.
5. Testers get it the same way — no action needed from them beyond reopening the app.

> You do **not** need to tell testers to update, and it does **not** interrupt the 14-day closed-test clock.

### ☐ Route B — native change (rebuild required)

1. I rebuild the `.aab` with an incremented version code and send it to you.
2. ☐ Play Console → **Test and release** → **Testing** → **Internal testing** (or **Closed testing**) → **Create new release**.
3. ☐ Drag the new `.aab` into **App bundles**.
4. ☐ Release notes → **Next** → **Save and publish**.
5. ☐ On your phone: Play Store → your app → **Update** (or wait — it auto-updates within a day).
6. ✅ **Done when:** the new version code shows in the release list and your phone's install matches it.

> **Version code must always increase.** Play rejects a bundle whose version code has been used before. I handle this — just never upload an old `.aab` on top of a newer one.

> **Rolling out a new `.aab` does not reset the 14-day clock**, as long as testers stay opted in. Updating is safe.

---

## If you get stuck

Send Claude: (a) what step number you're on, (b) a screenshot of what you're looking at, (c) the exact error text. Don't guess and click around — one wrong irreversible click (product ID, package name) can't be undone.

**Things that are permanent and cannot be changed later:**
- Package name `app.smartspeak.twa`
- In-app product ID `pro_unlock`
- The upload keystore (back it up — Step 1)

Everything else — descriptions, screenshots, price, icon — you can edit any time.

---

## Today's minimum-viable finish line

If you only do five things today, do these in this order:

1. **Step 1** — back up the keystore (5 min, unrecoverable if skipped)
2. **Check your account type** (PART 0) — if it's an *Organisation* account, steps 11/11b vanish and you can go to production today
3. **Step 3** — upload `smartspeak-v3-app-release.aab` to Internal testing
4. **Step 5** — privacy URL
5. **Step 11 / 11b** — start the closed test and recruit 12 testers ← *starts the 14-day clock*

Everything else — store listing polish, `pro_unlock`, payments profile — can happen during the 14 days. Don't let Step 10 block Step 11.

# SmartSpeak — Google Play Launch Playbook

**Written for: Tom, zero Play Console experience. Date: 26/07/2026.**
Follow top to bottom. One action per step. Don't skip, don't reorder.

---

## PART 0 — Read this first (2 min)

### Where everything stands

| Thing | Status |
|---|---|
| Web app (PWA) at smartspeak-app.netlify.app | ⚠️ **Live and current through 30/07.** Two later commits (`27d0caa`, `264cefe`) are committed locally and **not pushed** — push them before any tester installs. See PART 0.5. |
| Android App Bundle (`.aab`) | ✅ **versionCode 5 / 1.0.3**, built 08/09 — mic, billing, package and signature verified against the extracted bundle. Carries **billingclient 8.3.0**, clearing Play's 01/11/2026 Billing Library requirement. |
| Upload signing key | ✅ Created — **you must back it up (Step 1)** |
| Digital asset links (kills the URL bar) | ✅ Done — both upload key and Google's App-signing key are live |
| Privacy policy URL in Play Console | ✅ Done |
| **App pricing** | 🚨 **WRONG — app is set to PAID at $13.99. Blocks all testers. See PART 6.5.** |
| `pro_unlock` in-app product | ⏸ **Deliberately not done — leave it until closed testing ends (Step 10).** While it doesn't exist, testers get the full curriculum free. |
| Closed test (12 testers / 14 days) | ❌ Not started (Step 11) — **this is the long pole** |
| Play Billing Library ≥ 8.0.0 (due 01/11/2026) | ✅ **Fixed in code 08/09.** Clears in Console only once versionCode 5 is live on every active track. |
| Android developer verification (due 30/09/2026) | ❓ **Unverified — check today.** Play Console **Home** shows a package-name status next to each app; anything not auto-registered must be registered manually or the app is removed from Play globally. |

---

## PART 0.5 — ✅ Resolved 08/09/2026. Netlify was never the problem.

**What actually happened.** The 30/07 triage in this section chased a Netlify fault that did not exist.
Checked at content level on 08/09: every commit up to and including `6b15217` (30/07) **is live** — the
paywall grace, the model-download warning and the wake lock are all in the bundles the site serves. The
one change that never reached testers, `27d0caa` (31/07, the first-run redesign), was **committed on this
machine and never pushed**. `git status -sb` read `## main...origin/main [ahead 1]`.

**The rule that comes out of it:** before ever blaming the host, run this in the repo:

```powershell
git status -sb
```

If it says `[ahead N]`, the code is sitting on your laptop and no amount of Netlify clicking will help.

The old Steps 0.5a–0.5d are kept below only as a genuine Netlify triage recipe for a future outage — they
are **not** the current situation.

<details>
<summary>Archived Netlify triage (only if a push really is on GitHub and the site doesn't update)</summary>

1. Netlify → **Deploys** → read the top entry: **Failed** (red) = open it, the real error is in the last
   20 lines. **Building/Enqueued** = just wait. **Published but old** = the webhook never fired.
2. Webhook fix: **Deploys** → top-right **Trigger deploy** → **Clear cache and deploy site**, then Site
   configuration → **Build & deploy** → **Continuous deployment** → confirm the repo is linked and the
   production branch is `main`.
3. ⚠️ Never create a *second* Netlify site while troubleshooting — a new URL breaks the TWA and
   `assetlinks.json`, which are both bound to `smartspeak-app.netlify.app`.
4. Verify at content level, never on the word "Published": open
   `https://smartspeak-app.netlify.app/train` in an **incognito** window, start an exercise you have
   never recorded, and look for `Heads up: your first take downloads a one-time ~55 MB speech model`
   above the button.

</details>

---

### The honest timeline reality

You said "publish today." Here's the truth so you don't get blindsided:

- **If your Play developer account is a *personal* account** (signed up as an individual), Google *requires* a closed test with **12 testers who stay opted in for 14 continuous days** before you can apply for production. So the earliest production date is **~9 August 2026**, not today.
- **If it's an *organisation* account** (registered with an ABN/company), that requirement does **not** apply and you can push to production today.

**What you CAN finish today either way:** upload the build, get it installed and tested on your phone, fix the asset links, create the paid product, and start the 14-day clock. That's the whole critical path. Do it today and the clock starts today.

Check which account type you have: Play Console → **Settings** (gear, bottom-left) → **Developer account** → **Account details** → look at "Account type".

### The two files you must not confuse

| File | Use it? |
|---|---|
| `C:\Users\lahog\Desktop\SmartSpeak-publish-v5.aab` | ✅ **THIS ONE.** versionCode 5 / 1.0.3 — adds Play Billing Library 8.3.0 on top of everything v3 had. |
| `C:\Users\lahog\Desktop\SmartSpeak-publish-v3.aab` | ❌ **Superseded** — despite the name it is versionCode 4, and Play now rejects it for the old Billing Library. Delete it so you can't pick it by mistake. |
| `C:\Users\lahog\ClaudeCode\SmartSpeak\android\app\build\outputs\bundle\release\app-release.aab` | ✅ Same file, at its build location. |

> The Android wrapper project now lives at `SmartSpeak\android\` (moved from `ClaudeCode\smartspeak-twa\`). It is git-ignored in full because it contains your keystore and its password — **never force-add anything under `android/` to git.**

---

## PART 1 — Do this before touching Play Console

### ☐ Step 1 — Back up the signing key (5 min, DO NOT SKIP)

This file is your app's identity. Lose it and you can never update SmartSpeak again — you'd have to publish a brand-new app and lose all users and reviews. There is no recovery. Google cannot help you.

1. Open File Explorer, paste this into the address bar and press Enter:
   ```
   C:\Users\lahog\ClaudeCode\SmartSpeak\android
   ```
2. Find the file **`smartspeak-upload.keystore`**. Right-click → **Copy**.
3. Paste it into **two** places that aren't this computer's hard drive — e.g. your Google Drive folder AND a USB stick. (Two, not one.)
4. Open your password manager. Create a new entry:
   - **Title:** SmartSpeak Android upload key
   - **Password:** the store/key password (both are the same). It is in `android/app/build.gradle` under `signingConfigs.release` on your machine — copy it from there, and **do not paste it into any file in this repo.**
   - **Notes:** `Alias: smartspeak | Store password AND key password are identical | Keystore file backed up in <wherever you put it>`
5. ✅ **Done when:** the keystore file exists in two non-local places and the password is in your password manager.

> ### 🔴 Read Step 1b before you consider Step 1 finished.

### ☐ Step 1b — Rotate the upload key (this repo is public and the password leaked)

The password was written into this playbook and into the session handoff on 26/07 and pushed to
**`github.com/TomLaho/SmartSpeak`, which is a public repository.** It has been removed from the current
files, but **git keeps history** — anyone can still read it in commit `2407158`. Treat it as compromised.

**How bad is it, honestly:** limited. The keystore *file* was never committed — `.gitignore` caught it
(verified across all history). A password with no keystore signs nothing. But your defence-in-depth is
gone, and the same keystore is backed up in Google Drive, so a Drive leak would now be enough on its own.

1. ☐ Decide: rotate, or accept. Rotating is the safe call and Google supports it explicitly — Play App
   Signing means **your upload key is replaceable without losing the app**. The app-signing key that
   users actually verify against is held by Google and is unaffected either way.
2. ☐ If rotating: Play Console → **Test and release** → **Setup** → **App integrity** → **App signing**
   tab → **Request upload key reset**. Generate a fresh keystore with a new password, upload the new
   certificate, and follow Google's instructions.
3. ☐ Update `public/.well-known/assetlinks.json` with the new upload-key SHA-256 (keep Google's
   app-signing fingerprint `A9:9C:E7:…:1E` in place), then push — otherwise the TWA shows a browser
   address bar.
4. ☐ Put the new password **only** in your password manager. Never in a repo file.
5. ✅ **Done when:** Play Console shows the new upload certificate and a fresh build signed with the new
   key uploads without an "incorrect certificate" error.

> **Not urgent enough to delay testers.** The password alone is not exploitable, so start closed testing
> first (PART 6) and do this during the 14 days. Just don't skip it.

> The old PWABuilder key is dead. Nothing was ever uploaded with it, so it doesn't matter. Ignore it.

### ☐ Step 2 — Find the .aab (already done for you)

1. Look on your **Desktop** for **`SmartSpeak-publish-v5.aab`** (versionCode 5 / 1.0.3).
2. ✅ **Done when:** you can see that file. It's already there — nothing to copy.

> **Ignore `SmartSpeak-publish-v3.aab`** if it's still sitting next to it — that one is versionCode 4 and
> Play now rejects it for shipping Play Billing Library 7. Delete it.

> **You do not need to rebuild it.** SmartSpeak is a TWA: the bundle is a shell around the live website,
> so every web fix reaches testers through the Netlify deploy, not through a new upload. This bundle stays
> valid until something *native* changes (permissions, icons, splash, SDK levels, billing library).

---

## PART 2 — Play Console

Open https://play.google.com/console in Chrome and sign in. Select the **SmartSpeak** app.

> **Orientation:** the left-hand sidebar is your map. Everything below tells you exactly which sidebar item to click. If you get lost, click the app name at the top-left to get back to the app dashboard.

### ☐ Step 3 — Upload the build to Internal testing (10 min)

1. Left sidebar → **Test and release** → **Testing** → **Internal testing**.
2. Top-right → blue **Create new release** button.
3. You'll see a box labelled **App bundles**. Drag `SmartSpeak-publish-v5.aab` from your Desktop into it. Wait for the upload bar to finish (~30 seconds).
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

#### ☐ Keeping SmartSpeak mail out of your Kairo inbox

`info@` forwards into `tom@`, so without a rule every app user and every Play notice lands in your main working inbox. Best practice, in order of how much it's worth doing:

1. **☐ Filter on the delivery address, not the sender.** This is the key trick — it catches *everything* sent to `info@` regardless of who sent it. In Gmail: **Settings** (gear) → **See all settings** → **Filters and Blocked Addresses** → **Create a new filter**. In the **To** field enter:
   ```
   info@kairoanalytics.com
   ```
   → **Create filter** → tick **Skip the Inbox (Archive it)** and **Apply the label** → **New label** → `SmartSpeak`. → **Create filter**.
   - ✅ **Done when:** a test email to `info@` lands under the SmartSpeak label and not in your inbox.
2. **☐ Do *not* tick "Mark as read".** You want the unread count on the label as your prompt to check it — otherwise support mail silently rots and Play's policy notices go unseen.
3. **☐ Add a sub-label for the automated mail.** A second filter on `From: googleplay-noreply@google.com` → label `SmartSpeak/Play`. Keeps genuine user mail visible and separates it from release/policy notifications.
4. **☐ Check it on a schedule, not on arrival.** Once a day is plenty at this stage, and it protects your focus. Put a recurring 5-minute slot in your calendar rather than relying on noticing it.
5. **☐ Set up a canned reply** for the two questions you'll get most (how to cancel/refund, and "it doesn't hear me"). Gmail → Settings → Advanced → enable **Templates**.

> **Do not auto-reply to users.** An autoresponder on a public support address invites spam loops and reads as unserious for a paid app. Manual replies, once a day.

> **Data safety hint:** SmartSpeak records audio. Declare that you collect audio, state whether it leaves the device, and that it's used for app functionality. Be accurate — a false declaration here gets apps pulled.

### ☐ Step 10 — Create the `pro_unlock` product (10 min)

> **If you see "Finish setting up your app on the dashboard"** — that's expected, not a bug. Play locks the Monetise section behind two prerequisites. Clear them in this order, then come back:
>
> **10a.** ☐ Left sidebar → **Dashboard** → the **Set up your app** panel. Work down that checklist until every item has a green tick (it's the same set as Step 9: store listing, content rating, data safety, target audience, ads, privacy policy).
>
> **10b.** ☐ Left sidebar → **Monetise** → **Monetisation setup** → **Payments profile**. If it says no profile is linked, click **Create payments profile** and complete it. You need an Australian business/personal payments profile (name, address, and for a business, your ABN). **This is the step most people are actually blocked by** — you cannot sell anything until it exists, and it can take a day or two to verify.
>
> **Do not let this block Step 11.** The closed test does not need `pro_unlock` to exist. Start the 14-day clock first, sort monetisation during those two weeks.

> ### ⚠️ Do NOT activate `pro_unlock` until the 14-day closed test has finished.
>
> The app asks Google Play at runtime whether `pro_unlock` exists. While it **doesn't** exist, the
> app unlocks the whole curriculum for free — that's deliberate, so your testers can actually reach
> all 25 exercises and give you useful feedback instead of hitting a paywall after 3 reps that they
> physically cannot pay.
>
> The moment you set `pro_unlock` to **Active**, that ends: the paywall switches itself on for
> everyone, and your testers drop back to 3 free reps mid-test. **No code change is needed either
> way — Play's own state is the switch.**
>
> So: create the payments profile now if you like (10b), but **come back and do steps 1–6 below only
> after closed testing is done**, or right before you go to production (Step 12). Nothing else in the
> launch depends on it.

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
5. **Testers** tab → add **12+ Google account email addresses**. Use 14–15 for safety margin in case someone drops out. See **Step 11b** if you don't have 12 people.

   > **Yes — testers must be added manually. Only listed accounts can install a closed test.** Enrolling via the link isn't enough on its own; the account has to be on your list first. Two ways to manage that:
   >
   > | Method | When to use |
   > |---|---|
   > | **Email list** (Create email list) | Fine for a handful. You paste each address and re-save every time someone joins. |
   > | **Google Group** ✅ recommended for 12+ | Create a public group at [groups.google.com](https://groups.google.com), add the group address as your tester list once, then people **join the group themselves**. No Console edits as testers trickle in — a big deal when you're swapping with strangers from Reddit. |

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

### ☐ Step 11c — Where to find the reciprocal-testing groups

I can't verify specific Telegram channels are currently active, safe, or not scams — they appear and disappear constantly, and I'd be guessing if I named one. **Search, don't trust a link someone hands you.** Work in this order:

1. **☐ Reddit first — this is the safest option and doesn't need Telegram at all.**
   - `r/AndroidClosedTesting` — purpose-built for exactly this, with post templates and a swap culture
   - `r/TestMyApp`, `r/androidapps`
   - Read the subreddit rules before posting. Most require you to test others first or post in a specific format.
2. **☐ Then Telegram/Discord, if you need more people.** In Telegram search, try: `Google Play closed testing`, `closed testing exchange`, `14 days testers`. Judge a group by: is it active *today*, do people post real opt-in links, is there a rule about reciprocity, and is anyone asking for money? Leave any group that asks for payment.
3. **☐ Post like this:**
   > Closed testing swap — SmartSpeak, a 1-minute-a-day speaking practice app. Opt-in: `https://play.google.com/apps/testing/app.smartspeak.twa`. I'll test yours for the full 14 days, drop your link and I'll join. Australian timezone, responsive.

#### ⚠️ Risks to actually pay attention to

| Risk | Real? | What to do |
|---|---|---|
| **Someone copies the app** | **Low, but real.** Your entire app is a public website — anyone can view-source it today, without being a tester. Testing changes nothing. | Don't try to hide it. Your moat is iteration speed and the store listing/reviews, not the code. |
| **Someone clones the *store listing*** — same name, your screenshots | **Moderate.** This does happen with copycat devs. | Take the name on Play early (you have), and report impersonation via Play Console → Policy. Consider a trade mark only if it gets traction. |
| **A "tester service" gets your account flagged** | **High if you pay for testers.** | Don't buy testers. |
| **Malicious link in a Telegram group** | **Moderate.** Groups like these attract phishing. | Never enter your Google password anywhere except `accounts.google.com`. Never install an APK someone DMs you — only install through the Play Store link. |
| **Your `pro_unlock` paywall being bypassed** | **High — inherent to the architecture.** Entitlement is checked client-side in a web app; a determined user can bypass it. | Accept it for now. It's the standard trade-off for a TWA, and casual users won't. Revisit only if revenue justifies a server. |
| **Testers seeing your Netlify URL / repo** | Low. | Already handled — asset links hide the URL bar, and the repo has no secrets (keystore is git-ignored). |

**The honest summary:** the copying risk is much lower than it feels. A speaking-practice app's value is in the exercise design, the scoring model and the habit loop you keep refining — not in code someone can lift in an afternoon. Ship it.

**Tell your testers, word for word:**
> "Tap this link, tap Become a tester, install SmartSpeak, and open it a few times over the next two weeks. **Do not uninstall it and do not leave the tester program** — if you drop out, the 14-day counter resets and I can't launch."

9. Write the date you hit 12 opted-in testers on your calendar. **+14 days from that date** is the earliest you can apply for production.

### ☐ Step 12 — After 14 days

1. Left sidebar → **Test and release** → **Production** → **Create new release**.
2. Add the build from library, add release notes, submit for review.
3. Review takes anywhere from a few hours to 7 days for a first submission.

---

---

## PART 6.5 — 🚨 YOUR APP IS CONFIGURED AS A PAID APP. FIX THIS FIRST.

Your store listing shows **"$13.99 Buy"** instead of "Install". That single setting explains every symptom you're seeing, and it contradicts the whole product design.

### What's actually wrong

SmartSpeak was built as a **free app with a $10 in-app purchase** (`pro_unlock`): 3 free reps, then pay to unlock the rest. That logic is in `lib/entitlement.ts` and it's the model the whole app is designed around.

But in Play Console the **app itself** is priced at $13.99. So right now:

- Nobody can install it without paying $13.99 up front.
- The free preview is unreachable — there is no free tier at all.
- If you later activate `pro_unlock`, you'd be charging **$13.99 + $10** for the same thing.

### Why each symptom happens

| What you saw | Cause |
|---|---|
| Brother sees a **$13.99 Buy** button, not Install | The app is paid |
| Brother is "**You are a tester**" but nothing installs | [Closed-test testers of a **paid** app must still buy it](https://support.google.com/googleplay/android-developer/answer/9845334) — enrolling doesn't waive the price |
| **"Price is out of date"** error on purchase | Play Store client-side cache glitch. Real, but irrelevant — it's failing on a purchase that shouldn't exist |
| **It works fine for you** | You're the developer account — you get your own app without paying |

### ☐ Step A — Get your brother unblocked in the next 5 minutes (no permanent change)

[Testers of a paid app **can** install free via **internal** testing](https://support.google.com/googleplay/android-developer/answer/9845334) — that's the exception. So:

1. ☐ Play Console → **Test and release** → **Testing** → **Internal testing** → **Testers** tab.
2. ☐ Add your brother's Google account email to the internal tester list → **Save changes**.
3. ☐ Send him the **internal testing** opt-in link from that same page (not the closed-testing one).
4. ☐ He opens it → **Become a tester** → **Download it on Google Play**.
5. ✅ **Done when:** it installs with no payment prompt.

> Have him force-stop the Play Store first (Settings → Apps → Google Play Store → Force stop) to clear that "Price is out of date" cache.

### ☐ Step B — Set the app to Free (the actual fix)

> ### ⚠️ THIS IS PERMANENT AND CANNOT BE UNDONE.
> [Once an app has been offered for free, it can never be changed back to paid](https://support.google.com/googleplay/android-developer/answer/6334373). The only way back would be publishing a brand-new app under a different package name, losing your listing, reviews and testers.
>
> **In your case this is exactly what you want** — free + in-app purchase was always the plan. But read the sentence above twice before you click, because there is no second chance.

1. ☐ Play Console → **Monetise** → **App pricing**.
2. ☐ Click **Set as free** (or **Change to free**).
3. ☐ Read Google's confirmation dialog. It will tell you this is irreversible. Confirm.
4. ☐ Wait up to a few hours for the listing to update — the "Buy" button won't disappear instantly.
5. ✅ **Done when:** the store page shows **Install** instead of a price.

**You do not need a payments profile for this.** Free apps don't require a merchant account — so this step is *not* blocked by the thing that blocked `pro_unlock` in Step 10.

### After it's free

- Testers install normally, and closed testing works as documented in Step 11.
- Your revenue comes from `pro_unlock` at $10 once the payments profile is verified (Step 10).
- Nothing in the app code needs to change — `lib/entitlement.ts` already assumes free + IAP.

> **Where did $13.99 come from?** Probably an auto-converted USD price from an AUD figure, or a default set during onboarding. Either way it's about to be irrelevant.

---

## PART 7 — How to ship changes after launch

**The single most useful thing to understand about this app:** SmartSpeak is a **TWA** — the Android app is a thin native shell around the live website at `smartspeak-app.netlify.app`. That splits every future change into two very different categories.

| Change type | How it ships | Play upload needed? | Time to reach testers |
|---|---|---|---|
| Anything in the web app — screens, layout, colours, copy, scoring logic, bug fixes, new exercises | `git push` → Netlify auto-deploys | ❌ **No** | ~2 min |
| `assetlinks.json` (signing fingerprints) | `git push` → Netlify | ❌ **No** | ~2 min |
| Splash screen, app icon, app name, permissions, Play Billing config, target SDK | Rebuild the `.aab` → upload to Play | ✅ **Yes** | Hours (Play review) |

So ~95% of what you'll ever change needs **no Play release at all**. That is the big advantage of the TWA approach and it means you are not blocked by review turnaround for product iteration.

### How the automatic deploy actually works

There are four separate things and they chain together. Nobody clicks anything in Netlify.

```
1. I edit files on your PC          (C:\Users\lahog\ClaudeCode\SmartSpeak)
        ↓  git commit + git push
2. GitHub                            (github.com/TomLaho/SmartSpeak, branch: main)
        ↓  webhook — GitHub tells Netlify "main changed"
3. Netlify                           builds the site, publishes it (~2 min)
        ↓
4. smartspeak-app.netlify.app        now serving the new version
        ↓
5. Your Android app                  loads that URL — so it's updated too
```

**Netlify is watching your GitHub repo.** When you connected the site, Netlify installed a webhook on the repo. Every push to `main` fires it, Netlify pulls the code, runs `npm run build`, and publishes the result. That's why your dashboard showed a deploy 30 minutes ago — that was my `git push`, nothing more. You never need to open Netlify.

**On your free-tier concern — you're not spending "credits" per update.** Netlify's free tier limits are:

| Limit | Free tier | What SmartSpeak uses |
|---|---|---|
| Build minutes | 300 / month | ~1–2 min per deploy → ~150+ deploys/month available |
| Bandwidth | 100 GB / month | Tiny — it's a small static site |
| Sites / deploys | Unlimited | — |

The one to watch is **build minutes**, not deploy count. At ~1–2 minutes a build you'd need well over a hundred deploys in a month to run out, and I batch changes into single pushes rather than pushing per edit. Realistically you will not come close.

☐ If you want to keep an eye on it: Netlify → your team → **Billing** → **Usage**. It resets monthly.

> One genuine cost to know about: a failed build still consumes build minutes. That's another reason I run `npm run build` locally before pushing — a broken push would burn minutes and leave the live site stale.

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

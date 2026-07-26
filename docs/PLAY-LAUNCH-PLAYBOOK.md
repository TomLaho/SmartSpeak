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
| Digital asset links (kills the URL bar) | ⚠️ Half done — needs Google's key after upload (Step 8) |
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
| `C:\Users\lahog\ClaudeCode\smartspeak-twa\app\build\outputs\bundle\release\app-release.aab` | ✅ **THIS ONE.** The good build. |
| `C:\Users\lahog\ClaudeCode\SmartSpeak\Google Play package\SmartSpeak.aab` | ❌ **NEVER.** Old broken build — microphone doesn't work. |

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

### ☐ Step 2 — Copy the .aab somewhere easy to find (1 min)

1. In File Explorer, paste this into the address bar:
   ```
   C:\Users\lahog\ClaudeCode\smartspeak-twa\app\build\outputs\bundle\release
   ```
2. Copy **`app-release.aab`** to your **Desktop**.
3. ✅ **Done when:** `app-release.aab` (about 3.3 MB) is sitting on your Desktop.

---

## PART 2 — Play Console

Open https://play.google.com/console in Chrome and sign in. Select the **SmartSpeak** app.

> **Orientation:** the left-hand sidebar is your map. Everything below tells you exactly which sidebar item to click. If you get lost, click the app name at the top-left to get back to the app dashboard.

### ☐ Step 3 — Upload the build to Internal testing (10 min)

1. Left sidebar → **Test and release** → **Testing** → **Internal testing**.
2. Top-right → blue **Create new release** button.
3. You'll see a box labelled **App bundles**. Drag `app-release.aab` from your Desktop into it. Wait for the upload bar to finish (~30 seconds).
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
3. ⚠️ **Expected FAIL right now =** a thin bar showing `smartspeak-app.netlify.app`. **This is normal at this stage** — Step 8 fixes it. Don't panic.

---

## PART 4 — Kill the URL bar for real

### ☐ Step 8 — Send Claude the Google signing fingerprint (5 min)

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

> **Data safety hint:** SmartSpeak records audio. Declare that you collect audio, state whether it leaves the device, and that it's used for app functionality. Be accurate — a false declaration here gets apps pulled.

### ☐ Step 10 — Create the `pro_unlock` product (10 min)

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
5. **Testers** tab → **Create email list** → name it `Closed testers` → add **12+ Google account email addresses** (use 14–15 for safety margin in case someone drops out).
6. **Save changes**, tick the list, **Save changes**.
7. Copy the opt-in link and send it to all 12 people.
8. ✅ **Done when:** 12 people have opened the link and tapped **Become a tester**.

**Tell your testers, word for word:**
> "Tap this link, tap Become a tester, install SmartSpeak, and open it a few times over the next two weeks. **Do not uninstall it and do not leave the tester program** — if you drop out, the 14-day counter resets and I can't launch."

9. Write the date you hit 12 opted-in testers on your calendar. **+14 days from that date** is the earliest you can apply for production.

### ☐ Step 12 — After 14 days

1. Left sidebar → **Test and release** → **Production** → **Create new release**.
2. Add the build from library, add release notes, submit for review.
3. Review takes anywhere from a few hours to 7 days for a first submission.

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

1. **Step 1** — back up the key (5 min, irreversible if skipped)
2. **Step 3** — upload the .aab
3. **Step 5** — privacy URL
4. **Step 8** — send Claude the signing SHA-256
5. **Step 11** — start the closed test with 12 testers ← *starts the 14-day clock*

Everything else can happen during the 14 days.

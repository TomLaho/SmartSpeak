# Upload Key Rotation Playbook

**Why**: this repo is public and the old keystore password leaked in commit `2407158`. The keystore file itself was never committed — only the password. Play App Signing is ON, so the upload key is replaceable and the app is not lost; Google's app-signing key never changes.

## Status

> **Updated 09/09/2026.** Most of this is already done — Tom worked Phases 0–2 on 02/08 and it wasn't
> recorded anywhere, which cost a day of confusion when Play rejected a bundle signed with the old key.
> Read the status table before following any step below.

| Phase | Task | Status |
|---|---|---|
| 0 | Pick new password, save to password manager first | ✅ Done 02/08 — password is ONLY in Tom's password manager; verified on 09/09 that the old leaked password does **not** open the new keystore |
| 1 | Generate new keystore + export PEM | ✅ Done 02/08 — `android/smartspeak-upload-2.keystore` (alias `smartspeak2`) + `android/upload_certificate.pem` |
| 2 | Request upload key reset in Play Console | ✅ Done — confirmed 09/09: Play's rejection names `ED:E8:65:AB…1C:9F` as the expected certificate, which is exactly this keystore |
| 3 | Point build.gradle at new key, rebuild, upload | ⚠️ **In progress** — `android/app/build.gradle` now reads `android/keystore.properties` (git-ignored) and names `smartspeak-upload-2.keystore` / alias `smartspeak2`. Needs the password to build. |
| 4 | Update assetlinks.json, push, verify LIVE file | ✅ Done 09/09 — `ED:E8…` added, pushed, verified live |
| 5 | Delete old keystore | ☐ **Outstanding** — blocked on Phase 3 |
| 6 | Drop the dead fingerprint from assetlinks.json | ☐ **Outstanding** — `58:5F:7C…56:98` is the leaked key and is still listed. Safe to remove once no test device has a build signed with it. Not urgent, but don't leave it forever. |
| 7 | Re-check the leaked password isn't reused elsewhere | ☐ **Outstanding** — `SmartSpeak2024!` is public in commit `2407158`. It no longer opens anything in this project; make sure it doesn't open anything in another. |
| 8 | Change the upload keystore 2 password | ☐ **Outstanding, low urgency** — it was shared into a Claude session transcript on 09/09 to unblock the build, and it sits in `android/keystore.properties` (git-ignored). The keystore file itself has never left this machine, so exposure is low. `keytool -storepasswd -keystore smartspeak-upload-2.keystore` changes it with no Play reset required — the certificate is unchanged, so nothing in Play Console or assetlinks needs touching. |

### The two fingerprints that matter

| Key | SHA-256 | Use |
|---|---|---|
| Upload key 2 — **current** | `ED:E8:65:AB:5A:03:3E:09:74:07:A8:DB:16:CF:34:21:28:F8:9D:C4:41:89:D6:C3:E3:AA:90:49:59:48:1C:9F` | Sign every bundle with this |
| Upload key 1 — dead, leaked | `58:5F:7C:A8:ED:AC:8F:36:C4:C0:1E:BF:58:1F:32:2F:73:25:8A:20:CF:50:D5:B6:58:ED:23:CD:15:2B:56:98` | Never sign with this again |
| Google app-signing key | `A9:9C:E7:CF:51:D6:3E:82:D9:92:B8:A5:E7:30:DA:9E:D5:1D:53:B5:5B:76:39:9A:12:3B:2B:68:C7:16:3C:1E` | Never changes; what Play-installed apps carry |

Before blaming anything else for a signing failure, run this and compare against the table:

```powershell
keytool -printcert -jarfile C:\Users\lahog\Desktop\SmartSpeak-publish-v5.aab
```

---

## Phase 0 — Before you touch anything

☐ **Step 0.1** — Open your password manager and create a new entry now, before generating anything, titled something like `SmartSpeak upload keystore 2`.
**Done when:** the entry exists and is empty/placeholder, ready for you to paste the real password into in Step 0.2.

☐ **Step 0.2** — Generate a strong password (your password manager's generator is fine) and paste it into that new entry. Do not use the old leaked password.
**Done when:** the entry has a saved password value and you've copied it to clipboard for Phase 1.

> **Irreversible risk**: if you lose this password after generating the keystore in Phase 1, the new keystore is dead and you'll have to regenerate it and restart the reset request. Save it before you generate anything, not after.

☐ **Step 0.3** — Note mentally (or in the password manager entry) that `android\smartspeak-upload-2.keystore` must never be committed to git. Confirm `android/` is git-ignored.
**Done when:** you've run the check below and it returns the ignored path.

```powershell
cd C:\Users\lahog\ClaudeCode\SmartSpeak
git check-ignore -v android/smartspeak-upload-2.keystore
```
**If it errors / returns nothing**: `android/` is not actually ignored — stop and add it to `.gitignore` before proceeding to Phase 1.

---

## Phase 1 — Generate the new keystore + export the PEM

☐ **Step 1.1** — Open PowerShell and move to the android directory.
```powershell
cd C:\Users\lahog\ClaudeCode\SmartSpeak\android
```
**Done when:** the prompt shows `...\SmartSpeak\android>`.

☐ **Step 1.2** — Run the keystore generation command.
```powershell
keytool -genkeypair -v -keystore smartspeak-upload-2.keystore -alias smartspeak2 -keyalg RSA -keysize 4096 -validity 10000
```
**If it errors with `'keytool' is not recognized`**: use the full path instead:
```powershell
& "C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot\bin\keytool.exe" -genkeypair -v -keystore smartspeak-upload-2.keystore -alias smartspeak2 -keyalg RSA -keysize 4096 -validity 10000
```
**Done when:** the command starts prompting for input (see next step).

☐ **Step 1.3** — When prompted `Enter keystore password:`, paste the password you saved in Step 0.2, press Enter.
**Done when:** it prompts `Re-enter new password:`.

☐ **Step 1.4** — Paste the same password again, press Enter.
**Done when:** it moves on to `What is your first and last name?`.

☐ **Step 1.5** — Answer the identity prompts. Type `SmartSpeak` for first and last name, then press Enter through every remaining org/city/state/country field (they're cosmetic, not functional).
**Done when:** it prints a summary block like `CN=SmartSpeak, OU=Unknown, O=Unknown, ...` and asks `Is CN=SmartSpeak, ... correct?`.

☐ **Step 1.6** — Type `yes` and press Enter. When it then asks `Enter key password for <smartspeak2>`, press Enter on its own to reuse the keystore password — this matches your current setup where store password == key password.
**Done when:** you're back at `...\android>` and this returns `True`:

```powershell
Test-Path .\smartspeak-upload-2.keystore
```

☐ **Step 1.7** — Export the certificate as PEM for the Play Console upload.
```powershell
keytool -export -rfc -keystore smartspeak-upload-2.keystore -alias smartspeak2 -file upload_certificate.pem
```
It will ask for the keystore password — paste it, press Enter.
**Done when:** it prints `Certificate stored in file <upload_certificate.pem>` and the file exists:
```powershell
Test-Path .\upload_certificate.pem
```

☐ **Step 1.8** — Read the new SHA-256 fingerprint — you'll need it in Phase 4.
```powershell
keytool -list -v -keystore smartspeak-upload-2.keystore -alias smartspeak2
```
**Done when:** you see a line starting `SHA256:` followed by a colon-separated hex fingerprint. Copy the whole thing into the Phase 0 password manager entry (or a notes doc) so you don't lose it.

---

## Phase 2 — Request the upload key reset in Play Console

☐ **Step 2.1** — Go to Play Console in your browser.
```
https://play.google.com/console
```
**Done when:** you land on the app dashboard.

☐ **Step 2.2** — Select the SmartSpeak app.
**Done when:** you're inside the SmartSpeak app's console view.

☐ **Step 2.3** — Navigate: Left sidebar → **Test and release** → **Setup** → **App integrity** → **App signing** tab.
**Done when:** you see a page showing "App signing key certificate" and "Upload key certificate" sections.

☐ **Step 2.4** — Click **Request upload key reset**.
**Done when:** a form/dialog opens asking for a reason.

☐ **Step 2.5** — Select reason **"My upload key has been compromised"**.
**Done when:** the form shows an upload field for a new certificate.

☐ **Step 2.6** — Upload `upload_certificate.pem` from `C:\Users\lahog\ClaudeCode\SmartSpeak\android\`.
**Done when:** the file is attached and the form shows its filename.

☐ **Step 2.7** — Submit the request.
**If it errors on upload**: the PEM must be the RFC-format export from Step 1.7, not the raw keystore — re-run Step 1.7 if you picked the wrong file.
**Done when:** Play Console shows a "pending" or "in review" status for the upload key reset request.

> **Wait state — do not skip**: approval typically takes ~1–2 business days. **Until you see the reset marked approved, you must keep signing releases with the OLD keystore** (`smartspeak-upload.keystore` / alias `smartspeak`). A build signed with the new key before approval will be **rejected on upload** to Play Console. Do not touch `build.gradle` or `twa-manifest.json` yet — that's Phase 3, after approval.

---

## Phase 3 — After Google approves (blocked until Phase 2 is approved)

☐ **Step 3.1** — Check Play Console → **Test and release** → **Setup** → **App integrity** → **App signing** tab for approval status.
**Done when:** the upload key certificate shown matches the new key's fingerprint from Step 1.8.

☐ **Step 3.2** — Open `android\app\build.gradle`.
**Done when:** the file is open in your editor.

☐ **Step 3.3** — In `signingConfigs.release`, update the four values to point at the new keystore:
- `storeFile` → `smartspeak-upload-2.keystore`
- `storePassword` → new password from Step 0.2
- `keyAlias` → `smartspeak2`
- `keyPassword` → new password from Step 0.2

**Done when:** all four fields reference the new keystore, not the old one.

☐ **Step 3.4** — Open `android\twa-manifest.json` and replace the `signingKey` block (currently at line 19) with exactly this:
```json
  "signingKey": {
    "path": "./smartspeak-upload-2.keystore",
    "alias": "smartspeak2"
  },
```
**Done when:** the file is saved and both files agree on keystore name and alias.

☐ **Step 3.5** — Rebuild the release bundle using your normal TWA/Bubblewrap build command.
**Done when:** the build completes without signing errors and produces a signed `.aab`.

☐ **Step 3.6** — Upload the new `.aab` to Play Console (internal testing track first, not production).
**If it errors "upload key certificate mismatch"**: the reset hasn't actually been approved yet, or `build.gradle` still points at the old keystore — re-check Step 3.1 and Step 3.3.
**Done when:** Play Console accepts the upload with no signing errors.

---

## Phase 4 — Update assetlinks.json

☐ **Step 4.1** — Open `public\.well-known\assetlinks.json`.
**Done when:** you see two fingerprint entries — entry 1 (upload key) and entry 2 (Google app-signing key).

☐ **Step 4.2** — Replace **only entry 1's** `sha256_cert_fingerprints` value, from:
```
58:5F:7C:A8:ED:AC:8F:36:C4:C0:1E:BF:58:1F:32:2F:73:25:8A:20:CF:50:D5:B6:58:ED:23:CD:15:2B:56:98
```
to the new SHA-256 you copied in Step 1.8.

**Do not touch entry 2** (`A9:9C:E7:CF:51:D6:3E:82:D9:92:B8:A5:E7:30:DA:9E:D5:1D:53:B5:5B:76:39:9A:12:3B:2B:68:C7:16:3C:1E`) — that's Google's app-signing key and is what makes Play-installed builds work. Touching it breaks every Play-installed copy of the app.

**Done when:** entry 1 shows the new fingerprint and entry 2 is unchanged.

☐ **Step 4.3** — Commit and push the change to main.
```powershell
cd C:\Users\lahog\ClaudeCode\SmartSpeak
git add public/.well-known/assetlinks.json
git commit -m "Rotate upload key fingerprint in assetlinks.json"
git push
```
**Done when:** the push completes with no errors.

☐ **Step 4.4** — Verify the LIVE file, not just the push. Netlify has not been publishing pushes to main since 30/07/2026 — do not assume this shipped.
```powershell
curl.exe https://smartspeak-app.netlify.app/.well-known/assetlinks.json
```
**Done when:** the output shows the NEW fingerprint in entry 1.
**If it still shows the OLD fingerprint**: Netlify hasn't published the deploy. Check the Netlify dashboard deploy log for this push before doing anything else — do not re-push repeatedly assuming it'll fix itself. Cross-reference the `Netlify not deploying` issue (deploys have been silently failing to publish since 30/07).

---

## Phase 5 — Clean up (irreversible)

☐ **Step 5.1** — Confirm a release built with the NEW key has been accepted by Play Console (internal testing track showing the new build live) before doing anything in this phase.
**Done when:** you can see the new build listed under a release track in Play Console.

☐ **Step 5.2** — Delete or archive the old keystore file `android\smartspeak-upload.keystore`.

> **Irreversible**: once deleted, you cannot sign any build with the old key again. Only do this after Step 5.1 is confirmed — if the new key turns out to be broken somehow and you need to fall back, you lose that option here. Archiving (move out of the repo folder to a backup location) is safer than deleting outright if you want a rollback safety net.

**Done when:** `android\smartspeak-upload.keystore` no longer exists in the working directory (or has been moved to your archive location), and `android\smartspeak-upload-2.keystore` is the only keystore referenced by `build.gradle` and `twa-manifest.json`.

---

## If you only do 3 things today

1. ☐ Phase 0: save a new password to your password manager first.
2. ☐ Phase 1: run the three keytool commands to generate the new keystore and PEM.
3. ☐ Phase 2: submit the upload key reset request in Play Console with reason "My upload key has been compromised" — then wait for approval before touching any config files.

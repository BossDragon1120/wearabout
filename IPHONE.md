# WearAbout on iPhone (App Store and TestFlight)

The iPhone app is the same WearAbout web app, packaged with [Capacitor](https://capacitorjs.com).
Everything you change in the app (via Claude) shows up in both the website and the iPhone app.
The website updates by itself; the iPhone app needs a new build in Xcode each time.

## What you need
- A Mac with **Xcode** (free in the Mac App Store, about 10 GB). Open it once and let it install its extras.
- **Node.js** (the "LTS" version from [nodejs.org](https://nodejs.org)).
- **GitHub Desktop** ([desktop.github.com](https://desktop.github.com)) to download the code.
- Your iPhone and its cable.
- For TestFlight, the App Store, and notifications: the **Apple Developer Program** ($99/year, [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll)). You can try the app on your own phone before enrolling.

## 1. Get the code (once)
1. Open GitHub Desktop and sign in.
2. **File → Clone Repository → `BossDragon1120/wearabout`** → Clone. It lands in `Documents/GitHub/wearabout`.

To get my latest changes later: open GitHub Desktop and click **Fetch origin**, then **Pull origin**.

## 2. Open it in Xcode
1. Open **Terminal** (press ⌘-Space, type Terminal, press Return).
2. Paste these two lines and press Return after each:
   ```
   cd ~/Documents/GitHub/wearabout
   npm install
   ```
3. Then, every time you want to build:
   ```
   npm run ios
   ```
   This copies the latest app into the iPhone project and opens Xcode. The first time, Xcode spends a minute or two downloading packages (bottom of the left panel).

## 3. Run it on your iPhone
1. iPhone: **Settings → Privacy & Security → Developer Mode → On** (it restarts). Plug the phone into the Mac and tap **Trust**.
2. Xcode: click **App** at the top of the left panel → **Signing & Capabilities** tab.
   - Tick **Automatically manage signing**.
   - **Team**: choose your name (add your Apple ID under Xcode → Settings → Accounts if it's not there).
   - If it says the bundle identifier is taken, change `com.wearaboutapp.wearabout` to something unique, like `com.yourname.wearabout`, and tell Claude so the server matches.
3. At the top of the window, pick your iPhone as the device, then press **▶ Run**.
4. First time only, on the iPhone: **Settings → General → VPN & Device Management →** your name **→ Trust**.

## 4. Notifications (after you enroll)
1. Xcode → **Signing & Capabilities → + Capability → Push Notifications**.
2. [developer.apple.com/account/resources/authkeys/list](https://developer.apple.com/account/resources/authkeys/list) → **+** → name it "WearAbout push", tick **Apple Push Notifications service (APNs)** → Continue → Register → **Download** the `.p8` file (you can only download it once; keep it safe). Note the **Key ID**.
3. Your **Team ID** is at [developer.apple.com/account](https://developer.apple.com/account) → Membership details.
4. Supabase → **Edge Functions → Secrets** → add:
   | Name | Value |
   |---|---|
   | `APNS_KEY_ID` | the Key ID |
   | `APNS_TEAM_ID` | your Team ID |
   | `APNS_KEY` | open the .p8 file in TextEdit and paste everything, including the BEGIN/END lines |
   | `APNS_BUNDLE_ID` | `com.wearaboutapp.wearabout` (or the one you chose) |
   | `APNS_SANDBOX` | `true` while you run from Xcode; delete it (or set `false`) for TestFlight and the App Store |
5. In the app: Friends → your row → **Turn on notifications**.

## 5. TestFlight (share the app with testers)
1. [App Store Connect](https://appstoreconnect.apple.com) → **Apps → + → New App**: platform iOS, name **WearAbout**, bundle ID from step 3, SKU `wearabout`.
2. Xcode: choose **Any iOS Device (arm64)** as the device → **Product → Archive** → when it finishes, **Distribute App → App Store Connect → Upload**.
3. After about 15 minutes, App Store Connect → your app → **TestFlight**. Add yourself as an internal tester, then create an external group and add testers by email (Apple does a quick review of the first external build).
4. Testers install the **TestFlight** app from the App Store and tap your invite.

Each new build: in Xcode, raise **Build** by 1 (App → General → Identity), then Archive and upload again.

## 6. App Store submission checklist
- **Age rating: 18+** (answer the questionnaire; say yes to user-generated content).
- **Privacy Policy URL**: https://bossdragon1120.github.io/wearabout/privacy.html
- **Support URL**: https://bossdragon1120.github.io/wearabout/support.html
- **App Privacy** ("nutrition label"): data linked to the user: email, name, photos, user content (fit details, captions, posts), phone number (optional), other user content. Not used for tracking. Used for app functionality.
- **Review notes**: give Apple a test account. Apple can't receive your email codes, so create a test account that Claude can set up with a fixed code, or provide an email inbox they can use.
- **Screenshots**: 6.9-inch iPhone (1320 × 2868). Claude can make these.

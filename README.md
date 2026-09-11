# Study Ledger — Install to your phone

This is a standalone web app. All your data (sessions, weekly target,
badges) is stored in your phone's browser storage — nothing is sent
anywhere, so it works offline once installed.

## Step 1 — Put the files online (needed once)

Phones can't "install" an app straight from a zip file, so the files
need a web address first. The easiest free way, no account needed:

1. Unzip this folder on your computer.
2. Go to https://app.netlify.com/drop in a browser.
3. Drag the unzipped **study-ledger-app** folder onto the page.
4. Netlify gives you a link like `https://random-name-123.netlify.app`.
   That's your app's permanent address — open it on your phone.

(Alternatives if you prefer: GitHub Pages, Vercel, or any static host —
the folder just needs to be served as-is, with index.html at the root.)

## Step 2 — Install on your phone

**iPhone (Safari):**
1. Open your Netlify link in Safari.
2. Tap the Share icon (square with an arrow).
3. Tap "Add to Home Screen" → Add.

**Android (Chrome):**
1. Open your Netlify link in Chrome.
2. Tap the ⋮ menu.
3. Tap "Install app" (or "Add to Home screen").

The app now opens full-screen from your home screen icon, works
offline, and stores everything locally on your device.

## About reminders

Tap "Enable" on the notifications banner inside the app to allow
alarms. Because this is a web app (not built through an app store),
alarms only fire reliably while the app is open or recently active in
the background — iOS in particular will not wake a closed app to
sound an alarm. If you later want alarms that fire even when the app
is fully closed, that requires a native app instead of a web app.

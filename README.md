# InstaSave Studio

A responsive, installable PWA frontend with a Cloudflare Pages Function backend adapter for a **self-hosted Cobalt-compatible API**.

## What works in this repository

- Paste Instagram Reel, post, photo, video or carousel links.
- No intermediate redirect page inside the app: results are shown inline.
- Requests `videoQuality: "max"` and does not re-encode media in the frontend.
- Android Web Share Target support: share a link from Instagram to the installed PWA.
- Permission-gated clipboard detection when the app is opened/focused; manual Paste is always available.
- Offline app shell (download requests still require internet/backend).
- Cloudflare Pages Function at `/api/download`.

## Important limits

Instagram does not offer an unrestricted official API for downloading arbitrary posts. This project does **not** bypass private accounts, login walls, DRM, or access controls. Use it only for media you own or are authorized to save, and respect creators' rights and Instagram's terms.

A browser/PWA cannot continuously watch the clipboard in the background. Browsers restrict clipboard reads for privacy; this app checks on focus where permitted and provides a Paste button. The Android Share Target is the reliable one-tap workflow after installation.

Original quality means the best source file the backend can access. It cannot restore quality absent from the source. `videoQuality: "max"` is a request to the configured extractor, not a guarantee that Instagram exposes an original master.

## 1. Configure the backend

The frontend is static, but Instagram media extraction requires a backend. The included Pages Function forwards requests to a Cobalt-compatible API you control.

1. Deploy your own Cobalt API using the official project instructions: https://github.com/imputnet/cobalt
2. In Cloudflare Pages, open **Settings → Variables and Secrets**.
3. Add:
   - `COBALT_API_URL` = base URL of your own Cobalt API (no trailing slash required).
   - `COBALT_API_KEY` = optional authorization value if your instance requires it. Store it as a secret.
4. Redeploy the Pages project.

Do not point this at random public API instances. Public instances may prohibit third-party use, impose rate limits, or change without notice. Never put an API key in `app.js`.

## 2. Deploy to Cloudflare Pages

1. Push this folder to a GitHub repository.
2. In Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Select the repository.
4. Framework preset: **None**. Build command: leave blank. Build output directory: `/` (repository root).
5. Deploy, then add the backend variables above and redeploy.

Pages Functions are deployed automatically from the root-level `functions/` directory. See https://developers.cloudflare.com/pages/functions/get-started/.

## 3. Run locally

Install Node.js, then:

```bash
npm install -g wrangler
wrangler pages dev .
```

Set local secrets in a `.dev.vars` file (do not commit it):

```dotenv
COBALT_API_URL=https://your-own-cobalt-host.example
COBALT_API_KEY=
```

## 4. Install on Android

- Open the HTTPS Cloudflare Pages URL in Chrome on Android.
- Use Chrome menu → **Install app** or **Add to Home screen**.
- In Instagram, open a post → Share → choose InstaSave Studio. If it does not appear, update Chrome, install the PWA first, and check the Android share sheet's app list.

Web Share Target support varies by browser and Android version. Instagram may share a URL, caption, or both; the app extracts the Instagram URL where possible.

## 5. Build an APK

This project is a PWA. For an APK, package the deployed HTTPS PWA as a Trusted Web Activity (TWA) using Bubblewrap:

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://YOUR-DOMAIN/manifest.webmanifest
bubblewrap build
```

Follow Bubblewrap's prompts for Android package ID, signing key, app name and launcher icon. Publish `/.well-known/assetlinks.json` with the SHA-256 fingerprint of the APK signing certificate to verify the website/app association. Test the signed APK on a real Android device.

Google Antigravity is an IDE/agentic development environment, not an Android package format. You can open this repository in Antigravity and ask it to refine the UI or help run the Bubblewrap build.

## 6. GitHub Pages

GitHub Pages can host the static PWA frontend, but it cannot run the included `/functions/api/download.js` backend. For a working downloader, use Cloudflare Pages for both frontend and Function, or host the backend separately and adapt the API route.

## Troubleshooting

- **Backend not configured:** set `COBALT_API_URL` in Cloudflare Pages.
- **Unsupported response:** check that your API is a compatible current Cobalt instance and inspect its API version.
- **No media found:** the post may be private, age/region restricted, unavailable, deleted, or unsupported by the extractor.
- **Share target missing:** install the PWA from Chrome on Android over HTTPS; share-target availability is browser-dependent.

## Privacy

The app itself has no analytics, database, or media storage. The URL is sent to the backend you configure. Your backend/extractor may process the URL and media; review its privacy policy and hosting logs. The service worker caches only the app shell, never API responses.

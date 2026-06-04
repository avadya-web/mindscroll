# MindScroll — deploy it to your phone

A swipe-up feed that replaces doom-scrolling with philosophy, motivation, AI/tech,
science wonder, and mental models. Live content comes from ZenQuotes, Hacker News,
Wikipedia, and uselessfacts, with an offline curated fallback. Saved cards, your
streak, and a "seen" set (so nuggets don't repeat) all persist in the browser.

You do NOT need to install developer tools if you use the GitHub → Vercel path below.
The deploy is easiest on a computer; the finished app installs on your phone.

---

## Path A — GitHub → Vercel (recommended, no tools to install)

### 1. Put these files on GitHub
1. Make a free account at https://github.com and click **New repository**.
2. Name it `mindscroll`, keep it Public, click **Create repository**.
3. On the new repo page, click **uploading an existing file**.
4. Drag in EVERYTHING from this folder EXCEPT the `node_modules` and `dist` folders
   (they're rebuilt automatically). You want: `index.html`, `package.json`,
   `vite.config.js`, `.gitignore`, the `src/` folder, and the `public/` folder.
5. Click **Commit changes**.

### 2. Deploy with Vercel
1. Go to https://vercel.com and **Sign up with GitHub** (free).
2. Click **Add New… → Project**, then **Import** your `mindscroll` repo.
3. Vercel auto-detects Vite. Don't change anything — click **Deploy**.
4. Wait ~1 minute. You'll get a live HTTPS link like `https://mindscroll-xxx.vercel.app`.

(Netlify works identically: https://app.netlify.com → Add new site → Import from GitHub.)

### 3. Install it on your phone
Open the Vercel link in your phone's browser, then:

- **iPhone (Safari):** tap the **Share** button → **Add to Home Screen** → **Add**.
- **Android (Chrome):** tap the **⋮** menu → **Add to Home screen** / **Install app**.

It now lives on your home screen with its own icon and opens fullscreen — no browser
bars, just the feed. That's your app.

---

## Path B — run/build locally (only if you want to tinker)

Requires Node.js 18+ (https://nodejs.org). In this folder:

```bash
npm install
npm run dev      # live preview at http://localhost:5173
npm run build    # outputs a /dist folder you can drag onto netlify.com/drop
```

---

## Good to know

- **Persistence:** streak, saved cards, and the no-repeat set are stored on the
  device/browser via localStorage. They stay between sessions but don't sync across
  devices.
- **The "More ideas" button** pulls a fresh live batch on demand (no backend needed).
- **Want AI-written cards back?** That needs a tiny serverless function to hold your
  API key safely (you can't put a key in front-end code). When ready, add an
  `/api/generate` function, point `generate()` at it, and flip `USE_AI = true` at the
  top of `src/App.jsx`.
- **If a source is ever down or blocked,** that card type silently falls back to the
  built-in curated library, so the feed never breaks.

## Make it yours
Everything lives in `src/App.jsx`:
- `THEMES` — category colors/gradients.
- `LIBRARY` — the curated offline cards (and the Mental Models category).
- `HN_Q` — the AI/tech search terms pulled from Hacker News.
- `srcQuotes / srcTech / srcWonder` — the live source fetchers.

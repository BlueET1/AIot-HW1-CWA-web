@AGENTS.md

# Project context

Taiwan real-time weather map. Next.js 16 (App Router) + TypeScript + Tailwind v4 + MapLibre GL, deployed on Vercel (Root Directory: repo root, no subfolder). Live at https://a-iot-hw-1-cwa.vercel.app/.

This was split out of a separate coursework repo (`AIot-HW1-CWA`, a Streamlit app on Streamlit Cloud, unrelated tech stack) into its own repo/folder so the two could be managed independently. Don't merge them back or assume files from that repo exist here.

`CWA_API_KEY` lives in `.env.local` locally and in Vercel's Environment Variables in production — server-side only (Next.js Route Handlers under `app/api/*`), never prefixed with `NEXT_PUBLIC_`. A CWA key was leaked into a committed `.env.example` early in this project's history (in the old repo) and had to be rotated + the git history rewritten; keep keys out of tracked files.

## Non-obvious things worth knowing before touching `components/WeatherMap.tsx` or `components/WindParticleLayer.tsx`

- **The map container must use inline `style={{position:"absolute",inset:0}}`, not Tailwind's `absolute inset-0` class.** MapLibre adds `.maplibregl-map` to that element, and its *unlayered* `position: relative` beats Tailwind v4's `.absolute` (which lives in `@layer utilities` — unlayered CSS always wins over layered CSS regardless of source order). Using the Tailwind class collapses the container to height 0: everything renders successfully into a zero-pixel viewport, so there are no errors, no failed requests, nothing — just a black screen. This is genuinely invisible from build logs, curl, or asset checks; it only shows up if you actually load the page and read back element geometry (or eyeball a screenshot).
- **`public/maplibre-gl-worker.mjs` and `public/maplibre-gl-shared.mjs` are vendored copies from `node_modules/maplibre-gl/dist/`, and `WeatherMap.tsx` calls `setWorkerUrl("/maplibre-gl-worker.mjs")` before creating any Map.** MapLibre loads its Worker via `new URL('./maplibre-gl-worker.mjs', import.meta.url)`, and neither Turbopack nor webpack serves that file (plus its relative `./maplibre-gl-shared.mjs` import) at a stable URL in production on Vercel — confirmed 404s in both bundler modes. Self-hosting sidesteps the bundler entirely. **When upgrading `maplibre-gl`, re-copy both files from the new version's `dist/` folder**, or the worker will silently mismatch the main bundle.
- **Wind particle speed is expressed as `SIM_SECONDS_PER_FRAME`** (lib/`WindParticleLayer.tsx`), not a generic multiplier — real-time wind speeds are imperceptible at map scale, so the animation runs at simulated time far faster than real time. If particles look frozen or barely moving after a change, check this constant, not the data.
- **Verify any visual/rendering change with an actual browser, not curl or a passing build.** A puppeteer script was used in the building session (page.evaluate to read element geometry + console errors + a saved screenshot) to catch the height-0 bug above after curl-based "verification" repeatedly gave false confidence. Recreate that rather than trusting `npm run build` succeeding or assets returning 200.

## Repo history note

This repo's `git log` starts from a single "Initial commit" — it was copied out of the old repo's `web/` subfolder rather than migrated with `git filter-repo`, so earlier iteration history (including the two bugs above being found and fixed) lives only in the old repo's commit log (`AIot-HW1-CWA`, commits around `2916298`/`232bc1a`), not here.

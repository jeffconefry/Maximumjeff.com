# maximumjeff.com

A website. Technically. One page: a flying pig towing a banner across a lawn, a shadow that actually follows the
depth of the background, and a donation button. Humor site.

Built on the same base as kittensandbongs.com and the new danielleroney.com (Astro 7.4 on Cloudflare Workers,
deployed by Workers Builds from GitHub), minus everything this site doesn't need.

## How the shadow works

```
background image + depth map
        │
        ▼
grid of vertices, each pushed back along its camera ray to its depth
        │            (from the camera: still a flat picture; to the light: real hills, a tree, a house)
        ▼
ShadowMaterial copy of that grid  ◄── directional light ◄── pig, wings, banner (letters cut out of its shadow)
```

All of it is in `src/scripts/scene.ts`. The background is generated in code from one scene description (ground plane,
hills, trees, Jeff HQ, the caution sign), so image and depth always agree. Visitors can also try their own photo plus
a depth map (footer link or drag and drop; nothing leaves the browser). A depth map from Depth Anything works:
bright = near.

### Compared with the kittensandbongs.com setup

| Piece | Here | Why |
|---|---|---|
| Astro 7.4 + `@astrojs/cloudflare` 14, Workers Builds on push to `main` | Same | Every page is prerendered; the adapter stays so a server route (Stripe Checkout, say) can be added later |
| Committed `wrangler.jsonc` (audit T4), `check` script (T6), Dependabot | Same, from day one | |
| `_headers`, CSP via `security.csp`, `robots.txt` gate on `PUBLIC_SITE_INDEXABLE` | Same | No middleware: there are no on-demand routes to send headers from |
| Self-hosted fonts | Same idea (Bricolage Grotesque, DM Mono via Fontsource) | CSP stays `'self'` only |
| Three.js | Bundled from npm (`three` 0.187) | No CDN, so nothing to allow in the CSP |
| D1, cron, email, Turnstile, Keystatic, R2 | Dropped | Nothing to store or edit |

## First-time setup

Build and push from a working copy with git and node_modules, not the Synology Drive mirror.

1. **Repo.** Clone `jeffconefry/Maximumjeff.com` and run `npm install`.
2. **Worker.** Workers & Pages → Create → import the repo. Build command `npm run build`,
   deploy command `npx wrangler deploy`, production branch `main`. Worker name is pinned to
   `maximumjeff-com` in `wrangler.jsonc`.
   - Build variables: `PUBLIC_DONATE_URL` (see below). Leave `PUBLIC_SITE_INDEXABLE` unset until launch.
   - The first deploy also creates a `SESSION` KV namespace automatically (the Astro adapter asks for it).
     It's unused and harmless.
3. **Donations.** Make a Stripe Payment Link (or Ko-fi, PayPal.me, Buy Me a Coffee) and set it as
   `PUBLIC_DONATE_URL`. If the provider takes an amount in the URL, put `{amt}` where it goes and each tier
   ($5 / $20 / $100) fills it in. Until it's set, the tiers show a "not hooked up yet" note instead of a link.
   Keep it on its own account, separate from studio payments.
4. **Launch.** Add `maximumjeff.com` to the Worker (Settings → Domains & Routes). Set
   `PUBLIC_SITE_INDEXABLE=true` and rebuild if you want search engines to list it.
5. **GitHub.** Settings → Code security: turn on Dependabot alerts (`.github/dependabot.yml` is already here).

## Commands

```
npm run dev       # http://localhost:4321
npm run build     # production build into dist/
npm run check     # type check
```

## Tweaking the jokes

Top of `src/scripts/scene.ts`: `TAGLINES` (the rotating sticker under the title), `BANNERS` (what the pig tows,
one per pass), `OINKS` (what it says when tapped). Donation tiers and their copy are in `src/pages/index.astro`.

## Files

```
astro.config.mjs          adapter, CSP
wrangler.jsonc            Worker name and compatibility date
public/_headers           security headers, long cache for /_astro/*
src/layouts/Base.astro    <head>, fonts, noindex until launch
src/pages/index.astro     the page: title, donate button and modal, footer
src/pages/404.astro       "This page flew away."
src/pages/robots.txt.ts   disallow-all until PUBLIC_SITE_INDEXABLE=true
src/scripts/scene.ts      background builder, depth → 3D, the pig, the banner, shadows, interaction
src/styles/global.css     all styles
```

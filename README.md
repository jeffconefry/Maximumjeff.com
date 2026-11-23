# maximumjeff.com

Rhino and Grasshopper scripts and 3D print models from studio fabrication work. One page: category tabs
(all · rhino · grasshopper · 3d prints) over a list of horizontal cards. Free items download from R2; paid scripts
and prints link out to a checkout. Design: the Maximum Jeff design system (warm graphite, mantis green, JetBrains Mono).

Same base as kittensandbongs.com and danielleroney.com: Astro 7.4 on Cloudflare Workers, deployed by Workers Builds
from GitHub.

## Adding an item

One Markdown file per item in `src/content/items/`. The frontmatter is the whole card:

```yaml
---
title: KnifeWeld
category: grasshopper          # rhino | grasshopper | prints
summary: One or two sentences on what it does.
specs: ['Rhino 8', 'Grasshopper', '.gh + .py']   # shown as one line, joined with ·
price: 40                      # USD; leave out for free items
file: knifeweld.zip            # free items: key in the maximumjeff-files R2 bucket
buyUrl: https://...            # paid items: Lemon Squeezy / Gumroad / Stripe Payment Link
image: ../../assets/items/knifeweld.jpg          # render or photo
imageAlt: KnifeWeld output on a shell mesh
order: 10                      # lower shows first
draft: false                   # true hides it
---
```

The button follows from that: free + `file` → **download**, paid + `buyUrl` → **buy**. Without the link it shows
"coming soon" / "not for sale yet". The five files there now are examples with [bracketed] placeholders; replace them.

### Uploading a free file

```
npx wrangler r2 object put maximumjeff-files/knifeweld.zip --file ./knifeweld.zip --remote
```

It's then live at `/dl/knifeweld.zip`. Everything in that bucket is public through `/dl/`, so never put paid files
there; the checkout service delivers those.

## Selling

- **Paid scripts:** Lemon Squeezy or Gumroad. Upload the file there, copy the product's checkout link into `buyUrl`.
  They handle delivery, license keys and sales tax.
- **Prints:** a Stripe Payment Link per product, with shipping rates set on the link. Put the link in `buyUrl` and the
  ship time in `specs`.
- Keep both on accounts separate from studio payments.

No server code is involved in either; the site only links out.

## Setup status

Done:
- [x] Repo, catalog page, content collection, tabs (linkable: `/#grasshopper`)
- [x] R2 bucket `maximumjeff-files` (created 2026-11-23) and its `FILES` binding in `wrangler.jsonc`
- [x] `/dl/<key>` download route, tested locally against a simulated bucket

To do (needs your Cloudflare dashboard):
1. **Worker.** Workers & Pages → Create → import `jeffconefry/Maximumjeff.com`. Build command `npm run build`,
   deploy command `npx wrangler deploy`, production branch `main`. The name `maximumjeff-com` and the R2 binding come
   from `wrangler.jsonc`. The first deploy also creates a `SESSION` KV namespace (the Astro adapter asks for it);
   unused and harmless.
2. **Domain.** Worker → Settings → Domains & Routes → add `maximumjeff.com` (and `www`).
3. **Launch.** Set the build variable `PUBLIC_SITE_INDEXABLE=true` and redeploy when you want search engines in.
4. **Footer.** Fill in the ship time and contact email in `src/pages/index.astro`.
5. **GitHub.** Settings → Code security: turn on Dependabot alerts.

## Commands

```
npm run dev         # http://localhost:4321
npm run build       # production build into dist/
npm run check       # type check
npm run cf-typegen  # regenerate worker-configuration.d.ts after changing wrangler.jsonc
```

Build and push from a working copy with git and node_modules, not the Synology Drive mirror.

## Files

```
astro.config.mjs             adapter, CSP
wrangler.jsonc               Worker name, compatibility date, R2 binding
worker-configuration.d.ts    generated binding types (npm run cf-typegen)
public/_headers              security headers, long cache for /_astro/*
src/content.config.ts        item schema
src/content/items/*.md       one file per item
src/assets/items/            renders and photos
src/layouts/Base.astro       <head>, fonts, noindex until launch
src/pages/index.astro        the catalog: header, tabs, cards, footer
src/pages/dl/[...key].ts     free downloads from R2
src/pages/404.astro          not found
src/pages/robots.txt.ts      disallow-all until PUBLIC_SITE_INDEXABLE=true
src/styles/global.css        all styles and design tokens
```

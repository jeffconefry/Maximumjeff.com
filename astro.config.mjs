// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Same base as kittensandbongs.com / danielleroney.com (Astro on Cloudflare Workers, Workers Builds from GitHub),
// minus everything this site doesn't need: no Keystatic, no R2, no database. Every page is prerendered;
// the adapter is here so a server route (say, a Stripe Checkout endpoint) can be added later without re-plumbing.
export default defineConfig({
  site: 'https://maximumjeff.com',
  trailingSlash: 'ignore',
  adapter: cloudflare({ imageService: 'passthrough' }),
  security: {
    // Astro writes a <meta> CSP with hashes for its own scripts and styles. Three.js and the fonts are bundled,
    // so nothing loads from another host. frame-ancestors is sent as a header from public/_headers.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self'",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
});

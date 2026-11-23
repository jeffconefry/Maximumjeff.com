import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Free downloads, streamed from the maximumjeff-files R2 bucket (binding FILES in wrangler.jsonc).
// Anything in the bucket is public at /dl/<key>, so keep paid files out of it: those are delivered by the
// checkout service.
export const prerender = false;

const KEY = /^[A-Za-z0-9][A-Za-z0-9._\-/]{0,200}$/;

export const GET: APIRoute = async ({ params }) => {
  const key = params.key ?? '';
  if (!KEY.test(key) || key.includes('..')) return new Response('Not found', { status: 404 });

  const bucket: R2Bucket | undefined = env.FILES;
  if (!bucket) return new Response('Downloads are not configured', { status: 503 });

  const obj = await bucket.get(key);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${key.split('/').pop()}"`);
  headers.set('Content-Length', String(obj.size));
  headers.set('ETag', obj.httpEtag);
  headers.set('Cache-Control', 'public, max-age=3600');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(obj.body, { headers });
};

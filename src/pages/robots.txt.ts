import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = () => {
  const indexable = import.meta.env.PUBLIC_SITE_INDEXABLE === 'true';
  const body = indexable ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

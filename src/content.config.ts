import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One Markdown file per offering in src/content/items/. The frontmatter is the whole card;
// the body is unused for now (room for a detail page later).
const items = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/items' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      category: z.enum(['rhino', 'grasshopper', 'prints']),
      summary: z.string(),
      // Short spec strings shown in one line under the summary, e.g. "Rhino 8", "STL + 3MF".
      specs: z.array(z.string()).default([]),
      // Price in USD. Leave it out for free items.
      price: z.number().positive().optional(),
      // Free items: the file's key in the maximumjeff-files R2 bucket, served at /dl/<file>.
      file: z.string().optional(),
      // Paid items: checkout link (Lemon Squeezy / Gumroad for scripts, Stripe Payment Link for prints).
      buyUrl: z.string().url().optional(),
      // Render or photo, stored in src/assets/items/.
      image: image().optional(),
      imageAlt: z.string().optional(),
      // Lower numbers show first.
      order: z.number().default(100),
      draft: z.boolean().default(false),
    }),
});

export const collections = { items };

# The Tourism Lab — Astro prototype

An editorial frontend for The Tourism Lab, based on the supplied page mockups and brand kit. WordPress remains the headless CMS: published articles, featured images, authors and categories are fetched from its public REST API at build time. The existing WordPress site is not modified.

## Run locally

Use Node.js 22.19 or newer (or a current supported LTS), then:

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env` to override the WordPress origin or the frontend URL. `npm run build` type-checks and generates the static site in `dist`; `npm run preview` serves that build locally. A build requires access to the WordPress REST API and intentionally fails rather than publishing an empty site if the API is unavailable.

## Deploy to Cloudflare Pages

Connect this repository to Cloudflare Pages. Set the build command to `npm run build`, the output directory to `dist`, and `NODE_VERSION` to `22.19.0` or a newer supported version. Set `WORDPRESS_URL` to the WordPress origin and `SITE_URL` to the frontend's actual origin. Neither variable is a secret. The site uses static output and does not require a Cloudflare adapter.

Articles are a snapshot at build time, not live API requests in each visitor's browser. Configure a Cloudflare Pages deploy hook and trigger it from WordPress when content changes, or rebuild manually. WordPress and its media URLs must remain publicly accessible to builds and visitors. Images continue to be served by WordPress; they are not copied to Cloudflare.

## Before presenting or launching

- The kit calls for Editorial Today and Neulis Sans. They are not included in the supplied assets, so system serif and sans-serif fallbacks are used until appropriately licensed font files are supplied. The header uses the existing white WordPress logo. The hero, section and team images are optimized from the supplied mockup PDFs; confirm licensing and client approval for all photography before public launch.
- The contact form opens a draft in the visitor's email application; it does not send mail from a server. Newsletter subscription is not yet integrated. Connect approved providers and a privacy policy before enabling production submissions.
- Topic mappings in `src/lib/wordpress.ts` use the current WordPress category IDs. Editorial and industry-news categories are separate in WordPress. Update the mappings if the CMS taxonomy changes.
- The prototype generates articles at `/stories/<slug>/`; existing WordPress articles use root-level paths. Plan and test redirects, canonical URLs, sitemap, metadata, analytics, accessibility and performance before a domain cutover. In particular, do not point the WordPress API origin at the new frontend without arranging a separate accessible WordPress origin.
- WordPress article HTML is rendered as supplied by the CMS. Only trusted editors should be allowed to publish; review sanitization and embeds for your production security requirements.
- The content and personnel listed on informational pages are based on the supplied mockups and should be confirmed by the client. The design is a prototype, not a representation that the redesign is already approved.

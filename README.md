# The Tourism Lab — Astro prototype

An editorial frontend for The Tourism Lab, based on the supplied page mockups and brand kit. WordPress remains the headless CMS: published articles, featured images, authors and categories are fetched from its public REST API at build time. The existing WordPress site is not modified.

## Run locally

Use Node.js 22.19 or newer (or a current supported LTS), then:

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env` to override the WordPress origin or the frontend URL. `npm run build` type-checks and generates the static site in `dist`; generated HTML retains whitespace to make it easier to inspect, at the cost of slightly larger files. `npm run preview` serves that build locally. A build requires access to the WordPress REST API and intentionally fails rather than publishing an empty site if the API is unavailable.

## Deploy to Cloudflare Pages

Connect this repository to Cloudflare Pages. Set the build command to `npm run build`, the output directory to `dist`, and `NODE_VERSION` to `22.19.0` or a newer supported version. Set `WORDPRESS_URL` to the WordPress origin and `SITE_URL` to the frontend's actual origin. Neither variable is a secret. The site uses static output and does not require a Cloudflare adapter.

Articles are a snapshot at build time, not live API requests in each visitor's browser. Set up automatic rebuilds as described in [Rebuild when WordPress content changes](#rebuild-when-wordpress-content-changes), or rebuild manually. WordPress and its media URLs must remain publicly accessible to builds and visitors. Images continue to be served by WordPress; they are not copied to Cloudflare.

The REST API fetches published posts with embedded authors and featured media from `WORDPRESS_URL` (which defaults to `https://thetourismlab.com`). Post images use the WordPress media URL directly; when no featured image is available, the frontend can use the first image URL in the post content. Images and other media in post content also remain hosted by WordPress. These URLs are not automatically rewritten when `WORDPRESS_URL` changes.

The API does not automatically sync the entire WordPress media library or populate the static informational pages. Those pages use explicitly selected assets from `public/images` and, in some cases, direct WordPress upload URLs listed in `src/lib/assets.ts`. The partner logos and Instagram images on The Tourism Lab page are static assets from the supplied design PDF, not a live Instagram feed; update them in the project when the design changes. The Instagram button links to the account.

## Rebuild when WordPress content changes

1. In Cloudflare, open the Pages project, then **Settings → Builds → Deploy hooks**, and add a hook for the production branch (for example `wordpress-publish`). Copy the URL. Treat it as a secret: anyone with it can trigger builds.
2. On the WordPress server, add the URL to `wp-config.php`:

   ```php
   define('TTL_DEPLOY_HOOK_URL', 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...');
   ```

3. Add this as a must-use plugin (`wp-content/mu-plugins/ttl-deploy-hook.php`) or in a child theme's `functions.php`:

   ```php
   <?php
   add_action('transition_post_status', function ($new, $old, $post) {
       if ($post->post_type !== 'post' || ($new !== 'publish' && $old !== 'publish')) return;
       if (!defined('TTL_DEPLOY_HOOK_URL') || get_transient('ttl_deploy_pending')) return;
       // Debounce: batch edits made within one minute into a single build.
       set_transient('ttl_deploy_pending', 1, 60);
       wp_schedule_single_event(time() + 60, 'ttl_trigger_deploy');
   }, 10, 3);

   add_action('ttl_trigger_deploy', function () {
       wp_remote_post(TTL_DEPLOY_HOOK_URL, ['timeout' => 10]);
   });
   ```

   This fires on publish, update, unpublish and trash of posts. Scheduled events rely on WP-Cron, which runs when the site receives traffic.
4. Publish or edit a test post and confirm a new deployment appears in the Pages project, then check the post on the site once it finishes.

## Contact form setup

The form submits to a Cloudflare Pages Function, which validates the input and Turnstile token, then sends via Cloudflare Email Service. Messages are sent **from** `noreply@thetourismlab.com` **to** `info@thetourismlab.com`; Reply-To is the visitor's email address. A successful response means Cloudflare accepted the email, not that delivery to the inbox is guaranteed.

1. In Cloudflare, enable [Email Service](https://developers.cloudflare.com/email-service/) and [configure and verify](https://developers.cloudflare.com/email-service/configuration/domains/) `thetourismlab.com` as a sending domain. This integration uses the Email Sending REST API; review Cloudflare's plan and account eligibility requirements, including its Workers Paid requirement for Email Sending, and verify any destination requirements in the dashboard. Review DNS changes carefully so existing email keeps working. Do not replace existing SPF records without merging them correctly.
2. Create a Cloudflare API token limited to the account and the Email Sending permission needed to send messages. Copy it directly into the Pages dashboard as a secret, never into Git or chat.
3. Create a [Turnstile widget](https://developers.cloudflare.com/turnstile/get-started/) and allow the deployed website's hostname. Add the specific Pages preview hostname as well if testing previews. Keep the site key and secret key for the next step.
4. In the Pages project's settings, configure production (and preview separately if needed):
   - Build-time variable `PUBLIC_TURNSTILE_SITE_KEY`: the widget's public site key. This is embedded into the generated page.
   - Runtime variable `CLOUDFLARE_ACCOUNT_ID`: the account ID for Email Service.
   - Runtime **secret** `CLOUDFLARE_EMAIL_API_TOKEN`: the scoped sending token.
   - Runtime **secret** `TURNSTILE_SECRET_KEY`: the widget secret.
5. Deploy via Pages Git integration or Wrangler; dashboard Direct Upload does not support Pages Functions. Redeploy after setting the public site key. Submit a test on the deployed site and confirm the message arrives in the inbox and that Reply addresses the visitor. Check Pages Function logs and Email Service delivery activity if it fails.

`npm run dev` and `npm run preview` run Astro only; they do not execute Pages Functions. `npm test` checks the handler with mocked Cloudflare services and does not send an email. Use the Cloudflare Pages runtime or a deployed preview to test the complete flow. The form remains disabled with an email link when the site key is absent. If runtime settings are missing, the server reports an error instead of pretending to send.

Turnstile reduces automated abuse but does not replace rate limiting. Configure Cloudflare WAF rate limiting and review the site's privacy notice, retention, and any Email Service usage charges before production use.

## Before presenting or launching

- The kit calls for Editorial Today and Neulis Sans. They are not included in the supplied assets, so system serif and sans-serif fallbacks are used until appropriately licensed font files are supplied. The header uses the existing white WordPress logo. The hero, section and team images are optimized from the supplied mockup PDFs; confirm licensing and client approval for all photography before public launch.
- Newsletter subscription is not yet integrated. Connect an approved provider and privacy policy before enabling subscriptions.
- Topic mappings in `src/lib/wordpress.ts` use the current WordPress category IDs. Editorial and industry-news categories are separate in WordPress. Update the mappings if the CMS taxonomy changes.
- The prototype generates articles at `/stories/<slug>/`; existing WordPress articles use root-level paths. Plan and test redirects, canonical URLs, sitemap, metadata, analytics, accessibility and performance before a domain cutover. In particular, do not point the WordPress API origin at the new frontend without arranging a separate accessible WordPress origin.
- WordPress article HTML is rendered as supplied by the CMS. Only trusted editors should be allowed to publish; review sanitization and embeds for your production security requirements.
- The content and personnel listed on informational pages are based on the supplied mockups and should be confirmed by the client. The design is a prototype, not a representation that the redesign is already approved.

# Website

The marketing / documentation site for the Collection Downloader, served at
**https://downloader.crate-works.org** via GitHub Pages.

Built with [Astro](https://astro.build) + Tailwind CSS v4. It is an **isolated
pnpm project** (its own `pnpm-workspace.yaml` and `pnpm-lock.yaml`) so it never
touches the app's lockfile or Docker build.

## Develop

```bash
cd website
pnpm install
pnpm dev      # http://localhost:4321
```

Other scripts: `pnpm build` (runs `astro check` then builds to `dist/`),
`pnpm preview`, `pnpm check` (type-check only).

## Structure

- `src/pages/` — `index.astro` (overview), `guide.astro` (user guide),
  `self-hosting.astro` (deploy docs).
- `src/components/` — shared building blocks (Nav, Footer, Hero, FeatureCard,
  FlowDiagram, Screenshot, Step, CodeBlock).
- `src/consts.ts` — shared values (links, version). Bump `APP_VERSION` on release.
- `public/` — `CNAME` (custom domain) and `screenshots/`.

## Screenshots

Image slots show a labelled placeholder until a real file exists in
`public/screenshots/`. Drop in the files named in
[`public/screenshots/README.md`](public/screenshots/README.md) and they appear
automatically — no code change needed.

## Linting

The site is linted/formatted by the **root** Biome config (Astro full support is
enabled there), and `astro check` type-checks the templates. There is no separate
Biome/Knip setup here.

## Deploy

Pushing changes under `website/**` to `main` triggers
[`.github/workflows/pages.yml`](../.github/workflows/pages.yml), which builds the
site and publishes it to GitHub Pages.

One-time setup (already done if the site is live):

1. **Repo → Settings → Pages → Source = GitHub Actions.**
2. **DNS:** add a `CNAME` record `downloader.crate-works.org` →
   `crate-works.github.io`.
3. **Repo → Settings → Pages → Custom domain** = `downloader.crate-works.org`,
   then enable **Enforce HTTPS** once the certificate provisions. The committed
   `public/CNAME` keeps this set across deploys.

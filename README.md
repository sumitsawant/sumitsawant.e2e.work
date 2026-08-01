# sumitsawant.e2e.work

Personal portfolio for Sumit Sawant, deployed as a static site with GitHub Pages.

## Local preview

From the repository root:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Structure

- `index.html` — semantic portfolio content and metadata
- `styles.css` — responsive visual system
- `script.js` — mobile navigation and progressive reveal behavior
- `pixel.html` / `pixel.css` / `pixel.js` — alternate interactive “Signal view” portfolio
- `SumitSawant.pdf` — downloadable current résumé
- `og.svg` / `og.png` — social preview artwork
- `CNAME` — custom-domain configuration; do not delete

## Publishing

GitHub Pages deploys the root of `main` through the built-in `pages-build-deployment` workflow. A push to `main` publishes automatically.

Before publishing:

1. Preview at desktop, tablet, and mobile widths.
2. Confirm all external links and `mailto:` links.
3. Confirm `SumitSawant.pdf` is the current one-page résumé.
4. Keep `CNAME` exactly `sumitsawant.e2e.work`.
5. Validate that `og.png` is 1200×630.

## Rollback

Use `git revert <commit>` and push the revert to `main`; GitHub Pages will redeploy the prior state.

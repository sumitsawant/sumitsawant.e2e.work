# sumitsawant.e2e.work

Personal portfolio for Sumit Sawant, deployed as a static site with GitHub Pages.

## Local preview

From the repository root:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Structure

- `index.html` — current Three.js portfolio and metadata
- `styles.css` — current responsive visual and motion system
- `script.js` — Three.js scene, scroll reveals, and interactions
- `SumitSawant-2026.pdf` — downloadable current résumé
- `resume-2026.html` — editable source for the current résumé
- `previous/` — self-contained archive of the previous published portfolio, including its signal view
- `SumitSawant.pdf` — retained legacy résumé URL for compatibility
- `og.svg` — current social preview artwork
- `CNAME` — custom-domain configuration; do not delete

## Publishing

GitHub Pages deploys the root of `main` through the built-in `pages-build-deployment` workflow. A push to `main` publishes automatically.

Before publishing:

1. Preview at desktop, tablet, and mobile widths.
2. Confirm all external links and `mailto:` links.
3. Confirm `SumitSawant-2026.pdf` is the current one-page résumé.
4. Keep `CNAME` exactly `sumitsawant.e2e.work`.
5. Confirm the current site resolves at `/` and the archive at `/previous/`.

## Rollback

Use `git revert <commit>` and push the revert to `main`; GitHub Pages will redeploy the prior state.

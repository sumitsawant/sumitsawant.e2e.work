# signal/ — archived portfolio (interactive system visualization)

Self-contained snapshot of the portfolio published between 26 Aug 2026 and
30 Aug 2026, superseded by the editorial design now at `/`.

Preserved because it is a distinct design direction, not just an older revision:
a dark acid-green system with a Three.js hero (custom GLSL core, instanced node
graph, three visualization modes), film grain, custom cursor, and marquee ticker.

## Structure

- `index.html` / `styles.css` / `script.js` — the archived site
- `404.html` — archive-local error page
- `og.svg` / `og.png` — the dark social preview artwork for this design
- favicons, `apple-touch-icon.png`, `CNAME`, résumé PDFs — copied so the
  archive renders standalone

## Notes

- `robots` is `noindex, follow`; canonical points at `/signal/`, so the archive
  never competes with the live site in search.
- Social tags point at `/signal/og.png`, not the root image.
- Three.js loads from the jsDelivr CDN at runtime; if that is unavailable the
  scene hides itself and the page falls back to static layout.

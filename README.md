# The Sound of My Years — Svelte implementation starter

**Phase 07 / Implementation & Iteration · 21 November 2026**

This is a deliberately small *vertical slice* of the 8-scene experience:

1. Cinematic opening with the **original Claude shader** (code extracted verbatim).
2. Four personal memory quotes appearing *inside* the tunnel as scrolling progresses.
3. A first data-world transition to **The Rhythm of My Day** — with very clearly labelled synthetic preview values.

It is a local implementation starter, not the completed semester project or a production-ready representation of personal data.

## Run

You need Node.js and npm.

```bash
npm install
npm run dev
```

Open the URL shown by Vite (usually `http://localhost:5173`).

Build and checks:

```bash
npm run check
npm run build
npm run preview
```

## Visual architecture

- `prototypes/liquid-glass-original.html`: preserved original working HTML, **unaltered**.
- `public/portal/capsule.jpg`, `public/portal/tunnel.jpg`: extracted from embedded image strings in the original HTML.
- `src/lib/portal/shaders.js`: original GLSL vertex/fragment shaders, unchanged.
- `src/lib/components/PortalJourney.svelte`: Three.js renderer, GSAP ScrollTrigger progress mapping, floating memory cues, static fallback.
- `src/lib/components/RhythmPreview.svelte`: **synthetic-data** 24-hour radial SVG + weekday buttons. This is solely to test the transition into scene 2.
- `src/app.css`: typography and Liquid Memories global tokens; Tailwind CSS v4 is enabled for later components.

### Portal timing

Edit the `thoughts` array in `PortalJourney.svelte` to retime the four memory fragments. The `start` and `end` numbers are normalized scroll progress (0 to 1). Example: `0.65` means ~65% of the portal scroll path. `windowOpacity` controls fade-in/fade-out. The final reveal occurs near 90%.

### Design constraints

- Keep the portal shader visually equivalent to the original until comparison screenshots match.
- No split-of-concerns rewrite should affect original shader algorithm yet.
- Distinguish illustrative layout from verified listening data; never publish fabricated Spotify values as genuine.
- Honour `prefers-reduced-motion` and support a visible 'Skip to the Data' link.
- Test on Chrome and Safari and at desktop, tablet, mobile widths.
- High-quality glass images may be subject to rights; confirm permission for public publication.
- The raw Spotify files are intentionally **not included**.

### Git / branches

In your actual repository (verify the intended repo first):

```bash
git switch -c feat/portal-journey
# Copy this starter into the repository or merge its files into the existing Svelte application.
npm install
npm run check
npm run build
git status
git add src public/portal prototypes docs package.json package-lock.json index.html vite.config.js jsconfig.json .gitignore
git commit -m "feat: integrate cinematic portal and scroll memories"
git push -u origin feat/portal-journey
```

Do not overwrite an existing `src` or `package.json` blindly. Create a branch and integrate incrementally.

### Milestone / Definition of Done

- Original prototype is preserved for comparison.
- Scroll moves through capsule and tunnel, allowing reverse-scroll.
- Quotes appear during the tunnel, rather than all at the entrance.
- The first data world is reachable by scrolling and by skip link.
- Synthetic demo data is visibly labelled.
- Motion reduction and fallback exist.
- No raw Spotify data is committed.

**Next milestone:** Build genuine local Python aggregates for `The Rhythm of My Day` and replace the demo values, then add data-driven scene transitions and more precise annotation behavior.

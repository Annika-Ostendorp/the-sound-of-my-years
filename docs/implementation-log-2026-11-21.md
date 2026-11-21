# 21 November 2026 / Implementation log — entry 01

**Objective:** Preserve the successful Three.js/GLSL portal prototype and begin the integration into a modular Svelte 5 single-page website.

**What changed:** Split the standalone HTML into local JPEG assets, the unchanged shader source, a `PortalJourney.svelte` renderer, and an initial `RhythmPreview.svelte` visualisation. Added normalized scroll windows for four personal questions to appear during the tunnel. Added motion-reduction and error fallbacks.

**Implementation approach:** Svelte 5 + Vite, npm-managed Three.js, GSAP ScrollTrigger, Tailwind CSS v4 and SVG. The first data-world chart currently uses synthetic data and must not be mistaken for Spotify results.

**Problems to watch:** Asset colour/contrast may differ between the original Three.js r128 renderer and the current npm version. Confirm visually. WebGL availability; resize behavior; low-power devices; mobile scroll lengths and Safari; public image rights.

**Next step:** Compare screenshots at 0%, 35%, 50%, 75%, 95% scroll with the original, refine quote timing and integrate verified Spotify aggregates into The Rhythm of My Day.

# The Sound of My Years

**What if my music remembers more than I do?**

*An immersive, data-driven music time capsule.*

The Sound of My Years is an interactive information-design project that explores the relationship between personal memory and recorded music-listening history. Instead of recreating a conventional yearly statistics dashboard, it invites visitors to travel through a cinematic time capsule, discover patterns in my Spotify listening behaviour, and compare what I thought I knew with what the data actually shows.

The experience focuses on **2026**, with historical Spotify records from **2018-2026** providing context for changing listening habits, rediscovered songs, and a dedicated chapter about RAYE.

> **Project status (25 November 2026):** Active Svelte 5 prototype on `feature/data-worlds`. The scroll-driven liquid-glass portal, editorial hero, navigation and first music world are implemented. *The Rhythm of My Day* includes a Waveform Clock, a memory-versus-data comparison and weekday fingerprints. These use **Spotify-derived preview aggregates marked `REVIEW_REQUIRED`**, pending data-validation and privacy review. Other worlds and public deployment are still in development.

## The idea: Liquid Memories

The visual direction, **Liquid Memories**, combines midnight-purple backgrounds, iridescent glass, lavender, magenta, pink, orange and gold highlights, bold editorial typography, delicate serif memory fragments, and carefully paced motion.

The experience begins with a question: *What if my music remembers more than I do?* As visitors scroll, a liquid-glass portal expands into an apparent tunnel. Personal assumptions emerge inside the tunnel, then give way to exploratory, data-driven music worlds.

The aesthetic takes inspiration from cinematic digital experiences and expressive music storytelling, including Spotify Wrapped, while developing an independent visual language and data narrative. Motion should reveal meaning, never replace it.

## The eight-scene journey

| Scene | Main concept | Planned exploration |
| --- | --- | --- |
| 01 - Fragments of My Memory | Enter the time capsule | A scroll-driven portal and personal memory questions |
| 02 - The Rhythm of My Day | Listening patterns | A 24-hour listening clock, weekdays and musical fingerprints |
| 03 - The Gravity of Music | Artist relationships | An orbital artist race and recorded same-session musical neighbours |
| 04 - The Eras I Never Named | Musical time | A Time Lens, evolving artist preferences and Musical Deja Vu |
| 05 - The Songs That Found Their Way Back | Rediscovery | Return arcs, The First Spark and long-term invisible favourites |
| 06 - RAYE: The Artist Who Stayed | A personal artist story | Historical listening, solo/featured tracks, and personal memory kept distinct from recorded evidence |
| 07 - The Listening Rabbit Hole | Session pathways | Replays, artist transitions, branching listening paths and loops |
| 08 - Expectation vs. Reality | Final reveal | Three original Spotify hypotheses compared with verified results |

**Important:** This table describes the full planned experience, not eight completed implementations. Visualisations will be based on documented data definitions and verified values, rather than fabricated or decorative relationships.

## What currently works

- A **Svelte 5** single-page application built with **Vite**.
- A full-screen **Three.js / GLSL** portal effect adapted from a working standalone HTML prototype developed with Claude.
- Scroll progress controlled with **GSAP ScrollTrigger**, including four personal memory fragments timed to appear during the tunnel sequence.
- A scroll-driven transition into **World 01: The Rhythm of My Day**, featuring an interactive waveform listening clock with weekday and AM/PM selection, a memory-versus-data comparison and musical weekday fingerprints.
- A static image fallback if WebGL is unavailable or the visitor requests reduced motion, plus a **Skip to the Data** link.
- A preserved copy of the original HTML proof of concept for visual comparison.

**Still pending:** validating the derived Spotify preview data and reconciling the documented filtering discrepancy, building the remaining interactive chapters, production deployment, imagery-rights review, and full accessibility/performance testing.

## Technology

| Tool | Purpose |
| --- | --- |
| Svelte 5 + JavaScript | Components, interface and interactive state |
| Vite | Local development and production builds |
| Three.js + GLSL | Liquid-glass portal rendering |
| GSAP + ScrollTrigger | Scroll-driven transitions and memory reveals |
| Tailwind CSS v4 + custom CSS | Layout, design tokens and visual styling |
| SVG | First radial chart prototype and future data visuals |
| D3.js | Installed for upcoming data-driven interactive visualisations |
| Python | Local Spotify data aggregation scripts and review checks; release approval pending |

## Run locally

### Requirements

- **Node.js** compatible with Vite 7: **20.19+ or 22.12+** (or a newer compatible version).
- **npm** (included with Node.js).
- A modern browser with WebGL support for the animated portal; a static fallback is available.

### Install and start

Clone the repository if it is not already on your computer:

```bash
git clone https://github.com/Annika-Ostendorp/the-sound-of-my-years.git
cd the-sound-of-my-years
```

If you already have the project open in VS Code, stay in its root folder instead of cloning it again.

Install the dependencies and launch the local development server:

```bash
npm install
npm run dev
```

Open the local address printed by Vite, usually **http://localhost:5173/**.

### Checks and production preview

```bash
npm run check     # Check Svelte components and JavaScript/TypeScript configuration
npm run build     # Generate a production build in dist/
npm run preview   # Preview the production build locally
```

Run these checks after significant code changes. The build output in `dist/` is generated and should not be committed.

### Common troubleshooting

- **`npm` not found:** install or update Node.js, then reopen the terminal.
- **Port already in use:** use the alternative local URL shown by Vite.
- **Blank/slow portal:** check browser WebGL support and the assets under `public/portal/`. Test in an up-to-date Chrome or Safari browser.
- **No animation:** check the system's *Reduce Motion* setting, which activates the static alternative.

## Project structure (current implementation)

```text
.
├── docs/
│   └── implementation-log-2026-11-21.md
├── prototypes/
│   └── liquid-glass-original.html
├── public/
│   └── portal/
│       ├── capsule.jpg
│       └── tunnel.jpg
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── PortalJourney.svelte
│   │   │   └── RhythmPreview.svelte
│   │   └── portal/
│   │       └── shaders.js
│   ├── App.svelte
│   ├── app.css
│   └── main.js
├── .gitignore
├── index.html
├── jsconfig.json
├── package.json
└── vite.config.js
```

The **original standalone portal** is retained under `prototypes/`; the same visual effect has been separated into image assets, shaders, and a Svelte component. The original shader code is deliberately preserved until visual parity has been checked.

## Preview and project links

- **Current source:** [feature/data-worlds](https://github.com/Annika-Ostendorp/the-sound-of-my-years/tree/feature/data-worlds)
- **Live GitHub Pages preview:** not yet published. Add only after data, rights, privacy and build review.
- **Screenshots:** selected screenshots of the implemented hero and first world will be added after visual review.

## Data ethics and privacy

The final website uses **Spotify Extended Streaming History** as its sole published data source. Earlier research also explored YouTube and Google Search, but these are not part of the final website.

- Original personal data exports, private spreadsheets and sensitive records must **never** be committed, even to a private repository.
- Raw data is processed separately and locally, with Python generating only the necessary reviewed aggregates.
- Audio dramas and other explicitly excluded spoken-word records are filtered according to documented rules.
- Recorded playback is evidence of **listening activity**, not proof of emotions, real-life events, or the first time I heard a song.
- Missing periods and partial-year coverage must be made clear. A first **observed** play is not necessarily a first-ever listen.
- The source material covers 2018-2026, but the semester project's main analytical focus is 2026.
- The current Waveform Clock uses **Spotify-derived preview values, marked `REVIEW_REQUIRED`**. These must not be presented as final validated measurements.

The imagery used in the portal also requires a rights review before a public website release. The GitHub repository is already public, so code and existing assets must also be reviewed.

## Design process and documentation

This is a semester project for **Information Design, Winter Semester 2026/27**. The development process is documented in an accompanying **English Design Diary** (maintained separately), covering:

1. Initial hypotheses and personal-data exploration.
2. Inspiration, visual research and the **Liquid Memories** moodboard.
3. An eight-scene storyboard and Figma wireframes/high-fidelity studies.
4. Rejected procedural Blender experiments and the successful Claude-assisted shader prototype.
5. Svelte implementation, design iterations, testing, privacy and final reflection.

The diary distinguishes **conceptual visuals**, **working prototypes**, and **verified data visualisations**. Chapter 07, *Implementation & Iteration*, records code changes, problems, solutions and screenshots as development progresses.

**Design file:** [The Sound of My Years - Information Design (Figma)](https://www.figma.com/design/u40lUNvKgNeEqdSLlo4XMx/The-Sound-of-my-Years---Information-Design?node-id=13-2)

### AI-assisted development

Claude supported the standalone Three.js/GLSL portal prototype. ChatGPT supported research, data processing, design iteration, Blender experimentation and integration into the initial Svelte application. Design choices, testing, interpretation and responsibility for the final outcome remain part of the documented student process.

## Next milestones

1. **Portal polish:** compare the Svelte rendering with the original prototype, refine the scroll timings and typography of the memory fragments, and improve the transition into the first data world.
2. **Verified listening clock:** reconcile the current Spotify-derived preview values, including the 4,182-record discrepancy noted in the preview metadata, before publishing results.
3. **Interactive music worlds:** complete and verify the first world's interactions, then implement the remaining worlds with documented data encodings.
4. **RAYE chapter and finale:** separate personal recollection from recorded evidence and evaluate the original hypotheses.
5. **Final quality review:** responsiveness, contrast, reduced motion, keyboard interactions, performance, privacy and deployment.

**Target submission: 11 December 2026.**

---

*An independent educational project, not affiliated with or endorsed by Spotify.*

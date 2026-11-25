<script>
  // "What the data knows. What I remember." Zwei klar getrennte Welten:
  //   DATA   = gemessen, Spotify: kühle Glasfläche, Raster, Creme-Schrift (Syne / DM Sans), echte Balken aus den Daten.
  //   MEMORY = persönlich: warmes, leicht schiefes Papier, Instrument Serif Italic + Handschrift, Pfeil.
  // Alle Texte sind Props (Standardwerte stammen aus deinem Entwurf; "note" ist ein Platzhalter).
  import rhythmData from '../../data/rhythm_2026_preview.json';
  import HandArrow from './HandArrow.svelte';
  import StickerBadge from './StickerBadge.svelte';
  import { cinematicReveal } from '../../motion/cinematicReveal.js';

  let {
    dataTitle = 'One day is never',
    dataEmphasis = 'quite like another.',
    dataBody = 'These shapes come from recorded listening time, not audio recordings. They reveal when music appeared — but not why.',
    memoryQuote = 'I thought I knew my listening habits.',
    memoryQuestion = 'Does the rhythm recorded by Spotify match the routine I remember?',
    memoryNote = 'but what do the numbers say?'
  } = $props();

  // Echte, gemessene Stundenwerte (Profil ALL) – nur als Mini-Balken, keine erfundenen Werte.
  const hours = rhythmData.profiles.find((p) => p.id === 'ALL').hours;
  const peak = Math.max(1, ...hours);
</script>

<section class="dvm" aria-label="What the data knows and what I remember">
  <div class="grid">
    <article class="panel data" use:cinematicReveal={{ start: 'top 92%', end: 'top 56%' }}>
      <header>
        <span class="chip chip-data">WHAT THE DATA KNOWS</span>
        <span class="source">MEASURED · SPOTIFY · 2026</span>
      </header>
      <h2>{dataTitle} <em>{dataEmphasis}</em></h2>
      <div class="bars" role="img" aria-label="Average listening minutes for each of the 24 hours of the day">
        {#each hours as h, i (i)}
          <i style={`--h:${Math.max(0.05, h / peak)}`}></i>
        {/each}
      </div>
      <div class="axis" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
      <p class="body">{dataBody}</p>
    </article>

    <div class="seam" aria-hidden="true">
      <StickerBadge text="vs." rotate={-10} color="#FF945A" />
    </div>

    <article class="panel memory" use:cinematicReveal={{ start: 'top 90%', end: 'top 52%' }}>
      <span class="chip chip-memory">WHAT I REMEMBER</span>
      <blockquote>“{memoryQuote}”</blockquote>
      <p class="question">{memoryQuestion}</p>
      <div class="note-wrap">
        <div class="note-arrow"><HandArrow from={{ x: 150, y: 24 }} to={{ x: 12, y: 96 }} w={170} h={118} bend={-0.5} color="#FFC79A" width={3.6} delay={0.3} /></div>
        <p class="note">{memoryNote}</p>
      </div>
    </article>
  </div>
</section>

<style>
  .dvm { position: relative; padding: clamp(4rem, 9vw, 8rem) clamp(1.2rem, 5vw, 5rem); background: #100B1E; }
  .grid { position: relative; max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: 1.15fr 1fr; gap: clamp(1.4rem, 3vw, 3rem); align-items: stretch; }
  .panel { position: relative; padding: clamp(1.6rem, 3vw, 2.8rem); border-radius: 1.6rem; }
  .chip { display: inline-block; font: 700 .68rem var(--font-body, 'DM Sans', sans-serif); letter-spacing: .2em; padding: .5rem .9rem; border-radius: 999px; }

  /* DATA: kühl, präzise, Raster, Creme */
  .data { color: #F8EEE8; background:
      linear-gradient(rgba(248,238,232,.05) 1px, transparent 1px) 0 0 / 100% 2.2rem,
      linear-gradient(90deg, rgba(248,238,232,.05) 1px, transparent 1px) 0 0 / 2.2rem 100%,
      linear-gradient(150deg, rgba(120,92,190,.22), rgba(20,12,44,.7));
    border: 1px solid rgba(248,238,232,.32); box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 30px 80px rgba(4,1,12,.45); }
  .data header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .chip-data { background: #F8EEE8; color: #100B1E; }
  .source { font: 600 .64rem var(--font-body, 'DM Sans', sans-serif); letter-spacing: .18em; color: #CDBFE6; }
  .data h2 { margin: 1.4rem 0 1.2rem; font: 650 clamp(2rem, 4vw, 3.9rem)/1.02 var(--font-family, 'Syne', sans-serif); letter-spacing: -.045em; color: #F8EEE8; }
  .data h2 em { font: italic 400 1.08em/1 var(--font-editorial, 'Instrument Serif', serif); color: #F4C1DD; letter-spacing: -.02em; }
  .bars { display: grid; grid-template-columns: repeat(24, 1fr); align-items: end; gap: 3px; height: 5.5rem; margin-top: 1.4rem; }
  .bars i { display: block; height: calc(var(--h) * 100%); border-radius: 3px 3px 1px 1px; background: linear-gradient(180deg, #F8EEE8, #C284BB); }
  .axis { display: flex; justify-content: space-between; margin-top: .45rem; font: 600 .6rem var(--font-body, 'DM Sans', sans-serif); letter-spacing: .14em; color: #B9A8D6; }
  .body { margin: 1.4rem 0 0; max-width: 40ch; font: 400 1.02rem/1.55 var(--font-body, 'DM Sans', sans-serif); color: #E4DAF0; }

  /* MEMORY: warm, handgemacht, leicht schief */
  .memory { transform-origin: 50% 50%; margin-block: clamp(0rem, 2vw, 1.4rem) 0; color: #FFE9D6;
    background: linear-gradient(160deg, rgba(255,148,90,.2), rgba(246,96,185,.12) 60%, rgba(60,22,60,.35));
    border: 2px dashed rgba(255,185,142,.55); }
  .chip-memory { background: transparent; color: #FFC79A; border: 1.5px solid #FFC79A; }
  .memory blockquote { margin: 1.5rem 0 1rem; font: italic 400 clamp(2.4rem, 4.6vw, 4.8rem)/1 var(--font-editorial, 'Instrument Serif', serif); letter-spacing: -.02em; color: #FFE2CF; text-shadow: 0 4px 30px rgba(20,6,30,.6); }
  .question { margin: 0; max-width: 34ch; font: 400 1.15rem/1.45 var(--font-editorial, 'Instrument Serif', serif); color: #F6CBDB; }
  .note-wrap { position: relative; margin-top: 1.6rem; min-height: 6.5rem; display: flex; align-items: flex-end; gap: .4rem; }
  .note-arrow { width: clamp(7rem, 12vw, 9.5rem); flex: none; }
  .note { margin: 0 0 .2rem; font: 400 clamp(1.5rem, 2.6vw, 2.2rem)/1.05 var(--font-hand, 'Mansalva', cursive); color: #FFD9B8; transform: rotate(-3deg); }

  .seam { position: absolute; left: calc(1.15 / 2.15 * 100%); top: 50%; z-index: 3; transform: translate(-50%, -50%); }

  @media (max-width: 860px) {
    .grid { grid-template-columns: 1fr; }
    .seam { position: relative; left: auto; top: auto; transform: none; justify-self: center; margin: -.6rem 0; z-index: 3; }
    .memory { transform: none; }
  }
</style>

<script>
  // Fatfish-Referenz: Instrument-Serif-Erinnerung überlappt ein gläsernes Daten-Chart.
  // Messdaten (#F8EEE8, D3/SVG) kommen als Snippet "chart"; Erinnerung bleibt typografisch getrennt.
  import HandArrow from './HandArrow.svelte';
  import StickerBadge from './StickerBadge.svelte';

  let { memory = '', year = '', sticker = '', chart, arrowPath, theme = 'violet' } = $props();
</script>

<article class="card" data-theme={theme}>
  <div class="glass" aria-label="Gemessene Spotify-Daten">
    <span class="tag">DATA · measured</span>
    {#if chart}{@render chart()}{/if}
  </div>
  <blockquote class="memory">
    {#if year}<small>{year}</small>{/if}
    <p>{memory}</p>
    <span class="tag tag-memory">MEMORY · personal</span>
  </blockquote>
  <div class="arrow"><HandArrow color={theme === 'burgundy' ? '#D9B25F' : '#FFB98E'} /></div>
  {#if sticker}<div class="badge"><StickerBadge text={sticker} color={theme === 'burgundy' ? '#D9B25F' : '#F660B9'} /></div>{/if}
</article>

<style>
  .card { position: relative; display: grid; grid-template-columns: repeat(12, 1fr); align-items: center; max-width: 1100px; margin-inline: auto; padding: clamp(24px, 5vw, 60px) 0; color: #F8EEE8; }
  .glass {
    grid-column: 4 / 13; grid-row: 1; min-height: 320px; padding: 28px;
    border-radius: 28px; border: 1px solid rgba(248,238,232,.22);
    background: linear-gradient(145deg, rgba(255,255,255,.14), rgba(255,255,255,.04));
    backdrop-filter: blur(22px) saturate(1.3); -webkit-backdrop-filter: blur(22px) saturate(1.3);
    box-shadow: 0 30px 80px rgba(0,0,0,.35);
  }
  .memory { grid-column: 1 / 7; grid-row: 1; z-index: 2; margin: 0; padding: 0 0 0 4px; transform: translateY(-14%); }
  .memory p { margin: .2em 0 .5em; font: italic 400 clamp(2rem, 5vw, 4.2rem)/1.02 var(--font-editorial, 'Instrument Serif', serif); text-shadow: 0 6px 40px rgba(16,11,30,.9); }
  .memory small { font: 700 .8rem var(--font-family, 'Syne', sans-serif); letter-spacing: .18em; color: #FF945A; }
  .tag { display: inline-block; font: 700 .68rem var(--font-body, 'DM Sans', sans-serif); letter-spacing: .16em; text-transform: uppercase; opacity: .7; }
  .tag-memory { color: #F660B9; }
  .arrow { position: absolute; left: 36%; bottom: 4%; width: 150px; z-index: 3; pointer-events: none; }
  .badge { position: absolute; right: 2%; top: 2%; z-index: 3; }
  [data-theme='burgundy'] .glass { background: linear-gradient(145deg, rgba(217,178,95,.16), rgba(90,18,40,.4)); border-color: rgba(217,178,95,.4); }
  [data-theme='burgundy'] .memory small, [data-theme='burgundy'] .tag-memory { color: #D9B25F; }
  @media (max-width: 760px) { .glass, .memory { grid-column: 1 / -1; grid-row: auto; transform: none; } .arrow { display: none; } }
</style>

<script>
  // Kategorie-Visual je Hypothesen-Karte. Ragt seitlich über die Glaskarte hinaus (wie die schwebenden Bilder in World 01).
  import Cover from './Cover.svelte';
  import { habitArt, rayeArt, returningArt, twinsArt, shortTitle } from '../../portal/portalContent.js';
  let { id, side = 'left' } = $props();

  const ring = habitArt.bars.map((v, i) => {
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2, r0 = 46, r1 = r0 + 8 + v * 40;
    return { x1: 100 + Math.cos(a) * r0, y1: 100 + Math.sin(a) * r0, x2: 100 + Math.cos(a) * r1, y2: 100 + Math.sin(a) * r1, peak: v === 1 };
  });
  const curve = (arr, w = 220, h = 90) => {
    const pts = arr.map((v, i) => [(i / 23) * w, h - 6 - v * (h - 16)]);
    return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  };
</script>

<div class="art {side} {id}" aria-hidden="true">
  {#if id === 'listening-habits'}
    <svg class="ring" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="40" class="core" />
      <g class="bars">
        {#each ring as b, i (i)}<line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} class:peak={b.peak} />{/each}
      </g>
      <text x="100" y="116" text-anchor="middle" class="q">?</text>
    </svg>
    <span class="cap">24 hours · what do I really play?</span>

  {:else if id === 'returning-songs'}
    <div class="fan">
      {#each returningArt.tiles as t, i (t.uri)}
        <figure style="--i:{i}">
          <Cover src={t.cover} label={t.track} size="5.6rem" />
          <figcaption><b>{shortTitle(t.track, 16)}</b><span>away {returningArt.years(t)} yrs</span></figcaption>
        </figure>
      {/each}
    </div>

  {:else if id === 'raye'}
    <div class="orbit-wrap">
      <div class="orbit">
        {#each rayeArt.covers as c, i (c.uri)}
          <span class="sat" style="--a:{i * 72}deg"><span class="un"><span class="ctr"><Cover src={c.cover} label={c.track} size="3.3rem" /></span></span></span>
        {/each}
      </div>
      <div class="portrait"><Cover src={rayeArt.image} label="RAYE" round size="8.2rem" /></div>
    </div>

  {:else if id === 'time-twins'}
    <svg class="twins" viewBox="0 0 220 90">
      <path d={curve(twinsArt.pa)} pathLength="1" class="a" />
      <path d={curve(twinsArt.pb)} pathLength="1" class="b" />
    </svg>
    <span class="cap"><i class="da"></i>{twinsArt.a}<em>≈</em><i class="db"></i>{twinsArt.b}<em>?</em></span>
  {/if}
</div>

<style>
  .art { position: absolute; z-index: 2; top: 50%; pointer-events: none; display: flex; flex-direction: column; align-items: center; gap: .55rem;
    opacity: calc(.25 + var(--lock, 0) * .75); }
  .art.left { left: calc(100% + .6rem); transform: translateY(-50%); }
  .art.right { right: calc(100% + .6rem); transform: translateY(-50%); }
  .cap { font: 700 .56rem var(--font-body, 'DM Sans', sans-serif); letter-spacing: .2em; color: #ffd8bd; text-transform: uppercase; white-space: nowrap;
    padding: .38rem .8rem; border-radius: 999px; background: rgba(20,10,40,.55); border: 1px solid rgba(255,230,242,.25); display: inline-flex; align-items: center; gap: .5rem; }
  .cap em { font: italic 400 1.05rem var(--font-editorial, 'Instrument Serif', serif); letter-spacing: 0; color: #ffd2e6; }
  .cap i { width: .5rem; height: .5rem; border-radius: 50%; display: inline-block; }
  .cap .da { background: #FF945A; } .cap .db { background: #F660B9; }

  /* Gewohnheiten: Stundenring wächst beim Einrasten */
  .ring { width: 13.5rem; height: 13.5rem; overflow: visible; filter: drop-shadow(0 12px 30px rgba(0,0,0,.45)); }
  .ring .core { fill: rgba(22,12,42,.72); stroke: rgba(255,230,242,.35); stroke-width: 1; }
  .ring .bars { transform-origin: 100px 100px; transform: scale(calc(.55 + var(--lock, 0) * .45)) rotate(calc(var(--lock, 0) * 14deg)); }
  .ring line { stroke: #F4A9D0; stroke-width: 3.4; stroke-linecap: round; opacity: .92; }
  .ring line.peak { stroke: #FF945A; filter: drop-shadow(0 0 5px rgba(255,148,90,.9)); }
  .ring .q { font: italic 400 3.2rem var(--font-editorial, 'Instrument Serif', serif); fill: #fff0fa; animation: pulse 2.6s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: .55; } }

  /* Songs, die zurückkamen: aufgefächerte Cover */
  .fan { display: flex; gap: .2rem; align-items: flex-start; }
  .fan figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: .45rem; width: 6.3rem;
    transform: translateY(calc(var(--i) * 1.1rem - 1.1rem)) rotate(calc((var(--i) - 1) * 7deg)); }
  .fan figcaption { display: flex; flex-direction: column; align-items: center; text-align: center; font-family: var(--font-body, 'DM Sans', sans-serif); }
  .fan figcaption b { font-size: .62rem; font-weight: 700; color: #fff0fa; text-shadow: 0 2px 10px rgba(0,0,0,.7); }
  .fan figcaption span { font-size: .54rem; letter-spacing: .08em; color: #ffc9a0; text-shadow: 0 2px 10px rgba(0,0,0,.7); }

  /* RAYE: Porträt mit kreisenden Song-Covern */
  .orbit-wrap { position: relative; width: 15.5rem; height: 15.5rem; }
  .portrait { position: absolute; inset: 0; display: grid; place-items: center; }
  .portrait :global(.cov) { box-shadow: 0 0 0 3px rgba(255,148,90,.85), 0 0 50px rgba(246,96,185,.5), 0 18px 40px rgba(0,0,0,.5); }
  .orbit { position: absolute; inset: 0; animation: spin 60s linear infinite; }
  .sat { position: absolute; left: 50%; top: 50%; width: 0; height: 0; transform: rotate(var(--a)) translateX(6.5rem); }
  .un { display: block; width: 0; height: 0; rotate: calc(-1 * var(--a)); animation: spin 60s linear infinite reverse; }
  .ctr { display: block; transform: translate(-50%, -50%); }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Zeitzwillinge: zwei Tagesprofile übereinander */
  .twins { width: 15rem; overflow: visible; filter: drop-shadow(0 10px 26px rgba(0,0,0,.5)); }
  .twins path { fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: calc(1 - var(--lock, 0)); }
  .twins .a { stroke: #FF945A; } .twins .b { stroke: #F660B9; }

  @media (max-width: 800px) {
    .art, .art.left, .art.right { position: relative; left: auto; right: auto; top: auto; transform: none; margin: 1.2rem auto 0; opacity: 1; }
    .orbit-wrap { transform: scale(.85); margin: -.8rem 0; }
  }
  @media (prefers-reduced-motion: reduce) { .orbit, .un, .ring .q { animation: none; } }
</style>

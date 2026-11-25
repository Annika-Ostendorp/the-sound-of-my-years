<script>
  // Kapitel 3 · Musical Fingerprint — sieben Wochentage als gespiegelte "Audio-Abdrücke" (24 Stunden von oben nach unten).
  // Tippe einen Tag an: die anderen färben sich umso pinker, je ähnlicher ihr Tagesverlauf ist (Korrelation der 24 Stundenwerte).
  import { onMount } from 'svelte';
  import rhythmData from '../../data/rhythm_2026_preview.json';
  import HandArrow from '../fatfish/HandArrow.svelte';
  import ChapterMark from './ChapterMark.svelte';
  import { cinematicReveal } from '../../motion/cinematicReveal.js';

  const IDS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const FULL = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday' };
  const prof = Object.fromEntries(rhythmData.profiles.map((p) => [p.id, p.hours]));
  const gMax = Math.max(...IDS.flatMap((d) => prof[d]));
  const corr = (a, b) => {
    const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
    return num / Math.sqrt(da * db || 1);
  };
  const R = Object.fromEntries(IDS.map((a) => [a, Object.fromEntries(IDS.map((b) => [b, corr(prof[a], prof[b])]))]));
  const pairs = IDS.flatMap((a, i) => IDS.slice(i + 1).map((b) => ({ a, b, r: R[a][b] })));
  const best = pairs.reduce((x, y) => (y.r > x.r ? y : x));
  const worst = pairs.reduce((x, y) => (y.r < x.r ? y : x));
  const avg = (list) => list.reduce((s, p) => s + p.r, 0) / list.length;
  const wk = IDS.slice(0, 5), we = IDS.slice(5);
  const wkAvg = avg(pairs.filter((p) => wk.includes(p.a) && wk.includes(p.b)));
  const pct = (r) => Math.max(0, Math.round(r * 100));
  const peakOf = (d) => prof[d].indexOf(Math.max(...prof[d]));
  const hh = (h) => String(h).padStart(2, '0') + ':00';

  let anchor = $state(best.a);
  let hover = $state(null);
  const active = $derived(hover ?? anchor);
  const others = $derived(IDS.filter((d) => d !== active));
  const nearest = $derived(others.reduce((x, y) => (R[active][y] > R[active][x] ? y : x)));
  const farthest = $derived(others.reduce((x, y) => (R[active][y] < R[active][x] ? y : x)));
  const lo = $derived(Math.min(...others.map((d) => R[active][d])));
  const hi = $derived(R[active][nearest]);
  const sim = (d) => (d === active ? 1 : hi === lo ? 1 : (R[active][d] - lo) / (hi - lo));   // 0..1 relativ, für die Färbung

  let grid, shown = $state(false);
  onMount(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { shown = true; return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { shown = true; io.disconnect(); } }, { threshold: 0.25 });
    io.observe(grid); return () => io.disconnect();
  });
</script>

<section id="chapter-3" class="fp" aria-labelledby="fp-title">
  <div class="glow" aria-hidden="true"></div>
  <div class="wrap">
    <div use:cinematicReveal={{ y: 20, blur: 6, start: 'top 98%', end: 'top 84%', lock: false }}><ChapterMark n={3} title="My musical fingerprint" /></div>
    <p class="hyp" use:cinematicReveal={{ y: 16, blur: 4, start: 'top 98%', end: 'top 82%', lock: false }}><span>HYPOTHESIS 04</span><i>“Which days would sound the same?”</i></p>
    <h3 id="fp-title" use:cinematicReveal={{ y: 40, blur: 12, start: 'top 96%', end: 'top 66%' }}>Seven days, <em>seven fingerprints.</em></h3>
    <p class="lead" use:cinematicReveal={{ y: 20, blur: 6, start: 'top 96%', end: 'top 72%', lock: false }}>
      Each print is one day from midnight to 23:00, wider where I listen more. <b>Tap a day</b>, the others turn pinker the more they sound like it.
    </p>

    <div class="grid-wrap">
      <div class="note" style:left={`${((IDS.indexOf(nearest) + 0.5) / 7) * 100}%`}>
        <span class="script">closest twin</span>
        <div class="arr"><HandArrow from={{ x: 10, y: 8 }} to={{ x: 62, y: 98 }} w={90} h={110} bend={0.4} s={true} color="#FFC79A" width={3.4} delay={0.25} /></div>
      </div>

      <div class="grid" class:in={shown} bind:this={grid} role="group" aria-label="Weekday fingerprints">
        {#each IDS as d, i (d)}
          {@const isA = d === active}
          <button type="button" class="card" class:anchor={isA} class:twin={!isA && d === nearest} aria-pressed={d === anchor}
            style="--i:{i};--s:{sim(d).toFixed(3)}"
            onclick={() => (anchor = d)} onpointerenter={() => (hover = d)} onpointerleave={() => (hover = null)} onfocus={() => (hover = d)} onblur={() => (hover = null)}>
            <span class="day">{d}</span>
            <span class="print" aria-hidden="true">
              {#each prof[d] as v, h (h)}
                <span class="row"><i class="ghost" style="--w:{(prof[active][h] / gMax).toFixed(3)}"></i><i class="bar" style="--w:{(v / gMax).toFixed(3)}"></i></span>
              {/each}
            </span>
            <span class="foot">
              {#if isA}<b>ANCHOR</b><small>peaks {hh(peakOf(d))}</small>
              {:else}<b>{pct(R[active][d])}%</b><small>{d === nearest ? 'closest twin' : d === farthest ? 'least alike' : 'alike'}</small>{/if}
            </span>
          </button>
        {/each}
      </div>

      <div class="groups" aria-hidden="true">
        <span class="g wd">WEEKDAYS<small>{pct(wkAvg)}% alike on average</small></span>
        <span class="g we">WEEKEND<small>{pct(R.SAT.SUN)}% alike</small></span>
      </div>
    </div>

    <p class="verdict" use:cinematicReveal={{ y: 20, blur: 6, start: 'top 100%', end: 'top 80%', lock: false }}>
      <b>{FULL[active]}</b> sounds most like <em>{FULL[nearest]}</em> ({pct(R[active][nearest])}%) and least like <em>{FULL[farthest]}</em> ({pct(R[active][farthest])}%).
      Overall the closest twins are <em>{FULL[best.a]}</em> and <em>{FULL[best.b]}</em>, the odd pair <em>{FULL[worst.a]}</em> and <em>{FULL[worst.b]}</em>.
    </p>
  </div>
</section>

<style>
  .fp { position: relative; padding: clamp(4rem, 9vw, 8rem) clamp(1.2rem, 5vw, 5rem); background: #100B1E; overflow: hidden; }
  .glow { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 50% 40% at 80% 60%, rgba(246,96,185,.2), transparent 70%), radial-gradient(ellipse 45% 40% at 10% 90%, rgba(255,148,90,.15), transparent 70%), radial-gradient(ellipse 40% 30% at 50% 0%, rgba(120,70,190,.2), transparent 70%); }
  .wrap { position: relative; max-width: 1180px; margin: 0 auto; }
  .hyp { display: flex; flex-wrap: wrap; align-items: baseline; gap: .8rem; margin: 1.3rem 0 0; }
  .hyp span { font: 700 .6rem var(--font-body, 'DM Sans', sans-serif); letter-spacing: .2em; color: #CDB5D2; padding: .3rem .7rem; border-radius: 999px; border: 1.5px dashed rgba(255,199,154,.5); }
  .hyp i { font: italic 400 1.15rem var(--font-editorial, 'Instrument Serif', serif); color: #E8B9D4; }
  h3 { margin: 1.2rem 0 0; font: 650 clamp(2.6rem, 6.4vw, 6rem)/1 var(--font-display, 'Syne', sans-serif); letter-spacing: -.055em; color: #FFF3EE; }
  h3 em { font: italic 400 1.08em/1 var(--font-editorial, 'Instrument Serif', serif); letter-spacing: -.02em; background: linear-gradient(90deg, #FFB98E, #F660B9); -webkit-background-clip: text; background-clip: text; color: transparent; padding-right: .14em; }
  .lead { margin: 1.2rem 0 0; max-width: 40ch; font: 400 clamp(1.2rem, 2vw, 1.75rem)/1.28 var(--font-editorial, 'Instrument Serif', serif); color: #E6D0E4; }
  .lead b { font-weight: 400; font-style: italic; color: #FFB98E; }

  .grid-wrap { position: relative; margin-top: clamp(5rem, 9vw, 7rem); }
  .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: clamp(.4rem, 1vw, .9rem); }
  .card { --s: 1; position: relative; display: flex; flex-direction: column; gap: .7rem; padding: .9rem .7rem .8rem; border-radius: 22px; cursor: pointer; text-align: center; color: inherit; font: inherit;
    background: linear-gradient(160deg, rgba(255,255,255,.09), rgba(255,255,255,.025)); border: 1px solid rgba(255,255,255,.13);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 24px 50px -26px rgba(0,0,0,.8);
    opacity: 0; transform: translateY(46px) scale(.96); filter: blur(10px);
    transition: opacity .8s cubic-bezier(.2,.8,.2,1) calc(var(--i) * 90ms), transform .8s cubic-bezier(.2,.8,.2,1) calc(var(--i) * 90ms), filter .8s ease calc(var(--i) * 90ms), border-color .3s, box-shadow .3s, background .3s; }
  .grid.in .card { opacity: 1; transform: none; filter: none; }
  .card:hover { transform: translateY(-4px); }
  .card:focus-visible { outline: 2px solid #FFC79A; outline-offset: 3px; }
  .card.anchor { border-color: rgba(255,185,142,.8); background: linear-gradient(160deg, rgba(255,185,142,.2), rgba(255,148,90,.05)); box-shadow: inset 0 1px 0 rgba(255,255,255,.3), 0 0 50px -8px rgba(255,148,90,.5); }
  .card.twin { border-color: rgba(246,96,185,.8); box-shadow: inset 0 1px 0 rgba(255,255,255,.3), 0 0 44px -8px rgba(246,96,185,.55); }
  .day { font: 700 clamp(1rem, 1.8vw, 1.5rem)/1 var(--font-display, 'Syne', sans-serif); letter-spacing: -.02em; color: #FFF3EE; }

  .print { display: flex; flex-direction: column; gap: 2px; height: clamp(230px, 34vw, 380px); }
  .row { position: relative; flex: 1; display: block; }
  .row i { position: absolute; left: 50%; top: 0; bottom: 0; width: calc(var(--w) * 100%); min-width: 4%; transform: translateX(-50%); border-radius: 99px; transition: width .55s cubic-bezier(.2,.8,.2,1), background .4s; }
  .ghost { background: rgba(255,185,142,.3); width: calc(var(--w) * 100%); }
  .card.anchor .ghost { display: none; }
  .bar { background: color-mix(in oklab, #F660B9 calc(var(--s) * 100%), #7d63d6); opacity: calc(.55 + var(--s) * .45); }
  .card.anchor .bar { background: linear-gradient(90deg, #FFB98E, #FF945A); opacity: 1; box-shadow: 0 0 10px rgba(255,148,90,.5); }
  .foot { display: flex; flex-direction: column; gap: .1rem; }
  .foot b { font: 700 clamp(.95rem, 1.6vw, 1.35rem)/1 var(--font-display, 'Syne', sans-serif); letter-spacing: -.03em; color: #FFD0A8; }
  .card.anchor .foot b { font-size: .62rem; letter-spacing: .2em; font-family: var(--font-body, 'DM Sans', sans-serif); }
  .foot small { font: 600 .56rem var(--font-body, 'DM Sans', sans-serif); letter-spacing: .12em; color: #B8A2C6; text-transform: uppercase; }

  .note { position: absolute; bottom: calc(100% + .2rem); transform: translateX(-78%); display: flex; align-items: flex-end; gap: .2rem; pointer-events: none; transition: left .5s cubic-bezier(.2,.8,.2,1); z-index: 2; }
  .script { font: 400 clamp(1.4rem, 2.4vw, 2.2rem)/1 var(--font-hand, 'Mansalva', cursive); color: #FFD9B8; white-space: nowrap; transform: rotate(-5deg); display: block; }
  .arr { width: clamp(3.4rem, 5vw, 4.6rem); margin-bottom: -3.2rem; margin-left: -.4rem; }

  .groups { display: grid; grid-template-columns: 5fr 2fr; gap: clamp(.4rem, 1vw, .9rem); margin-top: 1rem; }
  .g { display: flex; flex-direction: column; gap: .2rem; padding-top: .6rem; border-top: 1.5px solid rgba(255,199,154,.5); font: 700 .6rem var(--font-body, 'DM Sans', sans-serif); letter-spacing: .2em; color: #FFC79A; }
  .g small { font: italic 400 1rem var(--font-editorial, 'Instrument Serif', serif); letter-spacing: 0; color: #E6D0E4; }
  .verdict { margin: clamp(2rem, 4vw, 3rem) 0 0; max-width: 56ch; font: 400 clamp(1.15rem, 1.8vw, 1.55rem)/1.35 var(--font-editorial, 'Instrument Serif', serif); color: #E6D0E4; }
  .verdict b { font-weight: 400; color: #FFB98E; } .verdict em { color: #F4A9D0; }

  @media (max-width: 720px) {
    .grid { grid-template-columns: repeat(4, 1fr); } .groups { display: none; } .note { display: none; }
    .print { height: 200px; }
  }
  @media (prefers-reduced-motion: reduce) { .card { opacity: 1; transform: none; filter: none; transition: none; } }
</style>

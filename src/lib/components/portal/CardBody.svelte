<script>
  // Inhalt einer schwebenden Erinnerungskarte, je nach Kategorie: song | artist | habit | comeback.
  import Cover from './Cover.svelte';
  import { waveBars, shortTitle, fmtNum, fmtDate } from '../../portal/portalContent.js';
  let { card } = $props();
  const ring = $derived(card.habit ? card.habit.bars.map((v, i) => {
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2, r0 = 30, r1 = r0 + 4 + v * 22;
    return { x1: 50 + Math.cos(a) * r0, y1: 50 + Math.sin(a) * r0, x2: 50 + Math.cos(a) * r1, y2: 50 + Math.sin(a) * r1, peak: i === card.habit.peakHour };
  }) : []);
  const cb = $derived(card.comeback);
</script>

<div class="mc-top"><span class="mc-year">{card.year}</span><span class="mc-tag">{card.label}</span></div>

{#if card.category === 'song'}
  <div class="song">
    <span class="vinyl" aria-hidden="true"></span>
    <Cover src={card.song.cover} label={card.song.track} size="5.6rem" />
    <div class="mc-meta"><strong>{shortTitle(card.song.track, 24)}</strong><span>{card.song.artist}</span>
      <em>{card.minutes ? `${fmtNum(card.minutes)} min` : card.date}</em></div>
  </div>

{:else if card.category === 'artist'}
  <div class="artist">
    <Cover src={card.artist.image} label={card.artist.name} round size="5.4rem" />
    <div class="trio">{#each card.covers as c, i (c.uri)}<span style="--i:{i}"><Cover src={c.cover} label={c.track} size="2.5rem" /></span>{/each}</div>
  </div>
  <div class="aname">{card.artist.name}</div>
  <p class="aline">{card.hours ? `${card.hours} hours in 2026, so far` : `${card.song.track} · ${card.date}`}</p>

{:else if card.category === 'habit'}
  <div class="habit">
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {#each ring as b, i (i)}<line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} class:peak={b.peak} />{/each}
    </svg>
    <div class="hc"><b>{fmtNum(card.habit.hours)}</b><span>HOURS</span></div>
  </div>
  <p class="aline">≈ {card.habit.days} days of music · loudest at {String(card.habit.peakHour).padStart(2, '0')}:00</p>

{:else if card.category === 'comeback' && cb}
  <div class="comeback">
    <figure class="then"><Cover src={cb.cover} label={cb.track} size="2.8rem" /><figcaption>{cb.from.slice(0, 4)}</figcaption></figure>
    <div class="gap"><i></i><span>{fmtNum(cb.gapDays)} days</span><i></i></div>
    <figure class="now"><Cover src={cb.cover} label={cb.track} size="4.8rem" /><figcaption>{cb.to.slice(0, 4)}</figcaption></figure>
  </div>
  <div class="mc-meta"><strong>{shortTitle(cb.track, 26)}</strong><span>{cb.artist}</span></div>
{/if}

<svg class="mc-wave" viewBox="0 0 112 28" preserveAspectRatio="none" aria-hidden="true">
  {#each waveBars(card.wave) as h, k (k)}<rect x={k * 4} y={14 - h * 13} width="2.2" height={h * 26} rx="1.1" />{/each}
</svg>
<p class="mc-marker">{card.marker}</p>

<style>
  .mc-top { display: flex; justify-content: space-between; align-items: baseline; gap: .6rem; }
  .mc-year { font-family: var(--font-family, 'Syne', sans-serif); font-weight: 800; font-size: 2.35rem; line-height: 1; letter-spacing: -.04em;
    background: linear-gradient(100deg, #ffd0a8, #F660B9); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .mc-tag { font-family: var(--font-body, 'DM Sans', sans-serif); font-size: .5rem; font-weight: 700; letter-spacing: .18em; color: #ffd0a8; opacity: .85; text-align: right; }
  .mc-meta { display: flex; flex-direction: column; min-width: 0; font-family: var(--font-body, 'DM Sans', sans-serif); }
  .mc-meta strong { font-size: .86rem; font-weight: 700; letter-spacing: .01em; line-height: 1.2; }
  .mc-meta span { font-size: .7rem; opacity: .72; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mc-meta em { margin-top: .25rem; font: 700 .58rem var(--font-body, 'DM Sans', sans-serif); font-style: normal; letter-spacing: .16em; color: #FFB98E; text-transform: uppercase; }
  .mc-wave { display: block; width: 100%; height: 1.5rem; margin-top: .8rem; fill: #F8EEE8; opacity: calc(.3 + var(--focus, 0) * .55); }
  .mc-marker { margin: .55rem 0 0; font-family: var(--font-editorial, 'Instrument Serif', Georgia, serif); font-style: italic; font-size: 1.2rem; line-height: 1.1; color: #ffe2ef; }

  /* song: Cover mit halb verdeckter Schallplatte */
  .song { position: relative; display: flex; align-items: center; gap: .9rem; margin: .9rem 0 0; }
  .vinyl { position: absolute; left: 2.6rem; top: 50%; width: 5.2rem; height: 5.2rem; transform: translateY(-50%); border-radius: 50%;
    background: radial-gradient(circle, #F660B9 0 9%, #1a0f2c 10% 16%, transparent 17%), repeating-radial-gradient(circle, #241538 0 2px, #170c27 2px 4px);
    box-shadow: 0 8px 22px rgba(0,0,0,.45); animation: vin 9s linear infinite; }
  .song :global(.cov) { z-index: 1; }
  .song .mc-meta { margin-left: 2.9rem; }
  @keyframes vin { to { transform: translateY(-50%) rotate(360deg); } }

  /* artist: Porträt + drei Cover */
  .artist { display: flex; align-items: center; gap: .7rem; margin: .8rem 0 .5rem; }
  .artist :global(.cov.round) { box-shadow: 0 0 0 2px rgba(255,148,90,.85), 0 0 34px rgba(246,96,185,.45), 0 12px 26px rgba(0,0,0,.45); }
  .trio { display: flex; }
  .trio span { margin-left: -.7rem; transform: translateY(calc((var(--i) - 1) * .5rem)); }
  .trio span:first-child { margin-left: 0; }
  .aname { font: 700 1.5rem/1 var(--font-family, 'Syne', sans-serif); letter-spacing: -.04em; color: #fff4ec; }
  .aline { margin: .4rem 0 0; font: 500 .68rem/1.3 var(--font-body, 'DM Sans', sans-serif); letter-spacing: .04em; color: #e9cfe3; opacity: .85; }

  /* habit: Stundenring mit Stundenzahl */
  .habit { position: relative; width: 7.6rem; height: 7.6rem; margin: .5rem auto .2rem; }
  .habit svg { position: absolute; inset: 0; overflow: visible; }
  .habit line { stroke: #F4A9D0; stroke-width: 2.4; stroke-linecap: round; }
  .habit line.peak { stroke: #FF945A; filter: drop-shadow(0 0 4px rgba(255,148,90,.9)); }
  .hc { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
  .hc b { font: 700 1.25rem/1 var(--font-family, 'Syne', sans-serif); letter-spacing: -.04em; color: #fff4ec; }
  .hc span { font: 700 .48rem var(--font-body, 'DM Sans', sans-serif); letter-spacing: .22em; color: #FFB98E; }
  .habit + .aline { text-align: center; }

  /* comeback: damals -> Pause -> wieder da */
  .comeback { display: flex; align-items: center; gap: .5rem; margin: .8rem 0 .6rem; }
  .comeback figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: .3rem; }
  .comeback figcaption { font: 700 .56rem var(--font-body, 'DM Sans', sans-serif); letter-spacing: .14em; color: #ffd0a8; }
  .then :global(.cov) { filter: grayscale(.85) brightness(.75); opacity: .75; }
  .gap { flex: 1; display: flex; align-items: center; gap: .35rem; min-width: 0; }
  .gap i { flex: 1; height: 0; border-top: 1.5px dashed rgba(255,208,168,.55); }
  .gap span { font: italic 400 .86rem var(--font-editorial, 'Instrument Serif', serif); color: #ffe2ef; white-space: nowrap; }
  .now :global(.cov) { box-shadow: inset 0 0 0 1px rgba(255,255,255,.4), 0 0 30px rgba(255,148,90,.5), 0 10px 24px rgba(0,0,0,.45); }
  @media (prefers-reduced-motion: reduce) { .vinyl { animation: none; } }
</style>

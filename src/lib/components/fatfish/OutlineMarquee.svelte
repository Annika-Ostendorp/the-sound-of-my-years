<script>
  // Fatfish-Referenz: zwei gegenläufige Outline-Marquee-Zeilen, Tempo reagiert auf Scroll-Velocity.
  import { onMount } from 'svelte';
  import { scrollState } from '../../motion/scrollState.js';

  let { top = 'WHAT THE DATA KNOWS', bottom = 'WHAT I REMEMBER', repeat = 6 } = $props();

  let rowA, rowB;
  let offsetA = 0;
  let offsetB = 0;
  let intensity = 0;
  let reduced = false;

  onMount(() => {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const unsubscribe = scrollState.subscribe((s) => { intensity = s.intensity ?? 0; });
    if (reduced) return unsubscribe;

    let frame = 0;
    let last = performance.now();
    let visible = false;
    const base = 38; // px/s Grundtempo
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const speed = base * (1 + intensity * 9);
      const widthA = rowA?.scrollWidth / 2 || 1;
      const widthB = rowB?.scrollWidth / 2 || 1;
      offsetA = (offsetA - speed * dt) % widthA;           // Zeile 1 nach links
      offsetB = (offsetB + speed * dt) % widthB;           // Zeile 2 nach rechts
      if (rowA) rowA.style.transform = `translate3d(${offsetA}px,0,0)`;
      if (rowB) rowB.style.transform = `translate3d(${offsetB - widthB}px,0,0)`;
      frame = visible ? requestAnimationFrame(loop) : 0;
    };
    // Nur animieren, solange die Marquee im Bild ist (spart dauerhaft Rechenzeit beim Scrollen).
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) { last = performance.now(); frame = requestAnimationFrame(loop); }
    }, { rootMargin: '120px' });
    io.observe(rowA.closest('.marquee'));
    return () => { visible = false; cancelAnimationFrame(frame); io.disconnect(); unsubscribe(); };
  });

  const items = (n) => Array.from({ length: n * 2 }, (_, i) => i);
</script>

<section class="marquee" aria-label="What the data knows. What I remember.">
  <div class="track" aria-hidden="true">
    <div class="row outline" bind:this={rowA}>
      {#each items(repeat) as i (i)}<span>{top}<i>✦</i></span>{/each}
    </div>
  </div>
  <div class="track" aria-hidden="true">
    <div class="row filled" bind:this={rowB}>
      {#each items(repeat) as i (i)}<span>{bottom}<i>✦</i></span>{/each}
    </div>
  </div>
</section>

<style>
  .marquee { position: relative; overflow: hidden; padding: clamp(40px, 8vw, 110px) 0; background: #100B1E; }
  .track { overflow: hidden; white-space: nowrap; }
  .row { display: inline-flex; will-change: transform; }
  .row span {
    font-family: var(--font-family, 'Syne', sans-serif);
    font-weight: 800;
    font-size: clamp(3.2rem, 11vw, 10rem);
    line-height: 1.02;
    letter-spacing: -0.03em;
    padding-right: 0.35em;
    text-transform: uppercase;
  }
  .row i { font-style: normal; font-size: .5em; margin-left: .35em; vertical-align: middle; color: #FF945A; }
  .outline span { color: transparent; -webkit-text-stroke: 1.5px #F8EEE8; }
  .filled span { font-family: var(--font-editorial, 'Instrument Serif', serif); font-style: italic; font-weight: 400; text-transform: none; color: #F660B9; letter-spacing: -0.01em; }
  @media (prefers-reduced-motion: reduce) { .row { transform: none !important; } .track { overflow-x: auto; } }
</style>

<script>
  // Leitmotiv-Band: "What the data knows. What I remember." als EINE ruhige, gut lesbare Zeile.
  // Zwei Stimmen im Wechsel: Daten = Syne-Versalien in Creme (gemessen), Erinnerung = Instrument Serif
  // Kursiv in Rosa-Orange (gefühlt). Fatfish-Marquee, Tempo reagiert auf Scroll-Velocity; Kanten laufen
  // weich aus. Pausiert, sobald es nicht im Bild ist.
  import { onMount } from 'svelte';
  import { scrollState } from '../../motion/scrollState.js';

  let { data = 'What the data knows', memory = 'What I remember', repeat = 4 } = $props();

  let row;
  let band;
  onMount(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let intensity = 0;
    const off = scrollState.subscribe((s) => { intensity = s.intensity ?? 0; });
    let offset = 0, last = performance.now(), frame = 0, visible = false;
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const half = row.scrollWidth / 2 || 1;
      offset = (offset - 46 * (1 + intensity * 8) * dt) % half;
      row.style.transform = `translate3d(${offset}px,0,0)`;
      frame = visible ? requestAnimationFrame(loop) : 0;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !frame) { last = performance.now(); frame = requestAnimationFrame(loop); }
    }, { rootMargin: '100px' });
    io.observe(band);
    return () => { visible = false; cancelAnimationFrame(frame); io.disconnect(); off(); };
  });
  const items = Array.from({ length: repeat * 2 }, (_, i) => i);
</script>

<section class="band" bind:this={band} aria-label="{data}. {memory}.">
  <div class="mask" aria-hidden="true">
    <div class="row" bind:this={row}>
      {#each items as i (i)}
        <span class="d">{data}</span>
        <svg class="wave" viewBox="0 0 34 20" aria-hidden="true">
          <rect x="1" y="7" width="3" height="6" rx="1.5"/><rect x="7" y="3" width="3" height="14" rx="1.5"/>
          <rect x="13" y="0" width="3" height="20" rx="1.5"/><rect x="19" y="4" width="3" height="12" rx="1.5"/>
          <rect x="25" y="7" width="3" height="6" rx="1.5"/><rect x="31" y="9" width="3" height="2" rx="1"/>
        </svg>
        <span class="m">{memory}</span>
        <i class="dot"></i>
      {/each}
    </div>
  </div>
</section>

<style>
  .band { position: relative; background: #100B1E; padding: clamp(1.4rem, 3vw, 2.4rem) 0; border-block: 1px solid rgba(248,238,232,.09); overflow: hidden; }
  .band::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(246,96,185,.07), transparent 30%, transparent 70%, rgba(255,148,90,.07)); pointer-events: none; }
  .mask { overflow: hidden; white-space: nowrap; -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); }
  .row { display: inline-flex; align-items: center; gap: clamp(1.4rem, 3vw, 2.8rem); will-change: transform; padding-right: clamp(1.4rem, 3vw, 2.8rem); }
  .d { font: 700 clamp(1.1rem, 2.3vw, 2rem)/1 var(--font-family, 'Syne', sans-serif); letter-spacing: .16em; text-transform: uppercase; color: #F8EEE8; }
  .m { font: italic 400 clamp(1.7rem, 3.6vw, 3.2rem)/1 var(--font-editorial, 'Instrument Serif', serif); background: linear-gradient(90deg, #F660B9, #FF945A); -webkit-background-clip: text; background-clip: text; color: transparent; padding-right: .08em; }
  .wave { width: clamp(1.5rem, 2.4vw, 2.2rem); fill: #F8EEE8; opacity: .55; flex: none; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: #FF945A; box-shadow: 0 0 14px #FF945A; flex: none; }
  @media (prefers-reduced-motion: reduce) { .mask { overflow-x: auto; } .row { transform: none !important; } }
</style>

<script>
  // Active-Theory-Referenz: Erinnerungskarten im Z-Raum. Beim Scrollen fliegt die Kamera durch den Stapel;
  // Karten außerhalb des Fokus werden unscharf (Depth of Field), dazu Partikel mit Tiefe.
  // Texte sind Platzhalter: ersetze sie durch Einträge aus public/data/memories.json.
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import { scrollState } from '../../motion/scrollState.js';

  let {
    cards = [
      { year: '2018', text: 'Platzhalter: Welcher Song war dein erster Sommer?' },
      { year: '2020', text: 'Platzhalter: Was lief, als alles still war?' },
      { year: '2022', text: 'Platzhalter: Ein Lied, das du nie verlieren wolltest.' },
      { year: '2024', text: 'Platzhalter: Wer blieb, als andere gingen?' },
      { year: '2026', text: 'Platzhalter: Was glaubst du, was die Daten sagen?' }
    ]
  } = $props();

  const SPACING = 640;   // Z-Abstand zwischen Karten (px)
  const DOF_MAX = 14;    // max. Blur (px)

  let section, stage, canvas;
  let cardEls = [];
  let intensity = 0;
  let progress = 0;
  let reduced = $state(false);

  const layout = (i) => ({ x: [-18, 14, -8, 20, -2][i % 5], y: [-6, 8, -12, 4, 0][i % 5], r: [-4, 3, -2, 5, 0][i % 5] });

  function place(p) {
    const n = cards.length;
    cardEls.forEach((el, i) => {
      if (!el) return;
      const d = i - p * (n - 1);                    // 0 = Fokus, >0 hinten, <0 schon vorbei
      const { x, y, r } = layout(i);
      const blur = Math.min(DOF_MAX, Math.abs(d) * 6 + intensity * 3);
      const opacity = d < -0.7 ? 0 : d > 3 ? 0 : 1 - Math.max(0, d) * 0.22;
      gsap.set(el, {
        x: `${x}vw`, y: `${y}vh`, z: -d * SPACING, rotateZ: r,
        opacity, filter: `blur(${blur.toFixed(1)}px)`,
        pointerEvents: Math.abs(d) < 0.4 ? 'auto' : 'none'
      });
    });
  }

  onMount(() => {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const unsubscribe = scrollState.subscribe((s) => { intensity = s.intensity ?? 0; });
    if (reduced) return unsubscribe;

    gsap.registerPlugin(ScrollTrigger);
    place(0);
    const trigger = ScrollTrigger.create({
      trigger: section, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => { progress = self.progress; place(progress); }
    });

    // Partikel mit Tiefe
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0;
    const resize = () => { W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    window.addEventListener('resize', resize);
    const parts = Array.from({ length: 110 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random(), hue: Math.random() }));
    let frame = 0, last = performance.now(), visible = false;
    const tick = (now) => {
      if (!visible) { frame = 0; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, W, H);
      const speed = 0.04 + intensity * 0.9;
      for (const p of parts) {
        p.z -= speed * dt;
        if (p.z <= 0.02) { p.z = 1; p.x = Math.random() * 2 - 1; p.y = Math.random() * 2 - 1; }
        const k = 1 / p.z * 0.35;
        const sx = W / 2 + p.x * k * W * 0.5, sy = H / 2 + p.y * k * H * 0.5;
        const size = Math.min(5, 0.7 + k * 1.1);
        ctx.globalAlpha = Math.min(0.8, (1 - p.z) * 0.9);
        ctx.fillStyle = p.hue > 0.5 ? '#FF945A' : '#F660B9';
        ctx.beginPath(); ctx.arc(sx, sy, size, 0, 6.283); ctx.fill();
      }
      frame = requestAnimationFrame(tick);
    };
    // Partikel nur rendern, solange der Abschnitt sichtbar ist.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); }
    });
    io.observe(section);

    return () => { visible = false; trigger.kill(); cancelAnimationFrame(frame); io.disconnect(); window.removeEventListener('resize', resize); unsubscribe(); };
  });
</script>

<section class="zstack" class:static={reduced} bind:this={section} aria-label="Erinnerungskarten im Raum" style:--n={cards.length}>
  <div class="stage" bind:this={stage}>
    {#if !reduced}<canvas bind:this={canvas} aria-hidden="true"></canvas>{/if}
    <div class="space">
      {#each cards as card, i (i)}
        <article class="memory" bind:this={cardEls[i]}>
          <small>{card.year}</small>
          <p>{card.text}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<style>
  .zstack { position: relative; height: calc(var(--n) * 90vh + 100vh); background: linear-gradient(180deg, #100B1E 0, rgba(16,11,30,0) 22vh), radial-gradient(120% 90% at 50% 40%, #39205C 0%, #100B1E 70%); }
  .stage { position: sticky; top: 0; height: 100vh; overflow: hidden; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  .space { position: absolute; inset: 0; perspective: 900px; perspective-origin: 50% 45%; transform-style: preserve-3d; }
  .memory {
    position: absolute; left: 50%; top: 50%; width: min(520px, 78vw); margin: -170px 0 0 calc(min(520px, 78vw) / -2);
    padding: 34px 36px; border-radius: 26px; color: #F8EEE8;
    background: linear-gradient(150deg, rgba(255,255,255,.16), rgba(255,255,255,.04));
    border: 1px solid rgba(248,238,232,.24);
    box-shadow: 0 40px 100px rgba(0,0,0,.45), 0 0 80px rgba(246,96,185,.12);
    will-change: transform, filter, opacity;
  }
  .memory small { font: 700 .78rem var(--font-family, 'Syne', sans-serif); letter-spacing: .2em; color: #FF945A; }
  .memory p { margin: .4em 0 0; font: italic 400 clamp(1.7rem, 3.4vw, 2.6rem)/1.08 var(--font-editorial, 'Instrument Serif', serif); }
  /* Reduced Motion: normale Liste statt Raumflug */
  .static { height: auto; padding: 80px 24px; }
  .static .stage { position: static; height: auto; }
  .static .space { position: static; display: grid; gap: 24px; justify-items: center; perspective: none; }
  .static .memory { position: static; margin: 0; }
</style>

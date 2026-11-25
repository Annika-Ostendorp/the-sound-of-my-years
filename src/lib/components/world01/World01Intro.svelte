<script>
  // World 01 · Einstieg — das Portal saugt den Besucher weiter nach innen.
  // Gepinnte Scroll-Sequenz (scrub, vorwärts wie rückwärts):
  //   1) Das warme Licht vom Portal-Ende liegt oben am Rand (identischer Verlauf = keine Kante).
  //   2) Bunte Partikel strömen spiralförmig zur Mitte (wie im Tunnel), ein Kern leuchtet auf.
  //   3) Aus dem Kern setzen sich Eyebrow, Titel, Lead, Chips und Notiz nacheinander scharf an ihre Positionen.
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import HandArrow from '../fatfish/HandArrow.svelte';
  import rhythmData from '../../data/rhythm_2026_preview.json';

  let { note = 'one day, twelve positions' } = $props();

  let host, stage, cv, glow, core, eyebrow, title, lead, chips, noteEl, dust;
  const rnd = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  const motes = Array.from({ length: 16 }, (_, i) => ({
    x: (rnd(i, 1) * 100).toFixed(1), s: (2 + rnd(i, 2) * 4).toFixed(1),
    d: (9 + rnd(i, 3) * 10).toFixed(1), dl: (-rnd(i, 4) * 14).toFixed(1), o: (.25 + rnd(i, 5) * .5).toFixed(2)
  }));

  const COLORS = ['#FF945A', '#F660B9', '#C39BFF', '#FFD0A8', '#F8EEE8', '#ed8fc7'];
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  onMount(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { host.classList.add('static'); return; }
    gsap.registerPlugin(ScrollTrigger);

    // ---- Partikelfeld (Canvas 2D, additiv) -------------------------------------------------------
    const ctx = cv.getContext('2d');
    const N = 340;
    const P = Array.from({ length: N }, (_, i) => ({
      a: rnd(i, 7) * Math.PI * 2, r: 0.25 + Math.pow(rnd(i, 8), 0.65) * 1.05, z: rnd(i, 9),
      c: COLORS[Math.floor(rnd(i, 10) * COLORS.length)], s: 0.8 + rnd(i, 11) * 2.2, sw: (rnd(i, 12) - 0.3) * 1.6
    }));
    let W = 0, H = 0, dpr = 1, prog = 0, lastProg = 0, vel = 0, raf = 0, visible = false, t0 = performance.now();
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = stage.clientWidth; H = stage.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const place = (q, conv, t) => {
      // Radius schrumpft zur Mitte (Sog), Winkel dreht sich spiralförmig mit.
      const k = 1 - conv * (0.93 - 0.18 * q.z);
      const ang = q.a + conv * q.sw * (1 + q.z) * 2.4 + t * 0.03 * (0.5 + q.z);
      const rad = q.r * k * Math.max(W, H) * 0.62;
      return [W / 2 + Math.cos(ang) * rad, H * 0.48 + Math.sin(ang) * rad * 0.82];
    };
    const draw = (now) => {
      raf = visible ? requestAnimationFrame(draw) : 0;
      const t = (now - t0) / 1000;
      vel += (Math.min(1, Math.abs(prog - lastProg) * 14) - vel) * 0.12; lastProg = prog;
      ctx.clearRect(0, 0, W, H);
      const conv = smooth(0, 0.42, prog);
      const alpha = 1 - smooth(0.3, 0.56, prog);
      if (alpha <= 0.003) return;
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const q of P) {
        const [x, y] = place(q, conv, t);
        const [px, py] = place(q, Math.max(0, conv - (0.05 + vel * 0.1) * (0.6 + q.z)), t);
        ctx.strokeStyle = q.c; ctx.globalAlpha = alpha * (0.35 + q.z * 0.6);
        ctx.lineWidth = q.s * (0.6 + conv * 0.9);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
        ctx.globalAlpha *= 0.9; ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(x, y, q.s * 0.7, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    size();
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(draw); }, { rootMargin: '50px' });
    io.observe(host);
    const onResize = () => size();
    window.addEventListener('resize', onResize, { passive: true });

    // ---- Timeline: Sog -> Kern -> Elemente setzen sich nacheinander ---------------------------
    let ctxG;
    const build = () => {
      ctxG = gsap.context(() => {
        const sc = stage.getBoundingClientRect();
        const from = (el, k = 0.5, extra = {}) => {
          const r = el.getBoundingClientRect();
          return { x: (sc.left + sc.width / 2 - (r.left + r.width / 2)) * k, y: (sc.top + sc.height * 0.48 - (r.top + r.height / 2)) * k,
                   scale: 0.8, opacity: 0, filter: 'blur(22px)', ...extra };
        };
        const to = { x: 0, y: 0, scale: 1, opacity: 1, filter: 'blur(0px)', ease: 'power3.out' };
        const tl = gsap.timeline({
          defaults: { ease: 'power2.out' },
          scrollTrigger: { trigger: host, start: 'top top', end: '+=85%', pin: stage, pinSpacing: true, scrub: 0.4, anticipatePin: 1, refreshPriority: 100,
            onUpdate: (s) => { prog = s.progress; } }
        });
        gsap.set([eyebrow, title, lead, chips.children, noteEl], { transformOrigin: '50% 50%' });
        tl.to(glow, { opacity: 0.22, yPercent: -22, ease: 'none', duration: 0.6 }, 0.05)
          .fromTo(core, { scale: 0.1, opacity: 0 }, { scale: 1.1, opacity: 1, ease: 'power2.in', duration: 0.18 }, 0.08)
          .to(core, { scale: 2.4, opacity: 0, ease: 'power2.out', duration: 0.2 }, 0.28)
          .fromTo(eyebrow, from(eyebrow, 0.4), { ...to, duration: 0.14 }, 0.2)
          .fromTo(title, from(title, 0.5, { scale: 0.75, filter: 'blur(28px)' }), { ...to, duration: 0.22 }, 0.24)
          .fromTo(lead, from(lead, 0.45), { ...to, duration: 0.14 }, 0.4);
        [...chips.children].forEach((c, i) => tl.fromTo(c, from(c, 0.55), { ...to, duration: 0.12 }, 0.48 + i * 0.05));
        tl.fromTo(noteEl, from(noteEl, 0.4, { scale: 0.9 }), { ...to, duration: 0.14 }, 0.66)
          .to({}, { duration: 0.02 }, 1);
      }, host);
    };
    const start = () => { if (!ctxG) build(); ScrollTrigger.refresh(); };
    (document.fonts?.ready ?? Promise.resolve()).then(start);
    return () => { io.disconnect(); window.removeEventListener('resize', onResize); cancelAnimationFrame(raf); ctxG?.revert(); };
  });
</script>

<header class="intro" bind:this={host}>
  <div class="stage" bind:this={stage}>
    <div class="glow" bind:this={glow} aria-hidden="true">
      <div class="horizon"></div>
    </div>
    <div class="dust" bind:this={dust} aria-hidden="true">
      {#each motes as m, i (i)}
        <i class="mote" style={`left:${m.x}%;--s:${m.s}px;--d:${m.d}s;--dl:${m.dl}s;--o:${m.o}`}></i>
      {/each}
    </div>
    <canvas class="warp" bind:this={cv} aria-hidden="true"></canvas>
    <div class="core" bind:this={core} aria-hidden="true"></div>

    <div class="copy">
      <div class="eyebrow" bind:this={eyebrow}>
        <span class="num">01</span><i></i><span>WORLD ONE · ENTRANCE</span>
      </div>
      <h2 id="rhythm-title" bind:this={title}>The rhythm<br /><em>of my day.</em></h2>
      <p class="lead" bind:this={lead}>What does my listening history reveal about an ordinary day?</p>

      <div class="row" bind:this={chips}>
        <a class="chip" href="#chapter-1"><b>1</b><span>The listening<br />clock</span></a>
        <a class="chip" href="#chapter-2"><b>2</b><span>My guess<br />vs. the data</span></a>
        <a class="chip" href="#chapter-3"><b>3</b><span>Musical<br />fingerprints</span></a>
      </div>
      <p class="src">THREE CHAPTERS · SPOTIFY EXTENDED STREAMING HISTORY · {rhythmData.period}</p>

      <div class="note" bind:this={noteEl}>
        <span class="script">{note}</span>
        <div class="arrow"><HandArrow from={{ x: 14, y: 20 }} to={{ x: 150, y: 190 }} w={170} h={210} bend={0.5} s={true} color="#FFC79A" width={3.6} delay={0.2} /></div>
      </div>
    </div>
  </div>
</header>

<style>
  .intro { position: relative; background: #100B1E; }
  .stage { position: relative; min-height: 100vh; min-height: 100svh; overflow: hidden; background: #100B1E; display: flex; align-items: center; }
  /* Identischer Verlauf wie der Lichtschein am unteren Rand des Portals, hier gespiegelt an die obere Kante: keine Naht. */
  .glow { position: absolute; inset: 0; pointer-events: none; will-change: transform, opacity; }
  .horizon { position: absolute; left: 50%; top: -34vh; width: 140vw; height: 70vh; transform: translateX(-50%);
    background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,160,110,.42) 0%, rgba(246,96,185,.22) 38%, transparent 72%); }
  .dust { position: absolute; inset: 0; pointer-events: none; overflow: hidden; opacity: .8; }
  .mote { position: absolute; top: 100%; width: var(--s); height: var(--s); border-radius: 50%; background: #FFD2A8; opacity: 0; box-shadow: 0 0 10px #FF945A; animation: rise var(--d) linear var(--dl) infinite; }
  .warp { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  .core { position: absolute; left: 50%; top: 48%; width: 46vmin; height: 46vmin; margin: -23vmin 0 0 -23vmin; border-radius: 50%; opacity: 0; pointer-events: none; mix-blend-mode: screen;
    background: radial-gradient(circle, rgba(255,236,214,.95) 0%, rgba(255,148,90,.7) 18%, rgba(246,96,185,.38) 42%, transparent 70%); filter: blur(6px); }
  @keyframes rise { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: var(--o); } 100% { transform: translateY(-90vh); opacity: 0; } }

  .copy { position: relative; z-index: 2; width: 100%; max-width: 1280px; margin: 0 auto; padding: clamp(5rem, 11vh, 7rem) clamp(1.4rem, 6vw, 5rem) clamp(1.5rem, 4vh, 3rem); }
  .copy > * { will-change: transform, opacity, filter; }
  .eyebrow { display: flex; align-items: center; gap: 1rem; font: 700 .7rem var(--font-body, 'DM Sans', sans-serif); letter-spacing: .22em; color: #FFE0C8; }
  .eyebrow .num { font: 700 .95rem var(--font-family, 'Syne', sans-serif); letter-spacing: .06em; color: #100B1E; background: #FFB98E; border-radius: 999px; padding: .25rem .7rem; }
  .eyebrow i { display: block; width: 40px; height: 1px; background: #FFB98E; opacity: .7; }
  h2 { margin: clamp(1rem, 2.6vh, 1.6rem) 0 0; font: 650 clamp(3.2rem, min(10vw, 17vh), 10rem)/.96 var(--font-family, 'Syne', sans-serif); letter-spacing: -.06em; color: #FFF6F0; text-shadow: 0 6px 60px rgba(16,11,30,.55); }
  h2 em { font: italic 400 1.08em/1 var(--font-editorial, 'Instrument Serif', serif); background: linear-gradient(90deg, #FFB98E, #F660B9); -webkit-background-clip: text; background-clip: text; color: transparent; letter-spacing: -.02em; padding-right: .12em; }
  .lead { margin: clamp(1rem, 2.4vh, 1.8rem) 0 0; max-width: 28ch; font: 400 clamp(1.3rem, min(2.4vw, 4vh), 2.4rem)/1.22 var(--font-editorial, 'Instrument Serif', serif); color: #EBD3E6; }

  .row { display: flex; flex-wrap: wrap; gap: .9rem; margin-top: clamp(1.4rem, 3vh, 2.6rem); }
  .chip { display: flex; align-items: center; gap: .85rem; padding: .85rem 1.2rem .85rem 1.05rem; border-radius: 20px;
    background: linear-gradient(145deg, rgba(255,255,255,.11), rgba(255,255,255,.03)); border: 1px solid rgba(255,255,255,.14);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 18px 40px -18px rgba(0,0,0,.65); backdrop-filter: blur(14px) saturate(1.3); -webkit-backdrop-filter: blur(14px) saturate(1.3); }
  a.chip { text-decoration: none; transition: transform .25s, border-color .25s; } a.chip:hover { transform: translateY(-3px); border-color: rgba(255,185,142,.7); }
  .chip b { font: 700 clamp(1.5rem, 2.4vw, 2.1rem)/1 var(--font-family, 'Syne', sans-serif); letter-spacing: -.03em; color: #F8EEE8; }
  .chip span { font: 500 .72rem/1.35 var(--font-body, 'DM Sans', sans-serif); letter-spacing: .04em; color: #CDB5D2; }

  .src { margin: .9rem 0 0; font: 600 .58rem var(--font-body, 'DM Sans', sans-serif); letter-spacing: .16em; color: #9F8AB0; }
  .note { position: relative; margin: clamp(.6rem, 2vh, 1.6rem) 0 0 clamp(2rem, 14vw, 12rem); display: flex; align-items: flex-start; gap: .4rem; width: fit-content; }
  .script { font: 400 clamp(1.7rem, 3vw, 2.8rem)/1.05 var(--font-hand, 'Mansalva', cursive); color: #FFD9B8; transform: rotate(-4deg); padding-top: .4rem; }
  .arrow { width: clamp(6.5rem, 11vw, 9.5rem); flex: none; }

  /* Ohne Animation: alles sofort sichtbar */
  :global(.static) .stage { min-height: 0; padding: 6rem 0 3rem; }
  :global(.static) .warp, :global(.static) .core { display: none; }
  @media (prefers-reduced-motion: reduce) { .mote { animation: none; } }
</style>

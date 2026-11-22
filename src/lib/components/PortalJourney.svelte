<script>
  import { onMount } from 'svelte';
  import HeroContent from './HeroContent.svelte';
  import { vertexShader, fragmentShader } from '../portal/shaders.js';
  import { PORTAL_TIMING, PORTAL_IDLE, MEMORY_CUES, cueOpacity, rangeProgress } from '../portal/portalTimeline.js';

  let wrapper;
  let canvas;
  let portalVisual;
  let progressBar;
  let handoff;
  let finaleBackdrop;
  let finaleHint;
  let hero;
  let arrival;
  let hint;
  let skip;
  let memories = [];
  let fallback = false;

  // Scroll choreography lives in portalTimeline.js; only the capsule idle
  // deformation lives in shaders.js.
  const thoughts = MEMORY_CUES;

  onMount(() => {
    let disposed = false;
    let cleanup = () => {};
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      fallback = true;
      return () => {};
    }

    async function boot() {
      let renderer;
      let material;
      let geometry;
      let texture1;
      let texture2;
      let frame;
      let trigger;
      let observer;
      let resize;
      let active = true;

      try {
        const [THREE, { ScrollTrigger }, { gsap }] = await Promise.all([
          import('three'),
          import('gsap/ScrollTrigger'),
          import('gsap')
        ]);
        if (disposed) return;
        gsap.registerPlugin(ScrollTrigger);

        const loader = new THREE.TextureLoader();
        [texture1, texture2] = await Promise.all([
          loader.loadAsync('/portal/capsule.jpg'),
          loader.loadAsync('/portal/tunnel.jpg')
        ]);
        if (disposed) { texture1.dispose(); texture2.dispose(); return; }
        for (const t of [texture1, texture2]) {
          t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
          t.minFilter = THREE.LinearMipmapLinearFilter;
          t.anisotropy = 8;
        }

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const uniforms = {
          t1: { value: texture1 }, t2: { value: texture2 },
          asp: { value: 1 }, p: { value: 0 }, time: { value: 0 },
          idleStrength: { value: PORTAL_IDLE.strength },
          idleSpeed: { value: PORTAL_IDLE.speed },
          // Original dimensions from the working Claude prototype.
          a1: { value: 1.1432926829268293 },
          a2: { value: 1.6082004555808656 }
        };
        material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
        geometry = new THREE.PlaneGeometry(2, 2);
        scene.add(new THREE.Mesh(geometry, material));

        resize = () => {
          const width = window.innerWidth;
          const height = window.innerHeight;
          renderer.setSize(width, height, false);
          uniforms.asp.value = width / height;
        };
        window.addEventListener('resize', resize, { passive: true });
        resize();

        // CSS sticky pins the visual stage; ScrollTrigger only maps the 0..1 travel.
        // Preserve the user's cue timestamps from Pass 01. The first 420vh of
        // scrolling are the ORIGINAL journey (0..1); only the last 70vh
        // extend the short cinematic chapter reveal.
        const mainShare = PORTAL_TIMING.mainTravelVh /
          (PORTAL_TIMING.mainTravelVh + PORTAL_TIMING.holdTravelVh);
        let target = 0;
        let current = 0;
        let targetHold = 0;
        let currentHold = 0;
        let targetOverall = 0;
        let currentOverall = 0;
        const updateScroll = (self) => {
          targetOverall = self.progress;
          target = Math.min(1, Math.max(0, self.progress / mainShare));
          targetHold = Math.min(1, Math.max(0, (self.progress - mainShare) / (1 - mainShare)));
        };
        trigger = ScrollTrigger.create({
          trigger: wrapper,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: updateScroll,
          onRefresh: updateScroll
        });
        updateScroll(trigger);
        observer = new IntersectionObserver(entries => { active = entries[0]?.isIntersecting ?? true; }, { threshold: 0 });
        observer.observe(wrapper);

        const clock = new THREE.Clock();
        const tick = () => {
          if (disposed) return;
          frame = requestAnimationFrame(tick);
          const dt = Math.min(clock.getDelta(), 0.05);
          current += (target - current) * (1 - Math.exp(-dt * 7));
          currentHold += (targetHold - currentHold) * (1 - Math.exp(-dt * 9));
          currentOverall += (targetOverall - currentOverall) * (1 - Math.exp(-dt * 9));

          // Pass 05: the actual WebGL artwork starts SMALLER and LOWER than the
          // editorial headline. It expands to full screen during the plunge.
          // This is a CSS presentation transform, NOT a change to the shader,
          // the idle glass motion or the user's scroll/memory cue timings.
          

          // The original tunnel algorithm is preserved; the shader now also has
          // a tiny time-driven glass-flow distortion while progress is near 0.
          uniforms.p.value = current;
          uniforms.time.value = clock.elapsedTime;

          // Dramaturgy: hero -> floating memories -> cinematic chapter hold -> data world.
          const heroOpacity = current <= PORTAL_TIMING.hero.end
            ? 1 - rangeProgress(current, PORTAL_TIMING.hero.end - PORTAL_TIMING.hero.fadeOut, PORTAL_TIMING.hero.end)
            : 0;
          if (hero) {
            hero.style.opacity = String(heroOpacity);
            hero.style.transform = `translate(-50%, ${-14 * (1 - heroOpacity)}px)`;
          }

          memories.forEach((el, i) => {
            const cue = thoughts[i];
            const opacity = cueOpacity(current, cue);
            // Position/weight are driven by opacity; text floats in and out of focus.
            el.style.opacity = String(opacity);
            el.style.transform = `translate3d(0, ${Math.round((1 - opacity) * 22)}px, 0)`;
            el.style.filter = `blur(${((1 - opacity) * 5).toFixed(2)}px)`;
          });

          // Short, deliberately staged chapter reveal: label -> title -> subtitle.
          // Your four memory-fragment timings and the original tunnel are untouched.
          const arrive = rangeProgress(current, PORTAL_TIMING.arrival.start, PORTAL_TIMING.arrival.full);
          const exit = rangeProgress(currentHold, PORTAL_TIMING.arrivalExit.start, PORTAL_TIMING.arrivalExit.end);
          const finaleOpacity = arrive * (1 - exit);
          const darken = rangeProgress(current, PORTAL_TIMING.darken.start, PORTAL_TIMING.darken.end);
          const labelReveal = rangeProgress(current, 0.902, 0.935);
          const kickerReveal = rangeProgress(current, 0.921, 0.948);
          const titleReveal = rangeProgress(current, 0.937, 0.978);
          const subtitleReveal = rangeProgress(current, 0.967, 0.996);
          const ruleReveal = rangeProgress(current, 0.957, 0.987);

          if (finaleBackdrop) finaleBackdrop.style.opacity = String(darken);
          if (arrival) {
            arrival.style.opacity = String(finaleOpacity);
            arrival.style.transform = `translate(-50%, -50%) translateY(${Math.round((1 - arrive) * 16 + exit * -18)}px)`;
            arrival.style.setProperty('--label-opacity', String(labelReveal));
            arrival.style.setProperty('--label-y', `${Math.round((1-labelReveal) * 12)}px`);
            arrival.style.setProperty('--kicker-opacity', String(kickerReveal));
            arrival.style.setProperty('--kicker-y', `${Math.round((1-kickerReveal) * 18)}px`);
            arrival.style.setProperty('--title-opacity', String(titleReveal));
            arrival.style.setProperty('--title-y', `${Math.round((1-titleReveal) * 40)}px`);
            arrival.style.setProperty('--title-scale', (0.963 + titleReveal*0.037).toFixed(4));
            arrival.style.setProperty('--title-blur', `${((1-titleReveal)*6).toFixed(1)}px`);
            arrival.style.setProperty('--subtitle-opacity', String(subtitleReveal));
            arrival.style.setProperty('--subtitle-y', `${Math.round((1-subtitleReveal) * 18)}px`);
            arrival.style.setProperty('--rule-scale', String(ruleReveal));
          }
          if (finaleHint) finaleHint.style.opacity = String(
            rangeProgress(currentHold, 0.04, 0.22) * (1 - rangeProgress(currentHold, 0.34, 0.54))
          );
          // Colour and luminance bridge into the first world's own backdrop.
          if (handoff) handoff.style.opacity = String(rangeProgress(currentHold, PORTAL_TIMING.handoff.start, PORTAL_TIMING.handoff.end));
          if (hint) hint.style.opacity = String(1 - rangeProgress(current, 0.02, 0.08));
          if (skip) skip.style.opacity = String(1 - rangeProgress(current, PORTAL_TIMING.darken.start, PORTAL_TIMING.darken.end));
          // The progress line includes the shorter finale section.
          if (progressBar) progressBar.style.transform = `scaleX(${currentOverall})`;

          // Avoid rendering on tabs/sections not currently visible.
          if (active && !document.hidden) renderer.render(scene, camera);
        };
        tick();
        cleanup = () => {
          if (frame) cancelAnimationFrame(frame);
          if (trigger) trigger.kill();
          if (observer) observer.disconnect();
          window.removeEventListener('resize', resize);
          material?.dispose(); geometry?.dispose();
          texture1?.dispose(); texture2?.dispose();
          renderer?.dispose();
        };
      } catch (err) {
        console.error('Portal/WebGL initialization failed; static fallback enabled.', err);
        fallback = true;
        if (frame) cancelAnimationFrame(frame);
        if (trigger) trigger.kill();
        if (observer) observer.disconnect();
        if (resize) window.removeEventListener('resize', resize);
        material?.dispose(); geometry?.dispose();
        texture1?.dispose(); texture2?.dispose();
        renderer?.dispose();
      }
    }
    boot();
    return () => { disposed = true; cleanup(); };
  });
</script>

<section bind:this={wrapper} id="top" class:still={fallback} class="portal-journey" aria-label="Introductory time-capsule journey">
  <div class="portal-stage">
    <div bind:this={portalVisual} class="portal-visual">
      {#if fallback}
        <img class="static-portal" src="/portal/capsule.jpg" alt="Iridescent violet, pink and gold liquid-glass portal" />
      {:else}
        <canvas bind:this={canvas} class="portal-canvas" aria-hidden="true"></canvas>
      {/if}
    </div>

    <!-- Editorial copy is physically above the scaled-and-lowered capsule. -->
    <div bind:this={hero} class="hero-copy" style:opacity={fallback ? '1' : '0'}>
      <HeroContent />
    </div>

    {#if !fallback}
      {#each thoughts as thought, i (thought.id)}
        <div
          bind:this={memories[i]}
          class="memory"
          class:right={thought.side === 'right'}
          aria-hidden="true"
          style:opacity="0"
        >
          <p class="memory-counter">{thought.eyebrow}</p>
          <p class="memory-thought">{thought.title}<br /><em>{thought.emphasis}</em></p>
          <span class="memory-accent" aria-hidden="true"></span>
        </div>
      {/each}
      <div bind:this={finaleBackdrop} class="finale-backdrop" aria-hidden="true" style:opacity="0"></div>
      <div bind:this={handoff} class="portal-handoff" aria-hidden="true" style:opacity="0"></div>
      <div bind:this={arrival} class="arrival" aria-hidden="true" style:opacity="0">
        <span class="arrival-index" aria-hidden="true">01</span>
        <span class="arrival-overline">THE SOUND OF MY YEARS <i aria-hidden="true"></i> CHAPTER ONE</span>
        <span class="arrival-kicker">WORLD 01 / LISTENING PATTERNS</span>
        <p class="arrival-title">A day measured<br /><em>in music.</em></p>
        <span class="arrival-rule" aria-hidden="true"></span>
        <p class="arrival-subtitle">An ordinary clock tells the time.<br />Mine tells me when I listened.</p>
      </div>
      <div bind:this={finaleHint} class="finale-hint" aria-hidden="true" style:opacity="0">SCROLL TO EXPLORE THE DATA <span>↓</span></div>
    {/if}

    <a bind:this={skip} class="skip" href="#rhythm">SKIP TO THE DATA ↓</a>
    <div bind:this={hint} class="scroll-hint" aria-hidden="true">SCROLL TO ENTER THE CAPSULE <span>↓</span></div>
    <div class="progress-track" aria-hidden="true"><div bind:this={progressBar} class="progress-fill"></div></div>
    <span class="sr-only">Scroll through an abstract liquid-glass portal. Four memory questions introduce the data journey. Use Skip to the Data to bypass this animation.</span>
  </div>
</section>

<style>
  /* Unchanged: 420vh journey + 70vh finale + 100vh pinned viewport = 590vh. */
  .portal-journey { height: 590vh; height: 590svh; position: relative; background: #05020a; }
  .portal-stage { position: sticky; top: 0; height: 100vh; height: 100svh; width:100%; overflow:hidden; isolation:isolate; background: #05020a; }
  .portal-visual {
  position: absolute;
  inset: 0;
  z-index: 1;

  width: 100%;
  height: 100%;

  transform: none;
  mask: none;
  -webkit-mask: none;
}
  .portal-canvas, .static-portal { position:absolute; inset:0; width:100%; height:100%; display:block; }
  .static-portal { object-fit:contain; opacity:.85; }
  .portal-stage:after { content:''; position:absolute; z-index:2; inset:0; background:linear-gradient(to bottom,rgba(4,2,9,.28),transparent 25%,transparent 72%,rgba(4,2,9,.43)); pointer-events:none; }
  .hero-copy {
  position: absolute;
  z-index: 4;

  top: clamp(6rem, 10vh, 8rem);
  left: 50%;
  width: min(94vw, 1500px);

  transform: translateX(-50%);
  text-align: center;
  pointer-events: none;

  will-change: opacity, transform;
}
  /* No glass cards inside the tunnel: the memories seem suspended in space. */
  .memory { position:absolute; z-index:4; left:8vw; top:43%; width:min(38rem,46vw); text-align:left; pointer-events:none; will-change:opacity,transform,filter; padding:1.2rem 0 1.5rem; }
  .memory.right { left:auto; right:8vw; top:51%; text-align:right; }
  .memory::before { content:''; position:absolute; z-index:-1; inset:-3rem -4rem; background:radial-gradient(ellipse at 45% 50%, rgba(8,2,15,.68), rgba(8,2,15,.19) 53%, transparent 78%); filter:blur(8px); }
  .memory.right::before { background:radial-gradient(ellipse at 55% 50%, rgba(8,2,15,.68), rgba(8,2,15,.19) 53%, transparent 78%); }
  .memory-counter { letter-spacing:.28em; font-size:clamp(.62rem,.78vw,.78rem); font-weight:700; color:#ffd0a8; text-shadow:0 2px 15px rgba(0,0,0,.94); }
  .memory-thought { font-size:clamp(2.3rem,5vw,5.7rem); font-weight:550; line-height:1.06; letter-spacing:-.058em; margin:1.15rem 0; color:#fff0fa; text-shadow:0 4px 35px rgba(0,0,0,.95); }
  .memory-thought em { font-family:Georgia,serif; font-weight:400; letter-spacing:-.038em; color:#ffe2ef; }
  .memory-accent { display:inline-block; width:clamp(42px,5vw,80px); height:1px; background:linear-gradient(90deg,#fdc799,#ed8fc7); box-shadow:0 0 14px #e79fd1; }
  /* Deep contrast instead of a washed-out white shader background. */
  /* Dark cinematic matte. Warm lens-like colour stays at the perimeter. */
  .finale-backdrop { position:absolute; z-index:3; inset:0; pointer-events:none;
    background:
      radial-gradient(ellipse 38% 56% at 50% 48%, rgba(77,28,82,.30) 0%, rgba(11,4,26,.88) 70%, rgba(5,2,12,.96) 100%),
      radial-gradient(ellipse 44% 58% at 90% 16%, rgba(181,73,123,.24),transparent 72%),
      radial-gradient(ellipse 40% 50% at 8% 84%, rgba(93,50,160,.24),transparent 70%),
      linear-gradient(135deg,#10051f,#06020e);
    will-change:opacity;
  }
  .portal-handoff { position:absolute; z-index:4; inset:0; pointer-events:none; opacity:0;
    background:radial-gradient(ellipse at 65% 35%, #291537 0%, #100a1e 39%, #0a0714 90%); will-change:opacity;
  }
  /* Editorial title treatment, not a second static slideshow card. */
  .arrival { position:absolute; z-index:6; left:50%; top:48%;
    transform:translate(-50%,-50%); text-align:center; width:min(94%,1250px); pointer-events:none;
    display:flex; flex-direction:column; align-items:center; gap:0;
    isolation:isolate; will-change:opacity,transform;
  }
  .arrival::before { content:''; position:absolute; z-index:-1; pointer-events:none;
    width:min(95vw,1100px); height:min(75vh,660px); top:50%; left:50%;
    transform:translate(-50%,-50%);
    background:
      radial-gradient(ellipse 43% 42% at 31% 52%, rgba(213,83,172,.20), transparent 82%),
      radial-gradient(ellipse 42% 47% at 75% 32%, rgba(152,80,233,.19), transparent 83%),
      radial-gradient(ellipse 45% 49% at 50% 80%, rgba(255,161,96,.095), transparent 77%);
    filter:blur(37px);
  }
  .arrival-index { position:absolute; z-index:-1; top:-11vh; right:2%;
    font-size:clamp(12rem,29vw,31rem); line-height:1; font-weight:800;
    color:transparent; -webkit-text-stroke:1px rgba(224,146,222,.15);
    opacity:var(--title-opacity,0); letter-spacing:-.12em; user-select:none;
  }
  .arrival-overline { color:#d8bad8; font-size:clamp(.55rem,.7vw,.75rem); font-weight:600;
    letter-spacing:.27em; margin-bottom:clamp(1.5rem,3.4vh,3rem);
    opacity:var(--label-opacity,0); transform:translateY(var(--label-y,12px)); }
  .arrival-overline i { display:inline-block; margin:0 1.5em; width:2rem; height:1px; vertical-align:middle; background:#ae7a9b; }
  .arrival-kicker { display:block; color:#ffb98e; font-size:clamp(.7rem,1vw,.9rem);
    letter-spacing:.29em; font-weight:700; margin-bottom:1.5rem;
    opacity:var(--kicker-opacity,0); transform:translateY(var(--kicker-y,18px)); }
  .arrival-title { color:#fff5ef; margin:0; font-family:Georgia,serif;
    font-size:clamp(3.6rem,8.8vw,9.5rem); line-height:.94; letter-spacing:-.075em; font-weight:400;
    opacity:var(--title-opacity,0);
    transform:translateY(var(--title-y,40px)) scale(var(--title-scale,.963));
    filter:blur(var(--title-blur,6px));
    text-shadow:0 8px 50px rgba(3,0,8,.65),0 0 80px rgba(225,107,186,.10); }
  .arrival-title em { font-weight:400; color:#f4c1dd; font-style:italic; }
  .arrival-rule { display:block; width:clamp(80px,10vw,150px); height:2px;
    background:linear-gradient(90deg,transparent,#ffbfad,#e4a7e8,transparent);
    box-shadow:0 0 20px rgba(255,159,214,.45); margin:clamp(1.7rem,4vh,3.1rem) 0 1.25rem;
    transform:scaleX(var(--rule-scale,0)); transform-origin:center;
  }
  .arrival-subtitle { font-family:Georgia,serif; font-style:italic; font-weight:400; margin:0;
    font-size:clamp(1rem,1.65vw,1.5rem); line-height:1.5; color:#e9d2e9; letter-spacing:.005em;
    opacity:var(--subtitle-opacity,0); transform:translateY(var(--subtitle-y,18px)); }
  .finale-hint { position:absolute; z-index:7; left:50%; bottom:clamp(2.5rem,6.5vh,5rem);
    transform:translateX(-50%); color:#f7d7e9; letter-spacing:.22em;
    font-weight:600; font-size:clamp(.58rem,.72vw,.75rem); white-space:nowrap; pointer-events:none; }
  .finale-hint span { padding-left:.7em; color:#ffc7a4; }

  .skip { position:absolute; z-index:8; bottom:4rem; right:6vw; font-size:.62rem; letter-spacing:.18em; text-decoration:none; color:#f7e8f5; opacity:.88; text-shadow:0 2px 12px #05020a; }
  .skip:hover { text-decoration:underline; }
  .scroll-hint { position:absolute; z-index:4; bottom:4rem; left:6vw; font-size:.6rem; letter-spacing:.2em; text-shadow:0 1px 12px #05020a; }
  .scroll-hint span { margin-left:.8rem; }
  .progress-track { position:absolute; z-index:8; bottom:0; left:0; width:100%; height:3px; background:rgba(255,255,255,.08); }
  .progress-fill { width:100%; height:100%; background:linear-gradient(90deg,#8b5bc9,#ed8fc7,#f8a77d); transform:scaleX(0); transform-origin:left; }
  .still { height:100svh; }

  @media (max-width:800px) {
    .arrival { top:48%; width:92%; }
    .arrival-index { right:-1%; top:-5vh; font-size:48vw; }
    .arrival-title { font-size:clamp(3.15rem,11vw,6rem); }
    .arrival-overline { letter-spacing:.14em; margin-bottom:2rem; }
    .arrival-kicker { letter-spacing:.17em; }
    .arrival-subtitle { font-size:clamp(1rem,3.5vw,1.3rem); }
    .finale-hint { bottom:4rem; font-size:.56rem; letter-spacing:.12em; }
    .hero-copy { top:clamp(5.4rem,10vh,6.5rem); width:94%; }
    .portal-visual {
  position: absolute;
  inset: 0;
  z-index: 1;

  width: 100%;
  height: 100%;

  transform: none;
  mask: none;
  -webkit-mask: none;
}
    .memory,.memory.right { left:7vw; right:7vw; width:auto; text-align:left; top:43%; }
    .memory::before,.memory.right::before { background:radial-gradient(ellipse at 45% 50%, rgba(8,2,15,.76), rgba(8,2,15,.24) 56%, transparent 82%); }
    .memory-thought { font-size:clamp(2.05rem,9vw,4.2rem); }
    .skip { right:5vw; bottom:2.5rem; }
    .scroll-hint { left:5vw; bottom:2.5rem; max-width:45%; line-height:1.7; }
  }
  @media (prefers-reduced-motion: reduce) {
    .memory, .hero-copy, .arrival { filter:none !important; }
  }
</style>

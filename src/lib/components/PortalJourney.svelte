<script>
  import { onMount } from 'svelte';
  import { vertexShader, fragmentShader } from '../portal/shaders.js';
  import { PORTAL_TIMING, MEMORY_CUES, cueOpacity, rangeProgress } from '../portal/portalTimeline.js';

  let wrapper;
  let canvas;
  let progressBar;
  let topbar;
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
        // scrolling are the ORIGINAL journey (0..1); the last 200vh are a
        // dedicated cinematic finale hold. No memory cue has to be retimed.
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

          if (topbar) {
            const visible = 1 - rangeProgress(current, 0.12, PORTAL_TIMING.navigationEnd);
            topbar.style.opacity = String(visible);
            topbar.style.pointerEvents = visible < 0.01 ? 'none' : 'auto';
            topbar.inert = visible < 0.01;
          }

          memories.forEach((el, i) => {
            const cue = thoughts[i];
            const opacity = cueOpacity(current, cue);
            // Position/weight are driven by opacity; text floats in and out of focus.
            el.style.opacity = String(opacity);
            el.style.transform = `translate3d(0, ${Math.round((1 - opacity) * 22)}px, 0)`;
            el.style.filter = `blur(${((1 - opacity) * 5).toFixed(2)}px)`;
          });

          // The final chapter is NOT a short fading caption. It is an editorial
          // moment held for 200vh after the original shader journey ends.
          const arrive = rangeProgress(current, PORTAL_TIMING.arrival.start, PORTAL_TIMING.arrival.full);
          const exit = rangeProgress(currentHold, PORTAL_TIMING.arrivalExit.start, PORTAL_TIMING.arrivalExit.end);
          const finaleOpacity = arrive * (1 - exit);
          const darken = rangeProgress(current, PORTAL_TIMING.darken.start, PORTAL_TIMING.darken.end);

          if (finaleBackdrop) finaleBackdrop.style.opacity = String(darken);
          if (arrival) {
            arrival.style.opacity = String(finaleOpacity);
            arrival.style.transform = `translate(-50%, -50%) translateY(${Math.round((1 - arrive) * 42 + exit * -28)}px) scale(${(0.955 + arrive * 0.045).toFixed(3)})`;
            arrival.style.filter = `blur(${((1 - arrive) * 8 + exit * 5).toFixed(2)}px)`;
          }
          if (finaleHint) finaleHint.style.opacity = String(
            rangeProgress(currentHold, 0.08, 0.20) * (1 - rangeProgress(currentHold, 0.73, 0.89))
          );
          // Match the first world's background before the sticky stage releases.
          if (handoff) handoff.style.opacity = String(rangeProgress(currentHold, PORTAL_TIMING.handoff.start, PORTAL_TIMING.handoff.end));
          if (hint) hint.style.opacity = String(1 - rangeProgress(current, 0.02, 0.08));
          if (skip) skip.style.opacity = String(1 - rangeProgress(current, PORTAL_TIMING.darken.start, PORTAL_TIMING.darken.end));
          // The progress line now includes the two additional viewports of hold.
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
    {#if fallback}
      <img class="static-portal" src="/portal/capsule.jpg" alt="Iridescent violet, pink and gold liquid-glass portal" />
    {:else}
      <canvas bind:this={canvas} class="portal-canvas" aria-hidden="true"></canvas>
    {/if}

    <nav bind:this={topbar} class="topbar" aria-label="Project navigation">
      <span>THE SOUND OF MY YEARS</span>
      <a href="#rhythm">THE JOURNEY <span aria-hidden="true">↗</span></a>
    </nav>

    <div bind:this={hero} class="hero-copy" style:opacity={fallback ? '1' : '0'}>
      <p class="eyebrow">A PERSONAL MUSIC TIME CAPSULE <span class="divider">/</span> 2018—2026</p>
      <h1>THE SOUND<br />OF MY YEARS</h1>
      <p class="opening-question">What if my music remembers more than I do?</p>
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
  /* 420vh original journey + 200vh extra pinned finale + one viewport stage. */
  .portal-journey { height: 720vh; height: 720svh; position: relative; background: #05020a; }
  .portal-stage { position: sticky; top: 0; height: 100vh; height: 100svh; width:100%; overflow:hidden; isolation:isolate; background: radial-gradient(circle at 50% 50%, #291034 0%, #05020a 68%); }
  .portal-canvas, .static-portal { position:absolute; inset:0; width:100%; height:100%; display:block; }
  .static-portal { object-fit:contain; opacity:.85; }
  .portal-stage:after { content:''; position:absolute; z-index:2; inset:0; background:linear-gradient(to bottom,rgba(4,2,9,.28),transparent 25%,transparent 72%,rgba(4,2,9,.43)); pointer-events:none; }
  .topbar { position:absolute; z-index:5; top:2.5rem; left:6vw; right:6vw; display:flex; align-items:center; justify-content:space-between; gap:1rem; font-weight:650; font-size:.7rem; letter-spacing:.15em; text-shadow:0 2px 16px #160617; }
  .topbar a { text-decoration:none; color:#ffe3f4; opacity:.82; }
  .hero-copy { position:absolute; z-index:4; top:13vh; left:50%; width:min(94%,1200px); transform:translateX(-50%); text-align:center; pointer-events:none; text-shadow:0 4px 35px rgba(0,0,0,.75); will-change:opacity,transform; }
  .eyebrow { color:#ffe4d9; font-size:clamp(.55rem,.9vw,.85rem); letter-spacing:.25em; font-weight:700; }
  .divider { margin:0 1em; opacity:.6; }
  h1 { color:#f8eefa; font-size:clamp(3.1rem,7.6vw,8rem); letter-spacing:-.06em; line-height:.93; margin:.6rem 0 1rem; font-weight:720; }
  .opening-question { font-family:Georgia,serif; font-style:italic; font-size:clamp(1.12rem,2.2vw,2rem); font-weight:400; color:#fff0f2; }

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
  .finale-backdrop { position:absolute; z-index:3; inset:0; pointer-events:none;
    background: radial-gradient(ellipse 65% 58% at 52% 45%, rgba(73,27,83,.80) 0%, rgba(25,9,39,.94) 54%, rgba(5,2,12,.98) 100%),
                linear-gradient(135deg,rgba(7,2,19,.96),rgba(41,13,55,.94));
    will-change:opacity;
  }
  .portal-handoff { position:absolute; z-index:4; inset:0; pointer-events:none; opacity:0;
    background:radial-gradient(ellipse at 65% 35%, #291537 0%, #100a1e 39%, #0a0714 90%); will-change:opacity;
  }
  .arrival { position:absolute; z-index:6; left:50%; top:47%;
    transform:translate(-50%,-50%); text-align:center; width:min(94%,1250px); pointer-events:none;
    display:flex; flex-direction:column; align-items:center; gap:0;
    will-change:opacity,transform,filter;
  }
  .arrival-overline { color:rgba(239,201,236,.78); font-size:clamp(.55rem,.7vw,.75rem); font-weight:600;
    letter-spacing:.27em; margin-bottom:clamp(1.6rem,4vh,3.6rem); }
  .arrival-overline i { display:inline-block; margin:0 1.5em; width:2rem; height:1px; vertical-align:middle; background:#ae7a9b; }
  .arrival-kicker { display:block; color:#ffc6a3; font-size:clamp(.7rem,1vw,.9rem);
    letter-spacing:.29em; font-weight:700; margin-bottom:1.3rem; }
  .arrival-title { color:#fff4ed; margin:0; font-family:Georgia,serif;
    font-size:clamp(3.5rem,8.1vw,9rem); line-height:.96; letter-spacing:-.07em; font-weight:400;
    text-shadow:0 4px 38px rgba(3,0,8,.45),0 0 72px rgba(247,145,211,.16); }
  .arrival-title em { font-weight:400; color:#ffe2f0; font-style:italic; }
  .arrival-rule { display:block; width:clamp(64px,7vw,116px); height:1px;
    background:linear-gradient(90deg,transparent,#ffbfad,#e4a7e8,transparent);
    box-shadow:0 0 20px rgba(255,159,214,.75); margin:clamp(1.6rem,4vh,3.4rem) 0 1.25rem; }
  .arrival-subtitle { font-family:Georgia,serif; font-style:italic; font-weight:400; margin:0;
    font-size:clamp(1rem,1.65vw,1.5rem); line-height:1.5; color:#f1d9e8; letter-spacing:.005em; }
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
    .arrival-title { font-size:clamp(3.15rem,11vw,6rem); }
    .arrival-overline { letter-spacing:.14em; margin-bottom:2rem; }
    .arrival-kicker { letter-spacing:.17em; }
    .arrival-subtitle { font-size:clamp(1rem,3.5vw,1.3rem); }
    .finale-hint { bottom:4rem; font-size:.56rem; letter-spacing:.12em; }
    .topbar { top:1.5rem; font-size:.58rem; }
    .hero-copy { top:22vh; }
    h1 { font-size:clamp(2.65rem,12.5vw,5.2rem); }
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

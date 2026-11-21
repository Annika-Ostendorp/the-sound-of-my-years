<script>
  import { onMount } from 'svelte';
  import { vertexShader, fragmentShader } from '../portal/shaders.js';

  let wrapper;
  let canvas;
  let progressBar;
  let hero;
  let arrival;
  let hint;
  let memories = [];
  let fallback = false;

  // Deliberate narrative timing. These quotes appear *inside the tunnel*.
  // Start/end values are normalized scroll-progress intervals (0..1).
  const thoughts = [
    { title: 'I thought I knew', sub: 'my listening habits.', start: 0.39, end: 0.51 },
    { title: 'Did those songs', sub: 'ever really leave?', start: 0.52, end: 0.64 },
    { title: 'RAYE was always there.', sub: 'Wasn’t she?', start: 0.65, end: 0.77 },
    { title: 'Which days', sub: 'would sound the same?', start: 0.78, end: 0.89 },
  ];

  function windowOpacity(p, start, end, fade = 0.025) {
    const fadeIn = Math.max(0, Math.min(1, (p - start) / fade));
    const fadeOut = Math.max(0, Math.min(1, (end - p) / fade));
    return Math.min(fadeIn, fadeOut);
  }

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
        let target = 0;
        let current = 0;
        trigger = ScrollTrigger.create({
          trigger: wrapper,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => { target = self.progress; },
          onRefresh: (self) => { target = self.progress; }
        });
        target = trigger.progress;
        observer = new IntersectionObserver(entries => { active = entries[0]?.isIntersecting ?? true; }, { threshold: 0 });
        observer.observe(wrapper);

        const clock = new THREE.Clock();
        let lastTime = 0;
        const tick = () => {
          if (disposed) return;
          frame = requestAnimationFrame(tick);
          const dt = Math.min(clock.getDelta(), 0.05);
          current += (target - current) * (1 - Math.exp(-dt * 7));

          // Exact visual shader is preserved; only its scroll progress changes.
          uniforms.p.value = current;
          uniforms.time.value = clock.elapsedTime;

          if (hero) hero.style.opacity = String(windowOpacity(current, -0.08, 0.25, 0.07));
          memories.forEach((el, i) => {
            el.style.opacity = String(windowOpacity(current, thoughts[i].start, thoughts[i].end));
            el.style.transform = `translate(-50%, calc(-50% + ${(1 - windowOpacity(current, thoughts[i].start, thoughts[i].end)) * 16}px))`;
          });
          if (arrival) arrival.style.opacity = String(windowOpacity(current, 0.89, 1.06, 0.035));
          if (hint) hint.style.opacity = current < 0.06 ? '.65' : '0';
          if (progressBar) progressBar.style.transform = `scaleX(${current})`;

          // Avoid rendering on tabs/sections not currently visible.
          if (active && !document.hidden) renderer.render(scene, camera);
          lastTime = clock.elapsedTime;
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

    <nav class="topbar" aria-label="Project navigation">
      <span>THE SOUND OF MY YEARS</span>
      <a href="#rhythm">THE JOURNEY <span aria-hidden="true">↗</span></a>
    </nav>

    <div bind:this={hero} class="hero-copy" style:opacity={fallback ? '1' : '0'}>
      <p class="eyebrow">A PERSONAL MUSIC TIME CAPSULE <span class="divider">/</span> 2018—2026</p>
      <h1>THE SOUND<br />OF MY YEARS</h1>
      <p class="opening-question">What if my music remembers more than I do?</p>
    </div>

    {#if !fallback}
      {#each thoughts as thought, i}
        <div bind:this={memories[i]} class="memory" aria-hidden="true" style:opacity="0">
          <div class="memory-counter">A FRAGMENT OF MEMORY / 0{i + 1}</div>
          <p>{thought.title}<br /><em>{thought.sub}</em></p>
        </div>
      {/each}
      <div bind:this={arrival} class="arrival" aria-hidden="true" style:opacity="0">
        <span>BEYOND THE GLASS</span>
        <p>The memory becomes data.</p>
      </div>
    {/if}

    <a class="skip" href="#rhythm">SKIP TO THE DATA ↓</a>
    <div bind:this={hint} class="scroll-hint" aria-hidden="true">SCROLL TO ENTER THE CAPSULE <span>↓</span></div>
    <div class="progress-track" aria-hidden="true"><div bind:this={progressBar} class="progress-fill"></div></div>
    <span class="sr-only">Scroll through an abstract liquid-glass portal. Four memory questions introduce the data journey. Use Skip to the Data to bypass this animation.</span>
  </div>
</section>

<style>
  .portal-journey { height: 520vh; position: relative; background: #05020a; }
  .portal-stage { position: sticky; top: 0; height: 100vh; height: 100svh; width:100%; overflow:hidden; isolation:isolate; background: radial-gradient(circle at 50% 50%, #291034 0%, #05020a 68%); }
  .portal-canvas, .static-portal { position:absolute; inset:0; width:100%; height:100%; display:block; }
  .static-portal { object-fit:contain; opacity:.85; }
  .portal-stage:after { content:''; position:absolute; inset:0; background:linear-gradient(to bottom,rgba(4,2,9,.24),transparent 22%,transparent 72%,rgba(4,2,9,.4)); pointer-events:none; }
  .topbar { position:absolute; z-index:5; top:2.5rem; left:6vw; right:6vw; display:flex; align-items:center; justify-content:space-between; gap:1rem; font-weight:650; font-size:.7rem; letter-spacing:.15em; text-shadow:0 2px 16px #160617; }
  .topbar a { text-decoration:none; color:#ffe3f4; opacity:.82; }
  .hero-copy { position:absolute; z-index:4; top:13vh; left:50%; width:min(94%,1200px); transform:translateX(-50%); text-align:center; pointer-events:none; text-shadow:0 4px 35px rgba(0,0,0,.75); }
  .eyebrow { color:#ffe4d9; font-size:clamp(.55rem,.9vw,.85rem); letter-spacing:.25em; font-weight:700; }
  .divider { margin:0 1em; opacity:.6; }
  h1 { color:#f8eefa; font-size:clamp(3.1rem,7.6vw,8rem); letter-spacing:-.06em; line-height:.93; margin:.6rem 0 1rem; font-weight:720; }
  .opening-question { font-family:Georgia,serif; font-style:italic; font-size:clamp(1.12rem,2.2vw,2rem); font-weight:400; color:#fff0f2; }
  .memory, .arrival { position:absolute; z-index:4; left:50%; top:49%; transform:translate(-50%,-50%); text-align:center; width:min(90%,900px); pointer-events:none; text-shadow:0 0 22px #260c2d,0 2px 15px #000; }
  .memory-counter,.arrival span { letter-spacing:.25em; font-size:clamp(.58rem,.8vw,.75rem); font-weight:650; color:#ffcbab; }
  .memory p,.arrival p { font-size:clamp(2.1rem,6vw,5.8rem); font-weight:600; line-height:1.04; letter-spacing:-.05em; margin:1.3rem 0; color:#fff0fa; }
  .memory em { font-family:Georgia,serif; font-weight:400; letter-spacing:-.025em; font-size:.85em; color:#ffe0ed; }
  .arrival p { font-family:Georgia,serif; font-style:italic; font-weight:400; color:#fff2e3; }
  .skip { position:absolute; z-index:5; bottom:4rem; right:6vw; font-size:.62rem; letter-spacing:.18em; text-decoration:none; color:#f7e8f5; opacity:.78; }
  .scroll-hint { position:absolute; z-index:4; bottom:4rem; left:6vw; font-size:.6rem; letter-spacing:.2em; }
  .scroll-hint span { margin-left:.8rem; }
  .progress-track { position:absolute; z-index:6; bottom:0; left:0; width:100%; height:3px; background:rgba(255,255,255,.08); }
  .progress-fill { width:100%; height:100%; background:linear-gradient(90deg,#8b5bc9,#ed8fc7,#f8a77d); transform:scaleX(0); transform-origin:left; }
  .still { height:100svh; }
  @media (max-width:700px) {
    .topbar { top:1.5rem; font-size:.58rem; }
    .hero-copy { top:22vh; }
    h1 { font-size:clamp(2.65rem,12.5vw,5.2rem); }
    .skip { right:5vw; bottom:2.5rem; }
    .scroll-hint { left:5vw; bottom:2.5rem; max-width:45%; line-height:1.7; }
  }
</style>

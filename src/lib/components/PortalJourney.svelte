<script>
  import { onMount } from 'svelte';
  import HeroContent from './HeroContent.svelte';
  import {
    vertexShader, fragmentShader,
    postVertexShader, postFragmentShader,
    particleVertexShader, particleFragmentShader
  } from '../portal/shaders.js';
  import { PORTAL_TIMING, PORTAL_IDLE, MEMORY_CUES, SIDE_FLIGHT, cueOpacity, rangeProgress, sideCardState } from '../portal/portalTimeline.js';
  import { cards as portalCards, waveBars } from '../portal/portalContent.js';
  import CardBody from './portal/CardBody.svelte';
  import QuoteArt from './portal/QuoteArt.svelte';
  import rhythmPreview from '../data/rhythm_2026_preview.json';

  // Die 24 Stunden meines Durchschnittstags als Mini-Waveform: Vorschau auf die Uhr in World 01 (echte Daten).
  const _day = rhythmPreview.profiles.find((p) => p.id === 'ALL').hours;
  const _dayMax = Math.max(...(_day ?? [1]));
  const dayBars = _day.map((v, i) => ({ h: Math.max(0.08, v / _dayMax), peak: v === _dayMax }));

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
  let cardEls = [];
  let fallback = false;

  // Platzhalter-Daten: siehe src/lib/data/portal_cards.json (Mapping auf capsule.json / memories.json dort erklärt).
  const cardData = portalCards;
  // Seitenlage der Karten (vw/vh vom Zentrum), bewusst gegenüber dem jeweils sichtbaren Zitat und
  // oberhalb/unterhalb des Textbandes, damit Zitate lesbar bleiben.
  // Jede Seitenkarte steht auf der Seite GEGENÜBER der gerade sichtbaren Hypothesen-Karte und gleitet von dort herein.
  const SLOT = (SIDE_FLIGHT.end - SIDE_FLIGHT.start) / cardData.length;
  const CARD_LAYOUT = cardData.map((_, i) => {
    const mid = SIDE_FLIGHT.start + (i + 0.5) * SLOT;
    const cue = MEMORY_CUES.find((c) => mid >= c.start && mid <= c.end)
      ?? MEMORY_CUES.reduce((a, c) => (Math.abs((c.start + c.end) / 2 - mid) < Math.abs((a.start + a.end) / 2 - mid) ? c : a));
    const side = cue.side === 'left' ? 1 : -1;
    return { x: side * 29, y: i % 2 ? 23 : -22, ry: -side * 13, rz: side * (i % 2 ? 2.2 : -2.2), dir: side };
  });
  const smoothstepLock = (o) => { const t = Math.max(0, Math.min(1, (o - 0.94) / 0.06)); return t * t * (3 - 2 * t); };

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
      let rt;
      let postMaterial;
      let particleGeometry;
      let particleMaterial;
      let frame;
      let trigger;
      let observer;
      let resize;
      let active = true;
      let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

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
          loader.loadAsync(`${import.meta.env.BASE_URL}portal/capsule.jpg`),
          loader.loadAsync(`${import.meta.env.BASE_URL}portal/tunnel.jpg`)
        ]);
        if (disposed) { texture1.dispose(); texture2.dispose(); return; }
        for (const t of [texture1, texture2]) {
          t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
          t.minFilter = THREE.LinearMipmapLinearFilter;
          t.anisotropy = 8;
        }

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
        renderer.setPixelRatio(pixelRatio);
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

        // --- Zeitreise-Erweiterung -------------------------------------------------
        // 1) Tunnel (unverändert) -> RenderTarget, 2) Partikel additiv, 3) Post-Pass
        //    (chromatische Aberration am Rand + Atem-Puls) -> Canvas.
        renderer.autoClear = false;
        const bufferSize = new THREE.Vector2();
        renderer.getDrawingBufferSize(bufferSize);
        rt = new THREE.WebGLRenderTarget(bufferSize.x || 2, bufferSize.y || 2, {
          minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false
        });
        const postUniforms = {
          tex: { value: rt.texture }, chroma: { value: 0 }, breath: { value: 0 }, time: { value: 0 }
        };
        postMaterial = new THREE.ShaderMaterial({
          uniforms: postUniforms, vertexShader: postVertexShader, fragmentShader: postFragmentShader,
          depthTest: false, depthWrite: false
        });
        const postScene = new THREE.Scene();
        postScene.add(new THREE.Mesh(geometry, postMaterial));

        const PARTICLES = 520;
        const pPos = new Float32Array(PARTICLES * 3);
        const pSize = new Float32Array(PARTICLES);
        const pHue = new Float32Array(PARTICLES);
        for (let i = 0; i < PARTICLES; i++) {
          const radius = 1.2 + Math.pow(Math.random(), 0.7) * 7;
          const angle = Math.random() * Math.PI * 2;
          pPos[i * 3] = Math.cos(angle) * radius;
          pPos[i * 3 + 1] = Math.sin(angle) * radius;
          pPos[i * 3 + 2] = Math.random();          // Phase entlang der Tunneltiefe
          pSize[i] = 0.8 + Math.random() * 2.2;
          pHue[i] = Math.random();
        }
        particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
        particleGeometry.setAttribute('aHue', new THREE.BufferAttribute(pHue, 1));
        const particleUniforms = {
          uFlow: { value: 0 }, uDepth: { value: 38 }, uVel: { value: 0 },
          uAlpha: { value: 0 }, uPx: { value: renderer.getPixelRatio() }
        };
        particleMaterial = new THREE.ShaderMaterial({
          uniforms: particleUniforms, vertexShader: particleVertexShader, fragmentShader: particleFragmentShader,
          transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
        });
        const points = new THREE.Points(particleGeometry, particleMaterial);
        points.frustumCulled = false;
        const particleScene = new THREE.Scene();
        particleScene.add(points);
        const particleCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 80);
        // ---------------------------------------------------------------------------

        resize = () => {
          const width = window.innerWidth;
          const height = window.innerHeight;
          renderer.setSize(width, height, false);
          uniforms.asp.value = width / height;
          if (rt) {
            renderer.getDrawingBufferSize(bufferSize);
            rt.setSize(bufferSize.x, bufferSize.y);
            particleCamera.aspect = width / height;
            particleCamera.updateProjectionMatrix();
            particleUniforms.uPx.value = renderer.getPixelRatio();
          }
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
        let frameEma = 0.016;
        let frameCount = 0;
        let vel = 0;          // geglättete Scroll-Geschwindigkeit 0..1 (ScrollTrigger.getVelocity)
        let flowExtra = 0;    // akkumulierter Zusatz-Flow für den Tunnel
        const tick = () => {
          if (disposed) return;
          frame = requestAnimationFrame(tick);
          const rawDt = clock.getDelta();
          const dt = Math.min(rawDt, 0.05);
          // Adaptive Qualität: hakt es dauerhaft, sinkt die Renderauflösung schrittweise
          // (Tunnel-Shader ist teuer). Hintergrund-Tabs und Ausreißer werden ignoriert.
          if (active && rawDt < 0.25) {
            frameEma += (rawDt - frameEma) * 0.06;
            frameCount += 1;
            if (frameCount > 90 && frameEma > 0.026 && pixelRatio > 0.8) {
              pixelRatio = Math.max(0.75, pixelRatio - 0.25);
              renderer.setPixelRatio(pixelRatio);
              resize();
              frameCount = 0; frameEma = 0.016;
            }
          }
          current += (target - current) * (1 - Math.exp(-dt * 7));
          currentHold += (targetHold - currentHold) * (1 - Math.exp(-dt * 9));
          currentOverall += (targetOverall - currentOverall) * (1 - Math.exp(-dt * 9));

          // Pass 05: the actual WebGL artwork starts SMALLER and LOWER than the
          // editorial headline. It expands to full screen during the plunge.
          // This is a CSS presentation transform, NOT a change to the shader,
          // the idle glass motion or the user's scroll/memory cue timings.
          

          // The original tunnel algorithm is preserved; the shader now also has
          // a tiny time-driven glass-flow distortion while progress is near 0.
          // Scroll-Velocity-Physik: schnell -> Flow, Partikel-Streckung, Randfarbsaum;
          // langsames Abklingen, danach beruhigt sich das Glas zu einem Atem-Puls.
          const rawVelocity = Math.abs(trigger?.getVelocity?.() ?? 0);
          const vNorm = Math.min(1, rawVelocity / 2600);
          vel += (vNorm - vel) * (1 - Math.exp(-dt * (vNorm > vel ? 9 : 2.6)));
          flowExtra += vel * dt * 5.5;

          uniforms.p.value = current;
          uniforms.time.value = clock.elapsedTime + flowExtra;
          postUniforms.time.value = clock.elapsedTime;
          postUniforms.chroma.value = vel * 0.016;
          postUniforms.breath.value = (1 - vel) * 0.022 * rangeProgress(current, 0.2, 0.4);
          particleUniforms.uFlow.value += dt * (0.010 + vel * 0.20);
          particleUniforms.uVel.value = vel;
          particleUniforms.uAlpha.value = rangeProgress(current, 0.12, 0.30) * (1 - rangeProgress(current, 0.84, 0.93));

          // Seitliche Erinnerungskarten: gleiten vom äußeren Rand herein (siehe sideCardState).
          cardEls.forEach((el, i) => {
            if (!el) return;
            const st = sideCardState(current, i, cardData.length);
            if (!st.visible) {
              if (el.dataset.v !== '0') { el.style.visibility = 'hidden'; el.dataset.v = '0'; }
              return;
            }
            const lay = CARD_LAYOUT[i];
            el.dataset.v = '1';
            el.style.visibility = 'visible';
            el.style.opacity = st.opacity.toFixed(3);
            el.style.filter = st.blur > 0.2 ? `blur(${st.blur.toFixed(2)}px)` : 'none';
            el.style.transform = `translate3d(calc(-50% + ${lay.x}vw + ${(lay.dir * st.offset * 58).toFixed(2)}vw), calc(-50% + ${lay.y}vh), 0) rotateY(${(lay.ry * (1 - st.focus * 0.8)).toFixed(2)}deg) rotateZ(${lay.rz}deg)`;
            el.style.setProperty('--focus', st.focus.toFixed(3));
          });

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
            // Position/weight are driven by opacity; the card floats in and out of focus.
            el.style.opacity = String(opacity);
            // Von unten hinein, nach oben hinaus; rückwärts scrollen kehrt die Richtung um.
            const dir = current < (cue.start + cue.end) / 2 ? 1 : -1;
            el.style.transform = `translate3d(0, calc(-50% + ${Math.round((1 - opacity) * 28 * dir)}px), 0)`;
            el.style.filter = opacity >= 0.995 ? 'none' : `blur(${((1 - opacity) * 9).toFixed(2)}px)`;
            // Einrasten: sobald die Karte komplett scharf ist, pulsiert ein Glow und der Hinweis
            // "weiterscrollen" erscheint. Beim Zurückscrollen löst sich das wieder (reversibel).
            const lock = smoothstepLock(opacity);
            el.style.setProperty('--lock', lock.toFixed(3));
            el.style.setProperty('--prog', Math.max(0, Math.min(1, (current - cue.start) / (cue.end - cue.start))).toFixed(3));
            const isLocked = opacity >= 0.985;
            if (isLocked !== (el.dataset.locked === '1')) {
              el.dataset.locked = isLocked ? '1' : '0';
              el.classList.toggle('locked', isLocked);
            }
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
            arrival.parentElement?.style.setProperty('--horizon', String(Math.min(1, titleReveal * 0.9 + exit * 0.1)));
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
          if (active && !document.hidden) {
            renderer.setRenderTarget(rt);
            renderer.clear();
            renderer.render(scene, camera);
            if (particleUniforms.uAlpha.value > 0.002) renderer.render(particleScene, particleCamera);
            renderer.setRenderTarget(null);
            renderer.clear();
            renderer.render(postScene, camera);
          }
        };
        tick();
        cleanup = () => {
          if (frame) cancelAnimationFrame(frame);
          if (trigger) trigger.kill();
          if (observer) observer.disconnect();
          window.removeEventListener('resize', resize);
          material?.dispose(); geometry?.dispose();
          postMaterial?.dispose(); particleMaterial?.dispose(); particleGeometry?.dispose(); rt?.dispose();
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
        postMaterial?.dispose(); particleMaterial?.dispose(); particleGeometry?.dispose(); rt?.dispose();
        texture1?.dispose(); texture2?.dispose();
        renderer?.dispose();
      }
    }
    boot();
    return () => { disposed = true; cleanup(); };
  });
</script>

{#snippet quoteBody(thought, i)}
  <span class="qc-clip" aria-hidden="true"><span class="qc-sheen"></span></span>
  <QuoteArt id={thought.id} side={thought.side} />
  <div class="qc-head">
    <span class="memory-counter">{thought.eyebrow}</span>
    <span class="qc-tag">HYPOTHESIS · BEFORE THE DATA</span>
  </div>
  <p class="memory-thought">{thought.title}<br /><em>{thought.emphasis}</em></p>
  <div class="qc-foot" aria-hidden="true">
 <svg class="mc-wave" viewBox="0 0 112 28" preserveAspectRatio="none">
      {#each waveBars(i * 7 + 5) as h, k (k)}
        <rect x={k * 4} y={14 - h * 13} width="2.2" height={h * 26} rx="1.1" />
      {/each}
    </svg>
    <span class="qc-cue">KEEP SCROLLING <b>↓</b></span>
  </div>
  <span class="qc-progress" aria-hidden="true"></span>
{/snippet}

{#snippet cardBody(card, i)}
  <CardBody {card} />
{/snippet}

<section bind:this={wrapper} id="top" class:still={fallback} class="portal-journey" aria-label="Introductory time-capsule journey">
  <div class="portal-stage">
    <div bind:this={portalVisual} class="portal-visual">
      {#if fallback}
        <img class="static-portal" src={`${import.meta.env.BASE_URL}portal/capsule.jpg`} alt="Iridescent violet, pink and gold liquid-glass portal" />
      {:else}
        <canvas bind:this={canvas} class="portal-canvas" aria-hidden="true"></canvas>
      {/if}
    </div>

    <!-- Editorial copy is physically above the scaled-and-lowered capsule. -->
    <div bind:this={hero} class="hero-copy" style:opacity={fallback ? '1' : '0'}>
      <HeroContent />
    </div>

    {#if !fallback}
      <!-- Schwebende Erinnerungskarten auf der Z-Achse (Depth-of-Field, siehe cardState). -->
      <div class="cards-layer" aria-hidden="true">
        {#each cardData as card, i (i)}
          <article bind:this={cardEls[i]} class="mem-card" style:visibility="hidden" style:opacity="0">
            {@render cardBody(card, i)}
          </article>
        {/each}
      </div>
      {#each thoughts as thought, i (thought.id)}
        <article
          bind:this={memories[i]}
          class="memory"
          class:right={thought.side === 'right'}
          aria-hidden="true"
          style:opacity="0"
        >
          {@render quoteBody(thought, i)}
        </article>
      {/each}
      <div bind:this={finaleBackdrop} class="finale-backdrop" aria-hidden="true" style:opacity="0"></div>
      <div bind:this={handoff} class="portal-handoff" aria-hidden="true" style:opacity="0"></div>
      <div class="arrival-horizon" aria-hidden="true"></div>
      <div bind:this={arrival} class="arrival" aria-hidden="true" style:opacity="0">
        <span class="arrival-overline"><b>01</b> WORLD ONE <i aria-hidden="true"></i> LISTENING PATTERNS</span>
        <p class="arrival-title">A day measured<br /><em>in music.</em></p>
        <div class="arrival-day" aria-hidden="true">{#each dayBars as b}<i class:peak={b.peak} style:--h={b.h}></i>{/each}</div>
        <span class="arrival-axis" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></span>
        <p class="arrival-subtitle">An ordinary clock tells the time.<br />Mine tells me when I listened.</p>
      </div>
      <div bind:this={finaleHint} class="finale-hint" aria-hidden="true" style:opacity="0">SCROLL TO EXPLORE THE DATA <span>↓</span></div>
    {/if}

    <a bind:this={skip} class="skip" href="#rhythm">SKIP TO THE DATA ↓</a>
    <div bind:this={hint} class="scroll-cue" aria-hidden="true">
      <span class="sc-script">scroll to dive in</span>
      <svg class="sc-arrow" viewBox="0 0 40 64" fill="none"><path d="M20 4 C 8 18, 32 30, 20 56" /><path d="M9 45 L20 57 L31 44" /></svg>
      <span class="sc-pill"><i class="sc-mouse"><b></b></i><span>SCROLL TO ENTER THE PORTAL</span></span>
    </div>
    <div class="progress-track" aria-hidden="true"><div bind:this={progressBar} class="progress-fill"></div></div>
    <span class="sr-only">Scroll through an abstract liquid-glass portal. Four memory questions and floating memory cards from 2018 to 2026 introduce the data journey. Use Skip to the Data to bypass this animation.</span>
  </div>

  {#if fallback}
    <!-- Statische Übersicht (prefers-reduced-motion / kein WebGL): alle Zitate und Karten ohne Kamerabewegung. -->
    <div class="static-overview">
      <ol class="static-quotes">
        {#each thoughts as thought, i (thought.id)}
          <li class="memory static-quote">{@render quoteBody(thought, i)}</li>
        {/each}
      </ol>
      <ul class="static-cards" aria-label="Memory moments from 2018 to 2026">
        {#each cardData as card, i (i)}
          <li class="mem-card static-card">{@render cardBody(card, i)}</li>
        {/each}
      </ul>
    </div>
  {/if}
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
  /* Hypothesen-Karten: gleiche Gestaltung wie die Erinnerungskarten (Cover, Waveform, Glas),
     aber größer, dunkler hinterlegt und damit gut lesbar. Kein backdrop-filter über dem
     animierten Canvas (zu teuer) -> dunkle Glasfläche mit Lichtkanten. */
  .memory { --lock:0; --prog:0; position:absolute; z-index:5; left:8vw; top:50%; width:min(36rem,44vw);
    padding:1.35rem 1.6rem 1.5rem; border-radius:2rem; overflow:visible; isolation:isolate; text-align:left; pointer-events:none;
    color:#fff0fa; will-change:opacity,transform,filter;
    background:
      linear-gradient(145deg, rgba(255,255,255,calc(.12 + var(--lock)*.08)), rgba(255,255,255,.03) 55%, rgba(246,96,185,.08)),
      linear-gradient(160deg, rgba(38,20,70,.82), rgba(14,7,30,.78));
    border:1px solid rgba(255,238,248,calc(.22 + var(--lock)*.4));
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,calc(.28 + var(--lock)*.3)),
      inset 0 -22px 50px rgba(246,96,185,calc(.05 + var(--lock)*.12)),
      0 34px 80px rgba(4,1,12,.55),
      0 0 calc(10px + var(--lock)*70px) rgba(255,148,90,calc(var(--lock)*.4)); }
  .memory.right { left:auto; right:8vw; top:54%; }
  .qc-clip { position:absolute; z-index:-1; inset:0; border-radius:inherit; overflow:hidden; pointer-events:none; }
  .qc-sheen { position:absolute; inset:-40%; pointer-events:none; mix-blend-mode:screen; filter:blur(20px);
    background:conic-gradient(from 210deg at 30% 20%, rgba(255,148,90,0), rgba(246,96,185,.3), rgba(156,137,220,.26), rgba(255,148,90,0) 60%);
    opacity:calc(.18 + var(--lock)*.7); }
  .qc-head { display:flex; justify-content:space-between; align-items:baseline; gap:1rem; flex-wrap:wrap; }
  .memory-counter { margin:0; font-family:var(--font-body,'DM Sans',sans-serif); letter-spacing:.24em; font-size:clamp(.62rem,.78vw,.78rem); font-weight:700; color:#ffd0a8; }
  .qc-tag { font-family:var(--font-body,'DM Sans',sans-serif); font-size:.58rem; font-weight:700; letter-spacing:.2em; color:#d9c2ee; opacity:.8; }
  .memory-thought { font-family:var(--font-editorial,'Instrument Serif',Georgia,serif); font-size:clamp(2.4rem,4.4vw,4.9rem); font-weight:400; line-height:1.02; letter-spacing:-.022em; margin:1rem 0 1.15rem; color:#fff0fa; text-shadow:0 3px 24px rgba(0,0,0,.6); }
  .memory-thought em { font-family:inherit; font-style:italic; font-weight:400; letter-spacing:-.012em; color:#ffd2e6; }
  .qc-foot { display:flex; align-items:center; gap:.8rem; }
  .qc-foot .mc-wave { flex:1; height:1.5rem; }
  .qc-cue { flex:none; font-family:var(--font-body,'DM Sans',sans-serif); font-size:.58rem; font-weight:700; letter-spacing:.2em; color:#ffd0a8;
    opacity:var(--lock); transform:translateY(calc((1 - var(--lock)) * 6px)); }
  .qc-cue b { display:inline-block; margin-left:.35em; animation:qc-nudge 1.4s ease-in-out infinite; }
  .qc-progress { position:absolute; left:1.6rem; right:1.6rem; bottom:.7rem; height:2px; border-radius:2px; transform:scaleX(var(--prog)); transform-origin:left;
    background:linear-gradient(90deg,#FF945A,#F660B9); opacity:.75; }
  .memory:global(.locked) { animation:qc-snap 1s cubic-bezier(.2,.8,.2,1); }
  @keyframes qc-snap { 0%{ scale:1; } 26%{ scale:1.018; } 100%{ scale:1; } }
  @keyframes qc-nudge { 50%{ transform:translateY(4px); } }
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
  /* Endet exakt in Nachtviolett #100B1E, damit der Übergang in World 01 / Zeitpfad nahtlos ist. */
  .portal-handoff { position:absolute; z-index:4; inset:0; pointer-events:none; opacity:0;
    background:radial-gradient(ellipse at 65% 35%, #1c102f 0%, #100B1E 52%, #100B1E 100%); will-change:opacity;
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


  /* ---- Eröffnung: Kapitelkarte mit echtem Tagesverlauf, Licht trägt in World 01 ---- */
  .arrival-horizon { position:absolute; z-index:5; left:50%; bottom:-34vh; width:140vw; height:70vh; transform:translateX(-50%); pointer-events:none;
    background:radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,160,110,.42) 0%, rgba(246,96,185,.22) 38%, transparent 72%); opacity:var(--horizon,0); }
  .arrival-overline { display:inline-flex; align-items:center; }
  .arrival-overline b { margin-right:1.1em; padding:.3em .8em; border-radius:999px; background:#FFB98E; color:#100B1E; font-weight:800; letter-spacing:.06em; }
  .arrival-title { font-family:var(--font-editorial,'Instrument Serif',Georgia,serif); letter-spacing:-.045em; }
  .arrival-title em { background:linear-gradient(90deg,#FFB98E,#F660B9); -webkit-background-clip:text; background-clip:text; color:transparent; padding-right:.12em; }
  .arrival-day { display:flex; align-items:flex-end; gap:clamp(3px,.45vw,7px); height:clamp(46px,8vh,84px); margin:clamp(1.6rem,4vh,3rem) 0 .5rem;
    opacity:var(--rule-scale,0); transform:scaleY(calc(.35 + var(--rule-scale,0)*.65)); transform-origin:50% 100%; }
  .arrival-day i { display:block; width:clamp(5px,.75vw,11px); height:calc(var(--h) * 100%); border-radius:99px; background:linear-gradient(180deg,#F4A9D0,#9B6BE8); }
  .arrival-day i.peak { background:linear-gradient(180deg,#FFD0A8,#FF945A); box-shadow:0 0 22px rgba(255,148,90,.7); }
  .arrival-axis { display:flex; justify-content:space-between; width:clamp(190px,24vw,330px); margin-bottom:1.2rem; font-size:.6rem; letter-spacing:.14em; color:#A98DB6; opacity:var(--rule-scale,0); }

  /* ---- Liquid-Glass-Erinnerungskarten ------------------------------------------ */
  .cards-layer { position:absolute; inset:0; z-index:3; pointer-events:none;
    perspective:900px; perspective-origin:50% 46%; }
  .mem-card { --focus:0; position:absolute; left:50%; top:50%; width:18.5rem; padding:1.05rem 1.15rem 1.1rem;
    border-radius:1.6rem; color:#fff0fa; overflow:hidden; isolation:isolate;
    background:
      linear-gradient(145deg, rgba(255,255,255,calc(.14 + var(--focus)*.08)), rgba(255,255,255,.035) 55%, rgba(246,96,185,.07)),
      rgba(24,13,46,.78);
    border:1px solid rgba(255,238,248,calc(.28 + var(--focus)*.3));
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,calc(.28 + var(--focus)*.3)),
      inset 0 -18px 40px rgba(246,96,185,calc(.05 + var(--focus)*.12)),
      0 30px 70px rgba(4,1,12,.5),
      0 0 calc(18px + var(--focus)*60px) rgba(255,148,90,calc(var(--focus)*.32));
    will-change:transform,opacity,filter; backface-visibility:hidden; }
  /* Irisierender Schimmer, der im Fokus aufleuchtet */
  .mem-card::before { content:''; position:absolute; z-index:-1; inset:-40%;
    background:conic-gradient(from 210deg at 30% 20%, rgba(255,148,90,.0), rgba(246,96,185,.30), rgba(156,137,220,.26), rgba(255,148,90,.0) 60%);
    opacity:calc(.15 + var(--focus)*.7); mix-blend-mode:screen; filter:blur(18px); }
  /* Spekularer Lichtstreifen */
  .mem-card::after { content:''; position:absolute; z-index:-1; inset:0; border-radius:inherit;
    background:linear-gradient(115deg, transparent 28%, rgba(255,255,255,calc(.05 + var(--focus)*.16)) 42%, transparent 56%); }
  .mc-top { display:flex; justify-content:space-between; align-items:baseline; }
  .mc-year { font-family:var(--font-family,'Syne',sans-serif); font-weight:800; font-size:2.35rem; line-height:1; letter-spacing:-.04em;
    background:linear-gradient(100deg,#ffd0a8,#F660B9); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .mc-tag { font-family:var(--font-body,'DM Sans',sans-serif); font-size:.58rem; font-weight:700; letter-spacing:.22em; color:#ffd0a8; opacity:.8; }
  .mc-row { display:flex; gap:.75rem; align-items:center; margin:.8rem 0 .7rem; }
  .mc-cover { flex:none; width:3.1rem; height:3.1rem; border-radius:.7rem; box-shadow:inset 0 0 0 1px rgba(255,255,255,.35), 0 8px 18px rgba(0,0,0,.35); }
  .mc-meta { display:flex; flex-direction:column; min-width:0; font-family:var(--font-body,'DM Sans',sans-serif); }
  .mc-meta strong { font-size:.88rem; font-weight:700; letter-spacing:.02em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .mc-meta span { font-size:.72rem; opacity:.7; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .mc-wave { display:block; width:100%; height:1.7rem; fill:#F8EEE8; opacity:calc(.35 + var(--focus)*.55); }
  .mc-marker { margin:.75rem 0 0; font-family:var(--font-editorial,'Instrument Serif',Georgia,serif); font-style:italic; font-size:1.25rem; line-height:1.1; color:#ffe2ef; }

  /* ---- Statische Übersicht (Reduced Motion / ohne WebGL) ------------------------ */
  .still { height:auto; }
  .still .portal-stage { position:relative; height:100svh; }
  .static-overview { position:relative; background:#100B1E; padding:clamp(3rem,8vw,7rem) 6vw; display:grid; gap:clamp(2.5rem,6vw,5rem); }
  .static-quotes { list-style:none; margin:0; padding:0; display:grid; gap:1.6rem; max-width:48rem; }
  .static-quote { --lock:.6; position:relative; left:auto; right:auto; top:auto; width:auto; transform:none; filter:none; opacity:1; pointer-events:auto; }
  .static-quote .qc-cue, .static-quote .qc-progress { display:none; }
  .static-cards { list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(auto-fill,minmax(15rem,1fr)); gap:1.2rem; }
  .static-card { --focus:.6; position:relative; left:auto; top:auto; width:auto !important; filter:none; transform:none; }

  .skip { position:absolute; z-index:8; bottom:4rem; right:6vw; font-size:.62rem; letter-spacing:.18em; text-decoration:none; color:#f7e8f5; opacity:.88; text-shadow:0 2px 12px #05020a; }
  .skip:hover { text-decoration:underline; }
  /* Deutlicher Scroll-Hinweis: Glas-Pille mit Maus-Icon, handgeschriebener Zusatz und Pfeil, atmendes Leuchten. */
  .scroll-cue { position:absolute; z-index:7; left:50%; bottom:clamp(1.6rem,5.5vh,3.6rem); transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:.2rem; pointer-events:none; }
  .scroll-cue::before { content:''; position:absolute; z-index:-1; inset:-3rem -5rem -2rem; background:radial-gradient(ellipse at 50% 55%, rgba(5,2,10,.62), transparent 70%); }
  .sc-script { font-family:var(--font-hand,'Mansalva',cursive); font-size:clamp(1.5rem,2.3vw,2.2rem); line-height:1; color:#FFD9B8; transform:rotate(-3deg); text-shadow:0 3px 18px rgba(5,2,10,.85); }
  .sc-arrow { width:1.9rem; height:3rem; overflow:visible; animation:sc-bob 1.7s ease-in-out infinite; }
  .sc-arrow path { stroke:#FFC79A; stroke-width:2.6; stroke-linecap:round; stroke-linejoin:round; filter:drop-shadow(0 2px 8px rgba(5,2,10,.8)); }
  .sc-pill { display:inline-flex; align-items:center; gap:.85rem; padding:.7rem 1.3rem .7rem .95rem; border-radius:999px; font:700 .66rem var(--font-body,'DM Sans',sans-serif); letter-spacing:.22em; color:#fff0e6;
    background:linear-gradient(145deg, rgba(255,255,255,.2), rgba(255,255,255,.06)); border:1px solid rgba(255,238,248,.45);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.4), 0 14px 40px rgba(5,2,10,.55); backdrop-filter:blur(14px) saturate(1.3); -webkit-backdrop-filter:blur(14px) saturate(1.3);
    animation:sc-glow 2.4s ease-in-out infinite; }
  .sc-mouse { position:relative; width:1.15rem; height:1.8rem; border-radius:1rem; border:1.6px solid #FFD0A8; flex:none; }
  .sc-mouse b { position:absolute; left:50%; top:.28rem; width:.24rem; height:.42rem; margin-left:-.12rem; border-radius:.2rem; background:#FF945A; animation:sc-wheel 1.5s ease-in-out infinite; }
  @keyframes sc-wheel { 0% { transform:translateY(0); opacity:0; } 25% { opacity:1; } 80% { transform:translateY(.62rem); opacity:0; } 100% { opacity:0; } }
  @keyframes sc-bob { 50% { transform:translateY(7px); } }
  @keyframes sc-glow { 0%,100% { box-shadow:inset 0 1px 0 rgba(255,255,255,.4), 0 14px 40px rgba(5,2,10,.55), 0 0 0 0 rgba(255,148,90,.45); } 50% { box-shadow:inset 0 1px 0 rgba(255,255,255,.4), 0 14px 40px rgba(5,2,10,.55), 0 0 0 14px rgba(255,148,90,0); } }
  .progress-track { position:absolute; z-index:8; bottom:0; left:0; width:100%; height:3px; background:rgba(255,255,255,.08); opacity:calc(1 - var(--horizon,0)); }
  .progress-fill { width:100%; height:100%; background:linear-gradient(90deg,#8b5bc9,#ed8fc7,#f8a77d); transform:scaleX(0); transform-origin:left; }
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
    .memory,.memory.right { left:6vw; right:6vw; width:auto; top:52%; }
    .memory-thought { font-size:clamp(2.45rem,10.5vw,4.8rem); }
    .mem-card { width:min(15rem,62vw); }
    .skip { right:5vw; bottom:auto; top:4.6rem; }
    .scroll-cue { bottom:1.4rem; } .sc-pill { font-size:.58rem; letter-spacing:.16em; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sc-arrow, .sc-pill, .sc-mouse b { animation:none; }
    .memory, .hero-copy, .arrival, .mem-card { filter:none !important; }
    .memory:global(.locked), .qc-cue b { animation:none; }
  }
</style>

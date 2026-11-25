<script>
  import { onMount, tick } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import { scrollState } from '../motion/scrollState.js';
  import { CHAPTERS, isChapterAvailable } from '../navigation/chapters.js';

  /**
   * Erstes Kind eines position:relative .data-journey-Wrappers.
   * Der gestrichelte Zeitpfad läuft jetzt im Rand ("Gutter") neben dem Inhalt und kreuzt
   * keine Überschriften mehr. Der aufgebaute Teil wird mit einem einfachen clipPath enthüllt
   * (kein SVG-Mask, kein will-change auf einer seitenhohen Ebene -> deutlich flüssiger).
   * Eine leuchtende Spitze wandert mit dem Scroll; die Scroll-Velocity lässt sie pulsieren.
   * Stationen entstehen nur auf echten, vorhandenen Kapitel-Ankern.
   */
  let root;
  let tracedPath;
  let clipRect;
  let headDot;
  let headRing;
  let pathData = $state('');
  let stations = $state([]);
  let width = $state(1280);
  let height = $state(1400);

  let reduced = false;
  let hostTopAbs = 0;
  let lookup = null;            // { ys: Float32Array, xs: Float32Array }
  let routeTrigger;
  let parentObserver;
  let raf = 0;
  let destroyed = false;
  let unsubscribeMotion;
  let intensity = 0;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const STEP = 440;

  function buildRoute(w, h, stops) {
    const near = clamp(w * 0.016, 8, 24);
    const far = clamp(w * 0.038, 20, 52);
    const startY = clamp((stops[0]?.y ?? 200) - 220, 24, h - 24);
    const endY = h - 40;
    const raw = [];
    for (let y = startY; y < endY; y += STEP) raw.push({ y });
    raw.push({ y: endY });
    const points = [];
    raw.forEach((p, i) => {
      if (stops.some((s) => Math.abs(s.y - p.y) < STEP * 0.4)) return;
      points.push({ x: i % 2 === 0 ? near : far, y: p.y });
    });
    stops.forEach((s, i) => points.push({ x: i % 2 === 0 ? far : near, y: s.y, station: s }));
    points.sort((a, b) => a.y - b.y);
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const k = (b.y - a.y) * 0.5;
      d += ` C ${a.x.toFixed(1)} ${(a.y + k).toFixed(1)}, ${b.x.toFixed(1)} ${(b.y - k).toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
    return { d, points };
  }

  function sampleLookup() {
    if (!tracedPath) return;
    const total = tracedPath.getTotalLength();
    const n = 320;
    const ys = new Float32Array(n + 1);
    const xs = new Float32Array(n + 1);
    for (let i = 0; i <= n; i++) {
      const p = tracedPath.getPointAtLength((total * i) / n);
      ys[i] = p.y; xs[i] = p.x;
    }
    lookup = { ys, xs };
  }

  function xAt(y) {
    if (!lookup) return 0;
    const { ys, xs } = lookup;
    let lo = 0;
    let hi = ys.length - 1;
    if (y <= ys[0]) return xs[0];
    if (y >= ys[hi]) return xs[hi];
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ys[mid] <= y) lo = mid; else hi = mid;
    }
    const t = (y - ys[lo]) / Math.max(0.0001, ys[hi] - ys[lo]);
    return xs[lo] + (xs[hi] - xs[lo]) * t;
  }

  function paint() {
    if (!clipRect || !lookup) return;
    const front = reduced ? height : clamp(window.scrollY + window.innerHeight * 0.62 - hostTopAbs, 0, height);
    clipRect.setAttribute('height', front.toFixed(1));
    if (headDot && headRing) {
      const x = xAt(front);
      const show = !reduced && front > 4 && front < height - 4;
      headDot.setAttribute('cx', x.toFixed(1)); headDot.setAttribute('cy', front.toFixed(1));
      headRing.setAttribute('cx', x.toFixed(1)); headRing.setAttribute('cy', front.toFixed(1));
      headRing.setAttribute('r', (12 + intensity * 22).toFixed(1));
      headDot.style.opacity = headRing.style.opacity = show ? '1' : '0';
    }
  }

  async function measure() {
    if (destroyed || !root?.parentElement) return;
    const host = root.parentElement;
    const hostRect = host.getBoundingClientRect();
    hostTopAbs = hostRect.top + window.scrollY;
    const w = Math.max(320, Math.round(host.clientWidth));
    const h = Math.max(200, Math.round(host.scrollHeight));
    const nodes = CHAPTERS
      .filter(isChapterAvailable)
      .map((chapter) => {
        const element = document.getElementById(chapter.anchor);
        if (!element || !host.contains(element)) return null;
        const rect = element.getBoundingClientRect();
        return { ...chapter, y: clamp(rect.top - hostRect.top + Math.min(230, rect.height * 0.22), 75, h - 110) };
      })
      .filter(Boolean);
    const route = buildRoute(w, h, nodes);
    width = w; height = h;
    pathData = route.d;
    stations = route.points.filter((p) => p.station).map((p) => ({ id: p.station.id, x: p.x, y: p.y }));
    await tick();
    if (destroyed) return;
    sampleLookup();
    paint();
  }

  function scheduleMeasure() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(async () => { raf = 0; await measure(); });
  }

  onMount(() => {
    gsap.registerPlugin(ScrollTrigger);
    destroyed = false;
    const parent = root.parentElement;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced = motionQuery.matches;
    const onMotionChange = () => { reduced = motionQuery.matches; paint(); };
    motionQuery.addEventListener('change', onMotionChange);
    unsubscribeMotion = scrollState.subscribe((state) => {
      intensity = state.reducedMotion ? 0 : state.intensity ?? 0;
    });
    parentObserver = new ResizeObserver(scheduleMeasure);
    parentObserver.observe(parent);
    measure().then(() => {
      if (destroyed) return;
      routeTrigger = ScrollTrigger.create({
        id: 'tsmy-cosmic-path',
        trigger: parent,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: paint,
        onRefresh: () => scheduleMeasure()
      });
    });
    window.addEventListener('resize', scheduleMeasure, { passive: true });
    return () => {
      destroyed = true;
      window.removeEventListener('resize', scheduleMeasure);
      motionQuery.removeEventListener('change', onMotionChange);
      unsubscribeMotion?.();
      parentObserver?.disconnect();
      if (raf) cancelAnimationFrame(raf);
      routeTrigger?.kill();
    };
  });
</script>

<div class="cosmic-timeline" bind:this={root} aria-hidden="true">
  {#if pathData}
    <svg class="timeline-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" focusable="false">
      <defs>
        <linearGradient id="cosmic-thread" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={height}>
          <stop offset="0" stop-color="#FF945A" stop-opacity=".95"/>
          <stop offset=".45" stop-color="#F660B9" stop-opacity=".95"/>
          <stop offset="1" stop-color="#9c89dc" stop-opacity=".85"/>
        </linearGradient>
        <radialGradient id="cosmic-head"><stop offset="0" stop-color="#fff3ea"/><stop offset=".45" stop-color="#FF945A"/><stop offset="1" stop-color="#F660B9" stop-opacity="0"/></radialGradient>
        <clipPath id="cosmic-clip" clipPathUnits="userSpaceOnUse"><rect bind:this={clipRect} x="-60" y="0" width={width + 120} height="0"/></clipPath>
      </defs>
      <!-- Die ganze Route ist als blasser Vorgriff sichtbar; der gegangene Weg leuchtet. -->
      <path bind:this={tracedPath} d={pathData} fill="none" stroke="#cfa5d3" stroke-opacity=".2" stroke-width="2.4" stroke-dasharray="4 14" stroke-linecap="round"/>
      <path d={pathData} fill="none" stroke="url(#cosmic-thread)" stroke-width="2.8" stroke-dasharray="5 13" stroke-linecap="round" clip-path="url(#cosmic-clip)"/>
      {#each stations as station (station.id)}
        <g transform={`translate(${station.x},${station.y})`}>
          <circle r="15" fill="#170b24" fill-opacity=".85" stroke="#e69cce" stroke-opacity=".5"/>
          <circle r="5" fill="#FF945A"/>
        </g>
      {/each}
      <circle bind:this={headRing} r="12" fill="url(#cosmic-head)" style="opacity:0"/>
      <circle bind:this={headDot} r="4.2" fill="#fff3ea" style="opacity:0"/>
    </svg>
  {/if}
</div>

<style>
  .cosmic-timeline{position:absolute;inset:0;z-index:8;pointer-events:none;overflow:hidden;isolation:isolate}
  .timeline-svg{display:block;width:100%;height:100%;overflow:visible}
  @media(max-width:900px){.cosmic-timeline{opacity:.5}}
</style>

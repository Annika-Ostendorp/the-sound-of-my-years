<script>
  // Fatfish-Prinzip: ein einziger, langer, geschwungener Strich, der in einer
  // Pfeilspitze endet und sich beim Sichtbarwerden von Hand "zeichnet".
  // Koordinaten liegen im Raum 0..w x 0..h (viewBox). from = Start, to = Pfeilspitze.
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { arrowPath } from './handArrowPath.js';

  let {
    from = { x: 14, y: 112 },
    to = { x: 186, y: 30 },
    bend = 0.38,            // Krümmung; Vorzeichen wechselt die Schwungrichtung
    w = 200,
    h = 130,
    color = '#FFB98E',
    width = 3.4,
    delay = 0,
    head = true,
    seed = 3,
    s = false,
    label = ''
  } = $props();

  const geometry = $derived(arrowPath(from, to, { bend, head, seed, s }));

  let svg;
  let main;
  let echo;
  let drawn = false;
  let reduced = false;
  let mounted = $state(false);

  function setDash() {
    const paths = [main, echo];
    paths.forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = String(len);
      p.style.strokeDashoffset = reduced || drawn ? '0' : String(len);
    });
  }

  // Ändert sich die Geometrie (z. B. anderer höchster Balken), wird die Strichlänge neu gemessen.
  $effect(() => {
    geometry;
    if (mounted) setDash();
  });

  onMount(() => {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    mounted = true;
    if (reduced) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      gsap.to(main, { strokeDashoffset: 0, duration: 1.35, delay, ease: 'power2.inOut', onComplete: () => { drawn = true; } });
      gsap.to(echo, { strokeDashoffset: 0, duration: 1.5, delay: delay + 0.05, ease: 'power2.inOut' });
    }, { threshold: 0.35 });
    io.observe(svg);
    return () => io.disconnect();
  });
</script>

<svg bind:this={svg} class="hand-arrow" viewBox={`0 0 ${w} ${h}`} role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : 'true'} fill="none" stroke-linecap="round" stroke-linejoin="round">
  <!-- zarter Doppelstrich wie bei einem Stift, der minimal versetzt nachzieht -->
  <path bind:this={echo} d={geometry} stroke={color} stroke-opacity=".34" stroke-width={width * 0.5} transform="translate(1.4 1.1)" />
  <path bind:this={main} d={geometry} stroke={color} stroke-width={width} />
</svg>

<style>
  .hand-arrow { display: block; width: 100%; height: auto; overflow: visible; filter: drop-shadow(0 2px 10px rgba(10, 4, 20, .55)); }
</style>

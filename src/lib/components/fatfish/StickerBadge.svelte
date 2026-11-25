<script>
  // Fatfish-Referenz: Sticker-Badge mit elastischem Pop.
  import { onMount } from 'svelte';
  import gsap from 'gsap';

  let { text = 'MEIN MOMENT', rotate = -8, color = '#F660B9', ink = '#100B1E' } = $props();
  let el;

  onMount(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.set(el, { rotate });
    if (reduced) return;
    gsap.set(el, { scale: 0, rotate: rotate - 25 });
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      gsap.to(el, { scale: 1, rotate, duration: 1.2, ease: 'elastic.out(1, 0.45)' });
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  });
</script>

<span bind:this={el} class="sticker" style:--c={color} style:--ink={ink}>{text}</span>

<style>
  .sticker {
    display: inline-flex; align-items: center; justify-content: center; text-align: center;
    min-width: 5.6rem; padding: .9rem 1.1rem; border-radius: 999px;
    background: var(--c); color: var(--ink);
    font: 800 .78rem/1.1 var(--font-family, 'Syne', sans-serif); letter-spacing: .08em; text-transform: uppercase;
    box-shadow: 0 0 0 3px #F8EEE8 inset, 0 12px 30px rgba(0,0,0,.35);
    transform-origin: 50% 60%;
  }
</style>

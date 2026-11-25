<script>
  // Albumcover oder Künstlerbild. Ohne Bild: Farbverlauf mit Initialen (Bilder liefert scripts/export_portal_cards.py).
  import { initials } from '../../portal/portalContent.js';
  let { src = null, label = '', round = false, size = '3rem' } = $props();
  const PAL = [['#F660B9', '#39205C'], ['#FF945A', '#8b5bc9'], ['#9c89dc', '#F660B9'], ['#FF945A', '#F660B9'], ['#39205C', '#FF945A'], ['#8b5bc9', '#ed8fc7']];
  const g = $derived(PAL[[...label].reduce((s, c) => s + c.charCodeAt(0), 0) % PAL.length]);
</script>

<span class="cov" class:round style="--size:{size};--g1:{g[0]};--g2:{g[1]}" title={label}>
  {#if src}<img {src} alt="" loading="lazy" referrerpolicy="no-referrer" draggable="false" />{:else}<b>{initials(label)}</b>{/if}
</span>

<style>
  .cov { display: block; flex: none; width: var(--size); height: var(--size); border-radius: calc(var(--size) * .16); overflow: hidden; position: relative;
    background: linear-gradient(135deg, var(--g1), var(--g2));
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.32), 0 10px 24px rgba(0,0,0,.42); }
  .cov.round { border-radius: 50%; }
  .cov img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  .cov b { position: absolute; inset: 0; display: grid; place-items: center; font: 700 calc(var(--size) * .34)/1 var(--font-family, 'Syne', sans-serif); color: rgba(255,244,250,.92); letter-spacing: -.03em; }
</style>

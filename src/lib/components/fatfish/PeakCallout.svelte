<script>
  // Fatfish-Annotation für die Hör-Uhr, robust gegen Kollisionen:
  // Die Notiz sitzt IMMER in einer freien Ecke der Uhr (nie über den Reglern oder Zahlen).
  // Welche Ecke, entscheidet die Lage des Peak-Balkens; der Pfeil schwingt als S-Kurve zur Balkenspitze.
  // Liegt im selben Koordinatenraum wie die Uhr (viewBox 900x900, quadratisch).
  import HandArrow from './HandArrow.svelte';

  let { target, label = 'Afternoon peak', value = '', muted = false, center = 450 } = $props();

  const NOTE_W = 230, NOTE_H = 150;       // geschätzte Notiz-Größe im 900er-Raum

  const layout = $derived.by(() => {
    const dx = target.x - center, dy = target.y - center;
    const len = Math.hypot(dx, dy) || 1;
    const dir = { x: dx / len, y: dy / len };
    // Ecke wählen: Seite des Peaks; bei fast senkrechten Peaks rechts; senkrecht oben/unten wie der Peak (Mitte -> oben).
    const right = Math.abs(dx) < 70 ? true : dx > 0;
    const bottom = Math.abs(dy) < 70 ? false : dy > 0;
    const sx = right ? 900 - NOTE_W / 2 : NOTE_W / 2;
    const sy = bottom ? 900 - NOTE_H - 10 : NOTE_H + 10;
    const start = { x: sx, y: sy };
    const tip = { x: target.x + dir.x * 18, y: target.y + dir.y * 18 };
    const pad = 70;
    const minX = Math.min(start.x, tip.x) - pad, minY = Math.min(start.y, tip.y) - pad;
    const boxW = Math.abs(start.x - tip.x) + pad * 2, boxH = Math.abs(start.y - tip.y) + pad * 2;
    // Schwungrichtung: bauchige erste Welle weg von der Mitte
    const cross = (tip.x - start.x) * (center - start.y) - (tip.y - start.y) * (center - start.x);
    return { start, tip, minX, minY, boxW, boxH, right, bottom, bend: (cross > 0 ? 1 : -1) * (Math.hypot(tip.x - start.x, tip.y - start.y) > 420 ? 0.42 : 0.3) };
  });
  const words = $derived(label.split(' '));
</script>

<div class="callout" class:muted>
  <div class="arrow-box" style:left={`${(layout.minX / 900) * 100}%`} style:top={`${(layout.minY / 900) * 100}%`} style:width={`${(layout.boxW / 900) * 100}%`}>
    <HandArrow
      from={{ x: layout.start.x - layout.minX, y: layout.start.y - layout.minY }}
      to={{ x: layout.tip.x - layout.minX, y: layout.tip.y - layout.minY }}
      w={layout.boxW} h={layout.boxH} bend={layout.bend} s={true}
      color="#FFC79A" width={4} delay={0.2}
    />
  </div>
  <p class="note" class:right={layout.right}
     style:left={layout.right ? 'auto' : '0'} style:right={layout.right ? '0' : 'auto'}
     style:top={layout.bottom ? 'auto' : '0'} style:bottom={layout.bottom ? '0' : 'auto'}>
    <span class="script">{#each words as w}<span class="w">{w}</span>{/each}</span>
    {#if value}<span class="value">{value}</span>{/if}
  </p>
</div>

<style>
  .callout { position: absolute; inset: 0; pointer-events: none; container-type: inline-size; transition: opacity .35s ease; }
  .callout.muted { opacity: .25; }
  .arrow-box { position: absolute; }
  .note { position: absolute; margin: 0; width: 30%; display: flex; flex-direction: column; gap: .5em; transform: rotate(-4deg); text-align: left; }
  .note.right { align-items: flex-end; text-align: right; transform: rotate(3deg); }
  .script { display: flex; flex-direction: column; font-family: var(--font-hand, 'Mansalva', cursive); font-size: clamp(1.1rem, 4.4cqw, 2.1rem); line-height: .95; color: #FFD9B8; text-shadow: 0 2px 18px rgba(10,4,20,.9); }
  .note.right .script { align-items: flex-end; }
  .value { font-family: var(--font-body, 'DM Sans', sans-serif); font-size: clamp(.58rem, 1.55cqw, .74rem); font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #F8EEE8; line-height: 1.5; text-shadow: 0 2px 12px rgba(10,4,20,.95); }
</style>

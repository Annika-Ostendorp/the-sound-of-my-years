<script>
  /** Original Memory Wave mark — a flowing signal, not a stock audio or vinyl icon. */
  export let size = 44;
  // Stable per-instance SVG gradient IDs; the mark appears in header and drawer.
  const uid = Math.random().toString(36).slice(2, 9);
  const gradientId = `tsmy-wave-${uid}`;
</script>

<svg
  class="memory-wave"
  width={size}
  height={Math.round(size * 0.68)}
  viewBox="0 0 72 48"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
  focusable="false"
>
  <defs>
    <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6FDCE0" />
      <stop offset=".24" stop-color="#967FFF" />
      <stop offset=".58" stop-color="#EB79D1" />
      <stop offset=".81" stop-color="#FF78B9" />
      <stop offset="1" stop-color="#FFB08F" />
    </linearGradient>
  </defs>
  <path
    class="wave-glow"
    d="M3 25H11C16 25 16 12 21 12C27 12 27 38 32 38C38 38 38 8 43 8C49 8 49 32 54 32C59 32 59 23 64 23H69"
    stroke={`url(#${gradientId})`}
  />
  <path
    class="wave-core"
    d="M3 25H11C16 25 16 12 21 12C27 12 27 38 32 38C38 38 38 8 43 8C49 8 49 32 54 32C59 32 59 23 64 23H69"
    stroke={`url(#${gradientId})`}
  />
  <path
    class="wave-shimmer"
    d="M3 25H11C16 25 16 12 21 12C27 12 27 38 32 38C38 38 38 8 43 8C49 8 49 32 54 32C59 32 59 23 64 23H69"
  />
</svg>

<style>
  .memory-wave { display:block; flex:none; overflow:visible; }
  .wave-glow,.wave-core,.wave-shimmer { fill:none; stroke-linecap:round; stroke-linejoin:round; }
  .wave-glow { stroke-width:6; opacity:.34; filter:blur(5px); }
  .wave-core { stroke-width:3.5; }
  .wave-shimmer { stroke:#fff9f8; stroke-width:2; opacity:.72; stroke-dasharray:9 150; stroke-dashoffset:0; animation:trace 9s linear infinite; }
  :global(.brand-link:hover) .wave-core, :global(.brand-link:focus-visible) .wave-core { filter:drop-shadow(0 0 4px rgba(237,146,221,.55)); }
  @keyframes trace { to { stroke-dashoffset:-159; } }
  @media(prefers-reduced-motion: reduce) { .wave-shimmer { animation:none; opacity:0; } }
</style>

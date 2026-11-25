<script>
  // Kapitel-Marke für World 01: gleiche Sprache wie der Einstieg, aber als Outline, damit Welt (gefüllt) und Kapitel (Kontur) klar unterscheidbar sind.
  let { n = 1, total = 3, title = '', center = false } = $props();
</script>

<div class="mark" class:center>
  <span class="badge"><b>CH</b>{n}<small>/{total}</small></span>
  <i aria-hidden="true"></i>
  <span class="t">CHAPTER {n} · {title.toUpperCase()}</span>
</div>

<style>
  .mark { display: flex; align-items: center; gap: .9rem; font: 700 .68rem var(--font-body, 'DM Sans', sans-serif); letter-spacing: .22em; color: #FFE0C8; }
  .mark.center { justify-content: center; }
  .badge { display: inline-flex; align-items: baseline; gap: .3rem; padding: .28rem .75rem; border-radius: 999px; border: 1.5px solid #FFB98E; color: #FFB98E; font: 700 .95rem var(--font-family, 'Syne', sans-serif); letter-spacing: .04em; }
  .badge b { font: 700 .55rem var(--font-body, 'DM Sans', sans-serif); letter-spacing: .2em; opacity: .85; }
  .badge small { font-size: .6rem; opacity: .6; }
  i { display: block; width: 34px; height: 1px; background: #FFB98E; opacity: .7; }
</style>

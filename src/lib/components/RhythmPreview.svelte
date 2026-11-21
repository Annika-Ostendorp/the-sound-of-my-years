<script>
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  let selectedDay = 'FRI';
  let root;

  // DEMO ONLY — all bars are generated, not from Spotify.
  function sample(day) {
    const offset = weekdays.indexOf(day);
    return hours.map((hour) => {
      const morning = 0.65 * Math.exp(-Math.pow((hour - (9 + offset * 0.2)) / 4, 2));
      const afternoon = 0.9 * Math.exp(-Math.pow((hour - (16 - offset * 0.1)) / 5, 2));
      const evening = 0.30 * Math.exp(-Math.pow((hour - 21) / 3.4, 2));
      return Math.min(1, 0.12 + morning + afternoon + evening + 0.05 * Math.sin(hour * 1.5 + offset));
    });
  }
  $: values = sample(selectedDay);

  function at(r, a) { return [210 + r * Math.cos(a), 210 + r * Math.sin(a)]; }
  function bar(hour, value) {
    const start = -Math.PI / 2 + (hour / 24) * 2 * Math.PI + 0.018;
    const end = -Math.PI / 2 + ((hour + 1) / 24) * 2 * Math.PI - 0.018;
    const inner = 106, outer = inner + 22 + value * 68;
    const [x1,y1] = at(inner,start), [x2,y2] = at(outer,start);
    const [x3,y3] = at(outer,end), [x4,y4] = at(inner,end);
    return `M${x1},${y1} L${x2},${y2} A${outer},${outer} 0 0 1 ${x3},${y3} L${x4},${y4} A${inner},${inner} 0 0 0 ${x1},${y1}Z`;
  }

  onMount(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from('.reveal', {
        opacity: 0, y: 45, duration: 1.2, ease: 'power3.out', stagger: 0.13,
        scrollTrigger: { trigger: root, start: 'top 80%', once: true }
      });
    }, root);
    return () => ctx.revert();
  });
</script>

<section bind:this={root} id="rhythm" class="world" aria-labelledby="rhythm-title">
  <header class="world-header reveal">
    <p class="world-kicker">WORLD 01 <span>/</span> LISTENING PATTERNS</p>
    <h2 id="rhythm-title">The rhythm<br /><em>of my day.</em></h2>
    <p class="world-subhead">An ordinary clock tells the time.<br />Mine tells me when I listened.</p>
  </header>
  <div class="glass-chart reveal">
    <div class="chart-description">
      <p class="eyebrow">THE MUSICAL FINGERPRINT</p>
      <h3>A day in sound.</h3>
      <p>Explore a 24-hour shape. Choose a weekday to change the animated visual.</p>
      <div class="day-select" role="group" aria-label="Choose a day">
        {#each weekdays as weekday}
          <button type="button" aria-pressed={selectedDay === weekday} class:selected={selectedDay === weekday} onclick={() => selectedDay = weekday}>{weekday}</button>
        {/each}
      </div>
      <p class="disclaimer"><strong>PROTOTYPE / SYNTHETIC DATA.</strong><br />These values are intentionally illustrative and will be replaced with verified Spotify aggregates.</p>
    </div>
    <svg class="clock" viewBox="0 0 420 420" role="img" aria-label="Illustrative circular listening-clock preview for {selectedDay}, generated from synthetic test values">
      <defs>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bca2ff"/><stop offset="0.53" stop-color="#f397d0"/><stop offset="1" stop-color="#fabc88"/></linearGradient>
        <radialGradient id="halo"><stop offset="0" stop-color="#764592" stop-opacity=".25"/><stop offset="1" stop-color="#34124b" stop-opacity="0"/></radialGradient>
      </defs>
      <circle cx="210" cy="210" r="190" fill="url(#halo)" />
      <circle cx="210" cy="210" r="99" fill="none" stroke="#765b92" stroke-opacity=".4" stroke-width="1.5" />
      <circle cx="210" cy="210" r="84" fill="#231330" stroke="#9b72b7" stroke-opacity=".35" />
      {#each hours as hour}
        <path d={bar(hour,values[hour])} fill="url(#ring)" fill-opacity={0.49+values[hour]*0.4} stroke="#e9bfdd" stroke-width=".9" stroke-opacity=".55" >
          <title>{String(hour).padStart(2,'0')}:00 – illustrative value only</title>
        </path>
      {/each}
      <g fill="#bda4c7" font-size="12" font-family="sans-serif"><text x="210" y="20" text-anchor="middle">00</text><text x="410" y="214" text-anchor="end">06</text><text x="210" y="414" text-anchor="middle">12</text><text x="8" y="214">18</text></g>
      <text x="210" y="204" text-anchor="middle" fill="#f7eafb" font-size="28" font-weight="700">24h</text>
      <text x="210" y="232" text-anchor="middle" fill="#ffcae1" font-size="12" letter-spacing="3">{selectedDay}</text>
    </svg>
  </div>
  <p class="next-note reveal">NEXT / Connect verified data and refine the interactive clock.</p>
</section>

<style>
  .world { min-height:100svh; padding:clamp(5rem,12vh,11rem) max(5vw,24px) 7rem; background:radial-gradient(circle at 70% 35%, #291537 0%, #100a1e 39%, #0a0714 90%); position:relative; }
  .world:before { position:absolute; content:''; left:0; right:0; top:0; height:1px; background:linear-gradient(90deg,transparent,#b98fbd,transparent); opacity:.4; }
  .world-header,.glass-chart,.next-note { max-width:1370px; margin-left:auto; margin-right:auto; }
  .world-kicker { font-size:.72rem; letter-spacing:.2em; font-weight:600; color:#f6a5ad; }
  .world-kicker span { padding:0 .75rem; opacity:.5; }
  h2 { margin:1.3rem 0 1.5rem; font-weight:600; font-size:clamp(3rem,7.5vw,7.7rem); line-height:.95; letter-spacing:-.055em; }
  h2 em { color:#ebadd1; font-family:Georgia,serif; font-weight:400; letter-spacing:-.07em; }
  .world-subhead { color:#c5b1d0; font-size:clamp(1.05rem,1.6vw,1.3rem); line-height:1.55; margin-bottom:3rem; }
  .glass-chart { display:grid; grid-template-columns:minmax(280px,1fr) minmax(310px,1fr); align-items:center; gap:2rem; padding:clamp(1.7rem,3.5vw,4rem); border:1px solid rgba(225,175,239,.28); border-radius:2rem; background:linear-gradient(145deg,rgba(116,75,131,.22),rgba(26,13,44,.73) 65%); box-shadow:0 30px 130px rgba(23,4,42,.48),inset 0 1px 0 rgba(255,223,247,.18); backdrop-filter:blur(20px); }
  .eyebrow { font-size:.69rem; letter-spacing:.16em; font-weight:700; color:#f1b7cc; }
  h3 { margin:1rem 0 1rem; font-size:clamp(2rem,3.2vw,3.6rem); font-weight:500; letter-spacing:-.04em; }
  .chart-description > p:not(.eyebrow) { color:#c9b5d0; max-width:31rem; line-height:1.6; }
  .day-select { display:flex; gap:.4rem; flex-wrap:wrap; margin:2rem 0; }
  .day-select button { min-width:3rem; padding:.9rem .7rem; cursor:pointer; border:1px solid #604969; background:#32213f; border-radius:.7rem; color:#dac8e3; font-size:.72rem; font-weight:650; transition:background .2s,transform .2s; }
  .day-select button:hover { transform:translateY(-3px); background:#57355e; }
  .day-select button.selected { background:#d998c4; border-color:#f8c5de; color:#240e2b; }
  .chart-description .disclaimer { margin-top:3rem; font-size:.7rem; color:#bba9c4 !important; }
  .clock { width:100%; max-width:650px; justify-self:center; overflow:visible; filter:drop-shadow(0 0 35px rgba(189,103,208,.23)); }
  .clock path { transition:all .5s cubic-bezier(.2,.7,.2,1); }
  .next-note { font-size:.67rem; letter-spacing:.15em; margin-top:3rem; color:#ad90bf; }
  @media(max-width:820px) { .glass-chart { grid-template-columns:1fr; } .world { padding-top:6rem; } }
</style>

<script>
  // Memory Check: Erinnerung wird zu Daten — live beim Scrollen.
  // Gepinnt: erst meine Erinnerung als wackelige Handskizze (Abend dominiert), dann morpht sie in die echten Anteile
  // (Skizze -> Glas, Wackeln -> scharf, Zahlen zählen hoch). Die Schätzung bleibt als gestrichelter Geist stehen.
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import rhythmData from '../../data/rhythm_2026_preview.json';
  import HandArrow from '../fatfish/HandArrow.svelte';
  import ChapterMark from './ChapterMark.svelte';

  // TODO(Annika): deine echte Vermutung. Eine von 'Night' | 'Morning' | 'Afternoon' | 'Evening'.
  let { assumed = 'Evening' } = $props();

  const PARTS = [
    { id: 'Night', range: '00–05', from: 0, to: 6 },
    { id: 'Morning', range: '06–11', from: 6, to: 12 },
    { id: 'Afternoon', range: '12–17', from: 12, to: 18 },
    { id: 'Evening', range: '18–23', from: 18, to: 24 }
  ];
  const hours = rhythmData.profiles.find((p) => p.id === 'ALL').hours;
  const total = hours.reduce((a, b) => a + b, 0);
  const parts = PARTS.map((p) => ({ ...p, share: hours.slice(p.from, p.to).reduce((a, b) => a + b, 0) / total }));
  const top = parts.reduce((a, b) => (b.share > a.share ? b : a));
  const guess = $derived(parts.find((p) => p.id === assumed) ?? parts[3]);
  const hit = $derived(guess.id === top.id);
  const pct = (v) => Math.round(v * 100);
  const hh = (h) => String(h).padStart(2, '0') + ':00';
  const peakH = hours.indexOf(Math.max(...hours));
  const quietH = hours.indexOf(Math.min(...hours));

  // So sehe ich den Tag in der Erinnerung: die Schätzung dominiert (nur Form, keine Zahlen).
  const remembered = $derived(parts.map((p) => (p.id === guess.id ? 0.56 : (0.44 * p.share) / (1 - guess.share))));

  let host, stage, note, displace, leadA, leadB, chipR, chipD, glowA, glowB, ring;
  let segEls = [], shapeSk = [], shapeSo = [], numEls = [], facts = [];
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const seg = (a, b, x) => Math.max(0, Math.min(1, (x - a) / (b - a)));

  function apply(p) {
    const m = ease(seg(0.12, 0.62, p));              // Morph Erinnerung -> Daten
    const solid = ease(seg(0.3, 0.66, p));           // Skizze -> Glas
    const nums = ease(seg(0.56, 0.78, p));           // Zahlen zählen hoch
    const swap = seg(0.6, 0.76, p);                  // Aussage + Chip wechseln
    let acc = 0;
    const flex = parts.map((q, i) => remembered[i] + (q.share - remembered[i]) * m);
    const sum = flex.reduce((a, b) => a + b, 0);
    parts.forEach((q, i) => {
      segEls[i].style.flex = `${flex[i]} 1 0`;
      shapeSk[i].style.opacity = String(1 - solid);
      shapeSo[i].style.opacity = String(solid * (q.id === top.id ? 1 : 0.9));
      shapeSo[i].classList.toggle('top', q.id === top.id);
      numEls[i].style.opacity = String(nums);
      numEls[i].firstChild.textContent = Math.round(q.share * 100 * nums);
      if (q.id === guess.id) { note.style.left = `${((acc + flex[i] / 2) / sum) * 100}%`; }
      acc += flex[i];
    });
    displace?.setAttribute('scale', String((1 - ease(seg(0.1, 0.62, p))) * 11));
    const wob = p < 0.62 ? 'url(#mc-wobble)' : 'none';
    shapeSk.forEach((el) => (el.style.filter = wob));
    shapeSo.forEach((el) => (el.style.filter = wob));
    leadA.style.opacity = String(1 - swap); leadB.style.opacity = String(swap);
    leadB.style.transform = `translateY(${(1 - swap) * 14}px)`; leadA.style.transform = `translateY(${-swap * 14}px)`;
    chipR.classList.toggle('on', swap < 0.5); chipD.classList.toggle('on', swap >= 0.5);
    glowA.style.opacity = String((1 - m) * 0.9); glowB.style.opacity = String(m * 0.85);
    note.style.opacity = String(0.55 + 0.45 * nums);
    ring.style.opacity = String(seg(0.62, 0.8, p));
    facts.forEach((f, i) => {
      const t = ease(seg(0.8 + i * 0.045, 0.92 + i * 0.045, p));
      f.style.opacity = String(t); f.style.transform = `translateY(${(1 - t) * 22}px) rotate(${[-2.2, 1.6, -1.2][i]}deg) scale(${0.92 + t * 0.08})`;
      f.style.filter = t < 0.98 ? `blur(${(1 - t) * 8}px)` : 'none';
    });
  }

  onMount(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia('(max-width: 640px)').matches;
    if (reduced || small) { host.classList.add('static'); apply(1); return; }
    gsap.registerPlugin(ScrollTrigger);
    let target = 0, shown = 0;
    apply(0);
    const st = ScrollTrigger.create({ trigger: host, start: 'top top', end: '+=115%', pin: stage, pinSpacing: true, anticipatePin: 1, refreshPriority: 50, onUpdate: (s) => { target = s.progress; } });
    const tick = () => { shown += (target - shown) * 0.14; if (Math.abs(target - shown) > 0.0004) apply(shown); else if (shown !== target) { shown = target; apply(shown); } };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); st.kill(); };
  });
</script>

<section id="chapter-2" class="check" bind:this={host} aria-labelledby="check-title">
  <svg width="0" height="0" aria-hidden="true" style="position:absolute">
    <filter id="mc-wobble" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves="2" seed="7" />
      <feDisplacementMap bind:this={displace} in="SourceGraphic" scale="11" />
    </filter>
  </svg>

  <div class="stage" bind:this={stage}>
    <div class="glow a" bind:this={glowA} aria-hidden="true"></div>
    <div class="glow b" bind:this={glowB} aria-hidden="true"></div>

    <div class="wrap">
      <div class="chmark"><ChapterMark n={2} title="My guess vs. the data" /></div>
      <p class="chip"><span class="r on" bind:this={chipR}>WHAT I REMEMBER</span><i>vs.</i><span class="d" bind:this={chipD}>WHAT THE DATA KNOWS</span></p>
      <h3 id="check-title">I would have said <em>{guess.id.toLowerCase()}s.</em></h3>

      <div class="leads">
        <p class="lead" bind:this={leadA}>That is how my day feels in memory.</p>
        <p class="lead" bind:this={leadB}>
          {#if hit}The data agrees: <b>{pct(top.share)}%</b> of my listening happens in the {top.id.toLowerCase()}.
          {:else}The data disagrees: the <b>{top.id.toLowerCase()}</b> holds <b>{pct(top.share)}%</b> of my listening.{/if}
        </p>
      </div>

      <div class="chart">
        <div class="note" bind:this={note}>
          <span class="script">my guess</span>
          <div class="arr"><HandArrow from={{ x: 10, y: 8 }} to={{ x: 62, y: 98 }} w={90} h={110} bend={0.4} s={true} color="#FFC79A" width={3.4} delay={0.25} /></div>
        </div>

        <div class="bar" role="img" aria-label={`Share of listening by time of day: ${parts.map((p) => `${p.id} ${pct(p.share)} percent`).join(', ')}.`}>
          {#each parts as p, i (p.id)}
            <div class="seg" bind:this={segEls[i]} style:flex="1 1 0">
              <span class="shape sk" bind:this={shapeSk[i]}></span>
              <span class="shape so" bind:this={shapeSo[i]}></span>
              {#if p.id === guess.id}<span class="gring" bind:this={ring}></span>{/if}
              <strong bind:this={numEls[i]}><span>0</span><small>%</small></strong>
              <span class="lab">{p.id.toUpperCase()}</span>
              <em>{p.range}</em>
            </div>
          {/each}
        </div>
      </div>

      <div class="facts">
        <div class="fact" bind:this={facts[0]}><b>{hh(peakH)}</b><span>my loudest hour</span></div>
        <div class="fact" bind:this={facts[1]}><b>{hh(quietH)}</b><span>the quietest</span></div>
        <div class="fact wide" bind:this={facts[2]}><b>{pct(guess.share)}%</b><span>{guess.id.toLowerCase()} is what I guessed, {hit ? 'and it holds' : `the ${top.id.toLowerCase()} holds ${pct(top.share)}%`}</span></div>
      </div>
    </div>
  </div>
</section>

<style>
  .check { position: relative; background: #100B1E; }
  .stage { position: relative; min-height: 100vh; min-height: 100svh; overflow: hidden; display: flex; align-items: center; background: #100B1E; }
  .glow { position: absolute; inset: 0; pointer-events: none; }
  .glow.a { background: radial-gradient(ellipse 55% 60% at 78% 78%, rgba(255,148,90,.34), transparent 70%), radial-gradient(ellipse 40% 40% at 10% 10%, rgba(120,70,190,.2), transparent 70%); }
  .glow.b { background: radial-gradient(ellipse 60% 62% at 52% 82%, rgba(246,96,185,.34), transparent 72%), radial-gradient(ellipse 40% 40% at 90% 8%, rgba(255,185,142,.16), transparent 70%); opacity: 0; }
  .wrap { position: relative; width: 100%; max-width: 1180px; margin: 0 auto; padding: clamp(4.5rem, 9vh, 6rem) clamp(1.2rem, 5vw, 5rem) clamp(1.2rem, 3vh, 2.5rem); }

  .chmark { margin-bottom: clamp(.8rem, 2vh, 1.3rem); }
  .chip { display: inline-flex; align-items: center; gap: .7rem; margin: 0; font: 700 .62rem var(--font-body, 'DM Sans', sans-serif); letter-spacing: .16em; }
  .chip span { padding: .35rem .8rem; border-radius: 999px; border: 1.5px dashed rgba(255,199,154,.45); color: rgba(255,199,154,.55); transition: all .35s; }
  .chip :global(.r.on) { border-color: #FFC79A; color: #FFC79A; }
  .chip .d { border-style: solid; border-color: transparent; background: rgba(248,238,232,.14); color: #CDB5D2; }
  .chip :global(.d.on) { background: #F8EEE8; color: #100B1E; }
  .chip i { font: italic 400 1.1rem var(--font-editorial, 'Instrument Serif', serif); color: #B79BC4; }
  h3 { margin: clamp(.8rem, 2vh, 1.4rem) 0 0; font: 650 clamp(2.6rem, min(6.4vw, 11vh), 6rem)/1 var(--font-display, 'Syne', sans-serif); letter-spacing: -.055em; color: #FFF3EE; }
  h3 em { font: italic 400 1.08em/1 var(--font-editorial, 'Instrument Serif', serif); letter-spacing: -.02em; background: linear-gradient(90deg, #FFB98E, #F660B9); -webkit-background-clip: text; background-clip: text; color: transparent; padding-right: .14em; }
  .leads { display: grid; margin-top: clamp(.7rem, 1.8vh, 1.2rem); }
  .lead { grid-area: 1 / 1; margin: 0; max-width: 34ch; font: 400 clamp(1.25rem, min(2.2vw, 3.6vh), 2rem)/1.25 var(--font-editorial, 'Instrument Serif', serif); color: #E6D0E4; will-change: opacity, transform; }
  .lead:last-child { opacity: 0; }
  .lead b { font-weight: 400; font-style: italic; color: #FFB98E; }

  .chart { position: relative; margin-top: clamp(4rem, 9vh, 6.2rem); }
  .bar { display: flex; gap: .6rem; height: clamp(140px, min(21vw, 26vh), 230px); }
  .seg { position: relative; min-width: clamp(64px, 9%, 120px); display: flex; flex-direction: column; justify-content: flex-end; gap: .15rem; padding: 1rem 1.1rem; }
  .shape { position: absolute; inset: 0; border-radius: 22px; pointer-events: none; will-change: opacity, filter; }
  .shape.sk { border: 2.5px solid rgba(248,238,232,.78); background: repeating-linear-gradient(135deg, rgba(248,238,232,.16) 0 2px, transparent 2px 10px); }
  .shape.so { background: linear-gradient(145deg, rgba(255,255,255,.12), rgba(255,255,255,.035)); border: 1px solid rgba(255,255,255,.16); box-shadow: inset 0 1px 0 rgba(255,255,255,.22); }
  .shape.so:global(.top) { background: linear-gradient(160deg, #FFB98E, #F660B9); border-color: transparent; box-shadow: 0 30px 60px -24px rgba(246,96,185,.8), inset 0 1px 0 rgba(255,255,255,.5); }
  .gring { position: absolute; inset: -5px; border-radius: 26px; border: 2px dashed #FFC79A; opacity: 0; pointer-events: none; }
  .seg strong { position: relative; font: 650 clamp(1.6rem, 3.6vw, 3.4rem)/1 var(--font-display, 'Syne', sans-serif); letter-spacing: -.05em; color: #F8EEE8; opacity: 0; }
  .seg strong small { font-size: .5em; margin-left: .1em; color: #C9AACB; }
  .lab { position: relative; font: 700 .6rem var(--font-body, 'DM Sans', sans-serif); letter-spacing: .16em; color: #E7C6E2; }
  .seg em { position: relative; font: italic 400 .95rem var(--font-editorial, 'Instrument Serif', serif); color: #B8A2C6; }
  .seg:has(:global(.so.top)) strong, .seg:has(:global(.so.top)) .lab, .seg:has(:global(.so.top)) em { color: #1B0C2C; }
  .seg:has(:global(.so.top)) strong small { color: rgba(27,12,44,.6); }

  .note { position: absolute; bottom: calc(100% + .4rem); left: 70%; transform: translateX(-50%); display: flex; align-items: flex-end; gap: .2rem; pointer-events: none; z-index: 2; }
  .script { font: 400 clamp(1.5rem, 2.6vw, 2.3rem)/1 var(--font-hand, 'Mansalva', cursive); color: #FFD9B8; white-space: nowrap; transform: rotate(-5deg); display: block; }
  .arr { width: clamp(3.8rem, 6vw, 5.2rem); margin-bottom: -3.4rem; margin-left: -.4rem; }

  .facts { display: flex; flex-wrap: wrap; gap: .9rem; margin-top: clamp(1.1rem, 2.6vh, 2rem); }
  .fact { display: flex; align-items: center; gap: .8rem; padding: .7rem 1.15rem .7rem 1rem; border-radius: 18px; opacity: 0; will-change: transform, opacity, filter;
    background: linear-gradient(145deg, rgba(255,255,255,.12), rgba(255,255,255,.035)); border: 1px solid rgba(255,255,255,.16); backdrop-filter: blur(14px) saturate(1.3); -webkit-backdrop-filter: blur(14px) saturate(1.3);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 18px 40px -18px rgba(0,0,0,.65); }
  .fact b { font: 700 clamp(1.3rem, 2.2vw, 1.9rem)/1 var(--font-display, 'Syne', sans-serif); letter-spacing: -.04em; color: #FFD0A8; }
  .fact span { font: 500 .74rem/1.3 var(--font-body, 'DM Sans', sans-serif); letter-spacing: .03em; color: #D8C2DC; max-width: 16ch; }
  .fact.wide span { max-width: 26ch; }

  /* Ohne Pin (Reduced Motion / Mobil): Endzustand */
  :global(.check.static) .stage { min-height: 0; padding: 3rem 0; }
  :global(.check.static) .glow.a { opacity: 0 !important; }
  :global(.check.static) .bar { flex-wrap: wrap; height: auto; }
  :global(.check.static) .seg { flex: 1 1 40% !important; min-height: 120px; }
  :global(.check.static) .note { display: none; }
</style>

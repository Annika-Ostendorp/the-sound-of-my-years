<script>
  import { onMount } from 'svelte';
  import { JOURNEY_SECTIONS, isNavigable } from '../navigation/journeySections.js';

  export let currentId = 'top';
  export let closing = false;
  export let onRequestClose = () => {};
  export let onNavigate = () => {};

  let panel;
  let closeButton;

  onMount(() => {
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    const main = document.querySelector('main');
    const wasInert = main?.inert ?? false;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    if (main) main.inert = true;
    closeButton?.focus();
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      if (main) main.inert = wasInert;
    };
  });

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onRequestClose();
      return;
    }
    if (event.key !== 'Tab' || !panel) return;
    const targets = [...panel.querySelectorAll('button:not([disabled]), a[href]')]
      .filter((node) => node.getClientRects().length);
    if (!targets.length) return;
    const first = targets[0];
    const last = targets[targets.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }

  function go(event, id) {
    event.preventDefault();
    if (!closing) onNavigate(id);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="drawer-layer" id="journey-overlay" class:closing>
  <button class="drawer-backdrop" type="button" aria-label="Close the Journey menu" onclick={onRequestClose}></button>
  <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="journey-menu-heading" bind:this={panel}>
    <div class="drawer-head">
      <p class="drawer-overline">THE SOUND OF MY YEARS / ARCHIVE</p>
      <button class="drawer-close" bind:this={closeButton} type="button" aria-label="Close navigation" onclick={onRequestClose}>
        <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
      </button>
    </div>

    <div class="drawer-body">
      <p class="chapter-overline">EXPLORE THE JOURNEY</p>
      <h2 id="journey-menu-heading">A listening <em>history.</em></h2>
      <p class="drawer-lead">Eight moments. One time capsule.</p>

      <nav class="chapter-nav" aria-label="Journey chapters">
        {#each JOURNEY_SECTIONS as section (section.id)}
          {#if isNavigable(section)}
            <a class:active={section.id === currentId} href={`#${section.id}`} aria-current={section.id === currentId ? 'location' : undefined} onclick={(event)=>go(event,section.id)}>
              <span class="chapter-number">{section.number}</span>
              <span class="chapter-name">{section.title}</span>
              {#if section.status === 'preview'}<span class="preview-label">PREVIEW</span>{/if}
              <span class="chapter-arrow" aria-hidden="true">↗</span>
            </a>
          {:else}
            <div class="chapter-planned" aria-label={`${section.title}, in development`}>
              <span class="chapter-number">{section.number}</span>
              <span class="chapter-name">{section.title}</span>
            </div>
          {/if}
        {/each}
      </nav>
      <a href="#about" class="about-link" onclick={(event)=>go(event,'about')}>About the project <span aria-hidden="true">↗</span></a>
    </div>

    <div class="drawer-foot">
      <span>MORE WORLDS ARE IN DEVELOPMENT</span>
      <span>INDEPENDENT STUDENT PROJECT · NOT AFFILIATED WITH SPOTIFY</span>
    </div>
  </aside>
</div>

<style>
  .drawer-layer { position:fixed; inset:0; z-index:150; pointer-events:auto; }
  .drawer-backdrop { position:absolute; inset:0; width:100%; height:100%; padding:0; border:0; background:rgba(4,2,11,.65); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); animation:backdrop-enter .3s both; cursor:default; }
  .drawer { position:absolute; inset:0 0 0 auto; width:min(460px,100%); height:100%; height:100dvh; display:flex; flex-direction:column; padding:clamp(1.4rem,2.8vw,2.4rem); color:#f9edf7; background:radial-gradient(ellipse 110% 55% at 90% 0%,rgba(106,49,109,.21),transparent 72%),#0e0718; border-left:1px solid rgba(240,180,223,.17); box-shadow:-20px 0 100px rgba(0,0,0,.47); overflow-y:auto; overscroll-behavior:contain; animation:drawer-enter .45s cubic-bezier(.19,1,.22,1) both; }
  .drawer-head { display:flex; justify-content:space-between; align-items:center; gap:1rem; }
  .drawer-overline { margin:0; font-size:.61rem; letter-spacing:.15em; font-weight:700; color:#beacc9; }
  .drawer-close { display:grid; place-items:center; width:38px; height:38px; border:1px solid rgba(234,187,223,.25); background:rgba(255,255,255,.025); color:#f9dfef; border-radius:50%; cursor:pointer; flex:none; transition:background .2s,border-color .2s; }
  .drawer-close:hover,.drawer-close:focus-visible { background:rgba(255,255,255,.07); border-color:#e99bcf; }
  .drawer-close svg { fill:none; stroke:currentColor; stroke-width:1.4; stroke-linecap:round; }
  .drawer-body { margin:auto 0; padding:clamp(2rem,7vh,4rem) 0; }
  .chapter-overline { margin:0; font-size:.64rem; font-weight:700; letter-spacing:.2em; color:#edaec9; }
  h2 { font-size:clamp(2.25rem,3.8vw,3.1rem); line-height:.98; font-weight:500; letter-spacing:-.05em; margin:1.05rem 0 .7rem; }
  h2 em { font-family:'Instrument Serif',Georgia,serif; font-weight:400; color:#f0b7d7; }
  .drawer-lead { margin:0; font-size:.85rem; color:#ad97b8; }
  .chapter-nav { display:flex; flex-direction:column; gap:.25rem; margin:clamp(1.6rem,4.3vh,2.8rem) 0 1.15rem; }
  .chapter-nav a,.chapter-planned { display:flex; gap:1rem; align-items:baseline; min-height:40px; padding:.52rem .15rem; text-decoration:none; }
  .chapter-nav a { border-radius:6px; transition:color .2s,background .2s,transform .2s; }
  .chapter-nav a:hover,.chapter-nav a:focus-visible { color:#ffd7e9; background:rgba(255,255,255,.025); transform:translateX(3px); }
  .chapter-nav a.active .chapter-name { color:#ffc1e2; }
  .chapter-number { color:#a483b5; flex:none; font-size:.66rem; font-weight:700; font-variant-numeric:tabular-nums; }
  .chapter-name { flex:1; min-width:0; font-size:clamp(.93rem,1.4vw,1.06rem); font-weight:480; line-height:1.2; color:#f0dbea; }
  .chapter-arrow { font-size:1rem; color:#eeb4d9; }
  .preview-label { color:#b99bc3; font-size:.53rem; font-weight:700; letter-spacing:.09em; }
  .chapter-planned { opacity:.43; }
  .chapter-planned .chapter-name { color:#d8c9df; }
  .about-link { display:flex; align-items:center; justify-content:space-between; gap:1rem; color:#eebbbf; text-decoration:none; font-size:.85rem; padding:.75rem .15rem 0; }
  .about-link:hover { color:#ffe5db; }
  .drawer-foot { display:grid; gap:.5rem; font-size:.53rem; font-weight:700; line-height:1.5; letter-spacing:.12em; color:#9580a2; padding-bottom:env(safe-area-inset-bottom,0px); }
  .closing .drawer-backdrop { animation:backdrop-exit .23s ease both; }
  .closing .drawer { animation:drawer-exit .25s cubic-bezier(.6,0,.8,1) both; pointer-events:none; }
  @keyframes backdrop-enter { from{opacity:0;} to{opacity:1;} }
  @keyframes backdrop-exit { from{opacity:1;} to{opacity:0;} }
  @keyframes drawer-enter { from{transform:translateX(100%);} to{transform:translateX(0);} }
  @keyframes drawer-exit { from{transform:translateX(0);} to{transform:translateX(100%);} }
  @media(max-width:520px) { .drawer { padding:1.4rem; } .chapter-nav { margin:1.6rem 0 1rem; gap:.1rem; } .chapter-nav a,.chapter-planned { min-height:37px; padding:.4rem .15rem; } }
  @media(max-height:660px) { .drawer-body { margin:0; padding:2rem 0; } }
  @media(prefers-reduced-motion:reduce) { .drawer-backdrop,.drawer,.closing .drawer-backdrop,.closing .drawer { animation:none; } .chapter-nav a { transition:none; } }
</style>

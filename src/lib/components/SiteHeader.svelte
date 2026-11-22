<script>
  import { onMount, tick } from 'svelte';
  import BrandMark from './BrandMark.svelte';
  import JourneyMenu from './JourneyMenu.svelte';

  let open = false;
  let closing = false;
  let menuButton;
  let activeId = 'top';
  let immersive = false;

  onMount(() => {
    function updatePosition() {
      const position = window.scrollY + window.innerHeight * .48;
      const rhythm = document.getElementById('rhythm');
      const about = document.getElementById('about');
      activeId = (about && position >= about.offsetTop) ? 'about'
        : (rhythm && position >= rhythm.offsetTop) ? 'rhythm' : 'top';
      immersive = window.scrollY > window.innerHeight * 1.1 && activeId === 'top';
    }
    updatePosition();
    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  });

  async function closeMenu(restoreFocus = true) {
    if (!open || closing) return;
    closing = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) await new Promise((resolve) => window.setTimeout(resolve, 250));
    open = false;
    closing = false;
    await tick();
    if (restoreFocus) menuButton?.focus();
  }

  async function navigateTo(id) {
    await closeMenu(false);
    const destination = document.getElementById(id);
    if (!destination) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    destination.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
    activeId = id;
    destination.setAttribute('tabindex', '-1');
    destination.focus({ preventScroll: true });
  }

  function goHome(event) {
    event.preventDefault();
    navigateTo('top');
  }
</script>

<header class="site-header" class:quiet={immersive && !open} aria-label="Site header">
  <div class="header-inner">
    <a class="brand-link" href="#top" aria-label="The Sound of My Years — back to the capsule" onclick={goHome}>
      <BrandMark size={44} />
      <span class="brand-name">The Sound of My Years</span>
    </a>

    <button
      bind:this={menuButton}
      type="button"
      class="explore-trigger"
      aria-expanded={open && !closing}
      aria-controls={open ? 'journey-overlay' : undefined}
      aria-label={open && !closing ? 'Close the Journey menu' : 'Explore the Journey menu'}
      onclick={() => { if (!open) open = true; else closeMenu(); }}
    >
      <span>EXPLORE</span>
      <svg viewBox="0 0 26 24" width="25" height="23" aria-hidden="true" focusable="false">
        <path d="M3 12v0M8 6v12M13 3v18M18 8v8M23 11v2" />
      </svg>
    </button>
  </div>
  {#if open}
    <JourneyMenu currentId={activeId} {closing} onRequestClose={closeMenu} onNavigate={navigateTo} />
  {/if}
</header>

<style>
  .site-header { position:fixed; inset:0 0 auto; z-index:110; padding:clamp(.8rem,1.65vw,1.45rem) clamp(1rem,4.2vw,5rem); pointer-events:none; }
  .site-header::before { content:''; position:absolute; inset:0 0 auto; height:110%; background:linear-gradient(to bottom,rgba(3,1,9,.62),rgba(3,1,9,.08) 76%,transparent); pointer-events:none; }
  .header-inner { position:relative; width:100%; max-width:1640px; margin:0 auto; display:flex; justify-content:space-between; gap:1rem; align-items:center; pointer-events:auto; transition:opacity .32s; }
  .site-header.quiet .header-inner { opacity:.58; }
  .site-header.quiet .header-inner:hover,.site-header.quiet .header-inner:focus-within { opacity:1; }
  .brand-link { display:inline-flex; align-items:center; gap:.72rem; text-decoration:none; color:#f7e8f3; min-width:0; }
  .brand-name { font-weight:650; font-size:clamp(.73rem,.83vw,.93rem); letter-spacing:-.018em; white-space:nowrap; text-shadow:0 3px 12px #09040f; }
  .explore-trigger { display:inline-flex; align-items:center; gap:.68rem; background:transparent; border:0; color:#f7dfed; padding:.25rem 0 .25rem .5rem; cursor:pointer; }
  .explore-trigger span { font-size:.68rem; letter-spacing:.18em; font-weight:700; }
  .explore-trigger svg { fill:none; stroke:#ee9bcf; stroke-width:2.2; stroke-linecap:round; filter:drop-shadow(0 0 6px rgba(246,115,198,.27)); }
  .explore-trigger:hover svg,.explore-trigger:focus-visible svg { stroke:#ffd7ee; }
  .explore-trigger:hover span { color:#fff; }
  @media(max-width:520px) { .brand-name { font-size:.74rem; } .brand-link { gap:.42rem; } .explore-trigger span { font-size:.57rem; letter-spacing:.1em; } }
  @media(prefers-reduced-motion:reduce) { .header-inner { transition:none; } }
</style>

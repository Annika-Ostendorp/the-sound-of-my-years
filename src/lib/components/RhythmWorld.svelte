<script>
  // WORLD 01 · Section 1: Portal-Übergang -> Einführung -> Waveform-Uhr -> Daten vs. Erinnerung.
  // Der Fingerprint-Abschnitt entfällt (er zeigte dieselben 24 Stunden in anderer Form);
  // Wochentagsunterschiede bleiben über die Tag-Auswahl der Uhr sichtbar.
  import World01Intro from './world01/World01Intro.svelte';
  import LeitmotifBand from './fatfish/LeitmotifBand.svelte';
  import WaveformClock from './world01/WaveformClock.svelte';
  import MemoryCheck from './world01/MemoryCheck.svelte';
  import Fingerprints from './world01/Fingerprints.svelte';
</script>

<section id="rhythm" class="rhythm-world-root" aria-labelledby="rhythm-title">
  <World01Intro />
  <LeitmotifBand />
  <WaveformClock />
  <MemoryCheck />
  <Fingerprints />
</section>

<style>
  .rhythm-world-root { position: relative; isolation: isolate; color: #f5e9f7; background: #100B1E; }
</style>

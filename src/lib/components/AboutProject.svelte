<section class="about" id="about" aria-labelledby="about-heading">
  <div class="about-head">
    <p class="overline">ABOUT THE PROJECT / INFORMATION DESIGN</p>
    <h2 id="about-heading">A listening history.<br /><em>A different way of remembering.</em></h2>
  </div>
  <div class="about-content">
    <p><strong>The Sound of My Years</strong> is an independent student project that turns personal Spotify listening history into an immersive, interactive exploration of memory, habits and musical relationships.</p>
    <p>The project focuses on listening behaviour in 2026, with recordings from 2018 onward providing historical context. Data visualisations will be built from verified, privacy-reviewed summaries — not public raw listening exports.</p>
    <p class="note">Current build: cinematic portal prototype and a 24-hour clock preview with synthetic test values. Additional musical worlds are in development.</p>
    <p class="disclaimer">Independent student project. Not affiliated with or endorsed by Spotify.</p>
  </div>
</section>

<style>
  .about { display:grid; grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr); gap:clamp(2rem,7vw,8rem); padding:clamp(5rem,12vh,10rem) max(6vw,26px); background:#0a0512; border-top:1px solid rgba(225,173,221,.16); }
  .overline { color:#ffb892; font-size:.66rem; font-weight:700; letter-spacing:.22em; }
  h2 { margin:1.4rem 0 0; max-width:14ch; font-size:clamp(2.7rem,5vw,5.7rem); line-height:1.07; font-weight:500; letter-spacing:-.055em; }
  h2 em { font-family:'Instrument Serif',Georgia,serif; font-weight:400; color:#efbcd9; }
  .about-content { padding-top:clamp(2.5rem,5vw,5rem); max-width:50ch; font-size:1rem; color:#d2bfd9; line-height:1.72; }
  .about-content strong { color:#ffe5ef; }
  .about-content p { margin:0 0 1.4rem; }
  .note { color:#f0bbcf; font-size:.86rem; }
  .disclaimer { margin-top:2.7rem!important; color:#9f88ac; font-size:.74rem; }
  @media(max-width:800px) { .about { grid-template-columns:1fr; } .about-content { padding-top:0; } }
</style>

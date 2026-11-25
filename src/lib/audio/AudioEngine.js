import { writable } from 'svelte/store';

/**
 * A generative, ORIGINAL ambient score; never plays or downloads Spotify audio.
 * Audio starts ONLY from an explicit user click. Share one engine across worlds.
 * Web Audio node chain:
 *   original oscillators -> droneBus -> lowpass -> analyser -> master -> speakers
 *   permitted HTMLMediaElement -> mediaBus --------^  (optional future use)
 */
export const audioState = writable({ enabled: false, status: 'off', level: 0.18, error: null });

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export class AudioEngine {
  constructor() {
    this.context = null;
    this.analyser = null;
    this.lowpass = null;
    this.master = null;
    this.droneBus = null;
    this.mediaBus = null;
    this.oscillators = [];
    this.mediaSource = null;
    this.mediaElement = null;
    this.mediaMode = false;
    this.enabled = false;
    this.level = 0.18;
    this.velocity = 0;
    this.scene = 'portal';
    this.actionVersion = 0;
  }

  _build() {
    if (this.context || typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio API is not supported by this browser.');
    const ctx = new AudioContextClass();
    this.context = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.82;
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 460;
    this.lowpass.Q.value = 0.65;
    this.droneBus = ctx.createGain();
    this.droneBus.gain.value = 1;
    this.mediaBus = ctx.createGain();
    this.mediaBus.gain.value = 0;
    this.droneBus.connect(this.lowpass);
    this.lowpass.connect(this.analyser);
    this.mediaBus.connect(this.analyser);
    this.analyser.connect(this.master);
    this.master.connect(ctx.destination);

    // Low amplitude sine waves slightly detuned: slow, warm, non-melodic texture.
    const partials = [
      { hz: 73.42, gain: 0.31, shape: 'sine' },
      { hz: 73.70, gain: 0.24, shape: 'sine' },
      { hz: 146.84, gain: 0.075, shape: 'triangle' },
      { hz: 55.00, gain: 0.11, shape: 'sine' }
    ];
    for (const { hz, gain, shape } of partials) {
      const oscillator = ctx.createOscillator();
      const voiceGain = ctx.createGain();
      oscillator.type = shape;
      oscillator.frequency.value = hz;
      voiceGain.gain.value = gain;
      oscillator.connect(voiceGain);
      voiceGain.connect(this.droneBus);
      oscillator.start();
      this.oscillators.push({ oscillator, voiceGain });
    }
  }

  /** Must be invoked synchronously from a pointer/keyboard activation. */
  async enable() {
    const version = ++this.actionVersion;
    try {
      this._build(); // Construct the AudioContext in the actual click stack.
      await this.context.resume();
      if (version !== this.actionVersion) return false;
      const now = this.context.currentTime;
      this.enabled = true;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(this.level, now + 0.65);
      this.setScene(this.scene);
      audioState.set({ enabled: true, status: 'on', level: this.level, error: null });
      return true;
    } catch (error) {
      this.enabled = false;
      audioState.set({ enabled: false, status: 'error', level: this.level, error: error?.message ?? 'Audio unavailable' });
      return false;
    }
  }

  async disable() {
    const version = ++this.actionVersion;
    this.enabled = false;
    audioState.set({ enabled: false, status: 'off', level: this.level, error: null });
    if (!this.context || this.context.state === 'closed') return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + 0.25);
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (version === this.actionVersion && !this.enabled && this.context?.state === 'running') {
      await this.context.suspend().catch(() => {});
    }
  }

  toggle() { return this.enabled ? this.disable() : this.enable(); }

  /**
   * Datengetriebener Einzelton (Daten-Sonifikation, kein Spotify-Audio).
   * Läuft über denselben Analyser/Master wie der Ambient-Teppich, aber am Lowpass vorbei,
   * damit die Töne klar bleiben. Nur hörbar, wenn Sound aktiv ist.
   */
  playTone(freq, { gain = 0.2, duration = 0.5, type = 'triangle' } = {}) {
    if (!this.enabled || !this.context || !this.analyser) return false;
    const ctx = this.context;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const soft = ctx.createBiquadFilter();
    soft.type = 'lowpass';
    soft.frequency.value = Math.min(4200, freq * 6);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(soft); soft.connect(env); env.connect(this.analyser);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
    osc.onended = () => { try { osc.disconnect(); soft.disconnect(); env.disconnect(); } catch { /* bereits getrennt */ } };
    return true;
  }

  setVolume(level) {
    this.level = clamp(Number(level) || 0, 0, 0.4);
    if (this.context && this.master && this.enabled) {
      this.master.gain.setTargetAtTime(this.level, this.context.currentTime, 0.15);
    }
    audioState.set({ enabled: this.enabled, status: this.enabled ? 'on' : 'off', level: this.level, error: null });
  }

  /** ScrollTrigger velocity in pixels per second, never triggers playback. */
  setScrollVelocity(pxPerSecond) {
    this.velocity = clamp(Math.abs(Number(pxPerSecond) || 0), 0, 3000);
    if (!this.enabled || !this.context || !this.lowpass) return;
    const v = Math.pow(this.velocity / 3000, 0.65);
    const base = this.scene === 'portal' ? 460 : 350;
    this.lowpass.frequency.setTargetAtTime(base + 2150 * v, this.context.currentTime, 0.14);
  }

  /** Crossfade the generative bed for different narrative scenes. */
  setScene(scene = 'portal') {
    this.scene = ['portal', 'world', 'quiet'].includes(scene) ? scene : 'world';
    if (!this.context || !this.droneBus || !this.enabled) return;
    const target = this.mediaMode ? 0 : ({ portal: 1, world: 0.53, quiet: 0.15 })[this.scene];
    this.droneBus.gain.setTargetAtTime(target, this.context.currentTime, 0.35);
    this.setScrollVelocity(this.velocity);
  }

  /**
   * OPTIONAL future licensed-audio integration. The caller owns the legal
   * media source and starts playback after explicit user activation.
   * A MediaElement can be connected only once per AudioContext.
   */
  connectPermittedMediaElement(element) {
    if (!this.context) throw new Error('Enable audio first, from a user gesture.');
    if (!(element instanceof HTMLMediaElement)) throw new TypeError('Expected HTMLMediaElement');
    if (this.mediaSource && this.mediaElement !== element) {
      throw new Error('This engine already has a media element; reuse it or dispose the engine.');
    }
    if (!this.mediaSource) {
      this.mediaSource = this.context.createMediaElementSource(element);
      this.mediaSource.connect(this.mediaBus);
      this.mediaElement = element;
    }
  }

  crossfadeToMedia(seconds = 0.8) {
    if (!this.context || !this.mediaSource) return false;
    this.mediaMode = true;
    const now = this.context.currentTime;
    const end = now + clamp(seconds, 0.1, 4);
    this.droneBus.gain.cancelScheduledValues(now);
    this.mediaBus.gain.cancelScheduledValues(now);
    this.droneBus.gain.setValueAtTime(this.droneBus.gain.value, now);
    this.mediaBus.gain.setValueAtTime(this.mediaBus.gain.value, now);
    this.droneBus.gain.linearRampToValueAtTime(0, end);
    this.mediaBus.gain.linearRampToValueAtTime(1, end);
    return true;
  }

  crossfadeToAmbient(seconds = 0.8) {
    if (!this.context) return;
    this.mediaMode = false;
    const now = this.context.currentTime;
    const end = now + clamp(seconds, 0.1, 4);
    const target = ({ portal: 1, world: 0.53, quiet: 0.15 })[this.scene] ?? 0.53;
    this.droneBus.gain.cancelScheduledValues(now);
    this.mediaBus.gain.cancelScheduledValues(now);
    this.droneBus.gain.setValueAtTime(this.droneBus.gain.value, now);
    this.mediaBus.gain.setValueAtTime(this.mediaBus.gain.value, now);
    this.droneBus.gain.linearRampToValueAtTime(target, end);
    this.mediaBus.gain.linearRampToValueAtTime(0, end);
  }

  getAnalyser() { return this.enabled ? this.analyser : null; }
  getWaveformData() {
    if (!this.enabled || !this.analyser) return null;
    const bytes = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(bytes);
    return bytes;
  }
  getFrequencyData() {
    if (!this.enabled || !this.analyser) return null;
    const bytes = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(bytes);
    return bytes;
  }

  async dispose() {
    ++this.actionVersion;
    this.enabled = false;
    for (const { oscillator, voiceGain } of this.oscillators) {
      try { oscillator.stop(); } catch { /* already stopped */ }
      oscillator.disconnect();
      voiceGain.disconnect();
    }
    this.oscillators = [];
    try { this.mediaSource?.disconnect(); } catch { /* not connected */ }
    if (this.context && this.context.state !== 'closed') await this.context.close().catch(() => {});
    this.context = this.analyser = this.lowpass = this.master = null;
    this.droneBus = this.mediaBus = this.mediaSource = this.mediaElement = null;
    this.mediaMode = false;
    audioState.set({ enabled: false, status: 'off', level: this.level, error: null });
  }
}

export const audioEngine = new AudioEngine();

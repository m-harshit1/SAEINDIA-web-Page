"use client";

/* A synthesized single-cylinder engine (the B-26's Honda GX430T is a 425 cc thumper), built
   from Web Audio oscillators — no audio files. Off by default; browsers only allow it to start
   from a click. Anything on the page can blip the throttle with:
     window.dispatchEvent(new CustomEvent("sae:rev", { detail: { amount: 1, ms: 1500 } }))      */

type Listener = (on: boolean) => void;

class EngineSynth {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private body!: OscillatorNode;   // sawtooth: the exhaust note
  private sub!: OscillatorNode;    // square an octave down: chest-thump
  private pulse!: OscillatorNode;  // firing-rate LFO that chops the note into "putts"
  private pulseDepth!: GainNode;
  private tone!: BiquadFilterNode;  // opens up with revs
  private intake!: GainNode;       // filtered noise, rises with throttle
  private intakeBand!: BiquadFilterNode;
  on = false;
  /** While true (the game is open) the scroll HUD stops driving the engine. */
  external = false;
  private noiseBuf: AudioBuffer | null = null;
  private listeners = new Set<Listener>();

  subscribe(fn: Listener) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach((l) => l(this.on)); }
  private save() { try { localStorage.setItem("sae-engine", this.on ? "1" : "0"); } catch { /* private mode */ } }

  /* The choice persists across visits. Browsers only let audio start from a click/tap/key,
     so a returning "sound on" visitor is armed: the engine fires on their first interaction. */
  private inited = false;
  private disarm: (() => void) | null = null;
  init() {
    if (this.inited) return;
    this.inited = true;
    let saved = false;
    try { saved = localStorage.getItem("sae-engine") === "1"; } catch { /* private mode */ }
    if (!saved) return;
    this.on = true; this.emit();
    const events = ["pointerdown", "keydown", "touchend"] as const;
    const go = (e: Event) => {
      this.disarm?.();
      // First tap is on a sound switch itself: let that click do the starting (else it'd toggle straight off).
      if ((e.target as Element | null)?.closest?.("[data-engine-toggle]")) { this.on = false; return; }
      this.start();
    };
    events.forEach((e) => window.addEventListener(e, go, { capture: true }));
    this.disarm = () => { events.forEach((e) => window.removeEventListener(e, go, { capture: true })); this.disarm = null; };
  }

  private build() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);

    // Mild drive for a rough, mechanical edge.
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(x * 2.4); }
    shaper.curve = curve;

    this.tone = ctx.createBiquadFilter();
    this.tone.type = "lowpass"; this.tone.frequency.value = 500; this.tone.Q.value = 3;

    const chop = ctx.createGain(); chop.gain.value = 0.6;
    this.pulse = ctx.createOscillator(); this.pulse.type = "square"; this.pulse.frequency.value = 12;
    this.pulseDepth = ctx.createGain(); this.pulseDepth.gain.value = 0.4;
    this.pulse.connect(this.pulseDepth).connect(chop.gain);

    this.body = ctx.createOscillator(); this.body.type = "sawtooth"; this.body.frequency.value = 48;
    this.sub = ctx.createOscillator(); this.sub.type = "square"; this.sub.frequency.value = 24;
    const bodyG = ctx.createGain(); bodyG.gain.value = 0.5;
    const subG = ctx.createGain(); subG.gain.value = 0.35;
    this.body.connect(bodyG).connect(shaper);
    this.sub.connect(subG).connect(shaper);
    shaper.connect(chop).connect(this.tone).connect(this.master);

    // Intake / mechanical hiss
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noise.buffer = buf; noise.loop = true; this.noiseBuf = buf;
    this.intakeBand = ctx.createBiquadFilter(); this.intakeBand.type = "bandpass"; this.intakeBand.frequency.value = 900; this.intakeBand.Q.value = 0.8;
    this.intake = ctx.createGain(); this.intake.gain.value = 0.02;
    noise.connect(this.intakeBand).connect(this.intake).connect(this.master);

    [this.body, this.sub, this.pulse, noise].forEach((n) => n.start());
  }

  async start() {
    this.disarm?.();
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    if (ctx.state === "suspended") await ctx.resume();
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0.16, ctx.currentTime, 0.25);
    this.on = true; this.emit(); this.save();
    this.rev(0.9, 900); // starter catch
  }

  stop() {
    this.disarm?.();
    this.on = false; this.emit(); this.save();
    if (!this.ctx) return;
    const ctx = this.ctx;
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    setTimeout(() => { if (!this.on) ctx.suspend(); }, 700);
  }

  toggle() { return this.on ? this.stop() : this.start(); }

  /** Quiet the engine while something else is talking (e.g. a video), then bring it back. */
  duck(quiet: boolean) {
    if (!this.ctx || !this.on) return;
    this.master.gain.setTargetAtTime(quiet ? 0 : 0.16, this.ctx.currentTime, 0.2);
  }

  /** rpm: 1400 idle … 3800 redline. load 0–1: how hard it is pulling. */
  set(rpm: number, load: number) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime, k = 0.05;
    const crank = rpm / 60;
    this.body.frequency.setTargetAtTime(crank * 2, t, k);
    this.sub.frequency.setTargetAtTime(crank, t, k);
    this.pulse.frequency.setTargetAtTime(rpm / 120, t, k);           // one bang every two revs
    this.pulseDepth.gain.setTargetAtTime(0.45 - 0.25 * Math.min(1, (rpm - 1400) / 2400), t, k); // putts blur into a howl
    this.tone.frequency.setTargetAtTime(380 + rpm * 0.35 + load * 1600, t, k);
    this.intake.gain.setTargetAtTime(0.015 + load * 0.06, t, k);
    this.intakeBand.frequency.setTargetAtTime(700 + rpm * 0.3, t, k);
  }

  /** Short knock — a cone or the tyre wall. */
  thud() {
    if (!this.ctx || !this.on || !this.noiseBuf) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = "lowpass"; bp.frequency.value = 520;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t, Math.random()); src.stop(t + 0.2);
  }

  rev(amount = 1, ms = 1200) {
    window.dispatchEvent(new CustomEvent("sae:rev", { detail: { amount, ms } }));
  }
}

export const engine = new EngineSynth();

// ========================================
// NEON GALAXY BLASTER - Game Engine
// ========================================

// Game Configuration
const CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  MAX_LEVELS: 100,
  LIVES: 5,
  PLAYER_SPEED: 6,
  LASER_SPEED: 12,
  LASER_COOLDOWN: 150, // milliseconds
  BASE_ENEMY_SPEED: 1.5,
  ENEMY_SPEED_INCREMENT: 0.3, // per level
  BASE_POINTS_PER_KILL: 100,
  KILLS_TO_ADVANCE: 10, // enemies to kill per level
  SPAWN_INTERVAL_BASE: 1500, // milliseconds
  SPAWN_INTERVAL_MIN: 500
};

// Colors matching website theme
const COLORS = {
  NEON_CYAN: "#00ffff",
  NEON_MAGENTA: "#ff00ff",
  NEON_GREEN: "#39ff14",
  NEON_PINK: "#ff1493",
  NEON_YELLOW: "#ffff00",
  BG_DARK: "#0a0a0f"
};

// Game State
let game = {
  running: false,
  paused: false,
  level: 1,
  score: 0,
  lives: CONFIG.LIVES,
  kills: 0,
  levelKills: 0,
  lastLaserTime: 0,
  lastSpawnTime: 0,
  keys: {},
  player: null,
  lasers: [],
  enemies: [],
  particles: [],
  stars: [],
  leaderboard: []
};

// Canvas and Context
let canvas, ctx;

// Assets
let assets = {
  background: null,
  spaceship: null,
  alien: null,
  loaded: false
};

// DOM Elements
let elements = {};

// ========================================
// AUDIO ENGINE (Web Audio API) — Enhanced
// ========================================

const AudioManager = {
  ctx: null,
  muted: false,
  musicGain: null,
  sfxGain: null,
  masterGain: null,
  musicPlaying: false,
  musicNodes: [],
  musicIntervals: [],

  // Initialize AudioContext (must be called after user gesture)
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      // Music gain (lower volume for ambient background)
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.12;
      this.musicGain.connect(this.masterGain);

      // SFX gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.4;
      this.sfxGain.connect(this.masterGain);
    } catch (e) {
      console.warn("Web Audio API not supported:", e);
    }
  },

  // Resume context if suspended (browser autoplay policy)
  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 1.0;
    }
    return this.muted;
  },

  // --- Helper: create noise buffer ---
  _noiseBuffer(duration) {
    const len = this.ctx.sampleRate * duration;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  },

  // =========================================================
  // BACKGROUND MUSIC — Deep Space Ambient Soundscape
  // Evolving pads, cosmic drones, eerie harmonics, and shimmer
  // =========================================================
  startMusic() {
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;

    const now = this.ctx.currentTime;

    // --- Layer 1: Deep sub-bass drone (very low, pulsing) ---
    const subDrone = this.ctx.createOscillator();
    const subDrone2 = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    const subFilter = this.ctx.createBiquadFilter();
    subDrone.type = "sine";
    subDrone.frequency.value = 40; // Sub-bass
    subDrone2.type = "sine";
    subDrone2.frequency.value = 40.3; // Slightly detuned for throbbing
    subFilter.type = "lowpass";
    subFilter.frequency.value = 80;
    subGain.gain.value = 0.5;
    subDrone.connect(subFilter);
    subDrone2.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(this.musicGain);
    subDrone.start();
    subDrone2.start();
    this.musicNodes.push(subDrone, subDrone2, subFilter, subGain);

    // --- Layer 2: Dark atmospheric pad (slowly evolving) ---
    // Two detuned sawtooth oscillators through low-pass filter with LFO
    const pad1 = this.ctx.createOscillator();
    const pad2 = this.ctx.createOscillator();
    const padGain = this.ctx.createGain();
    const padFilter = this.ctx.createBiquadFilter();
    const padLFO = this.ctx.createOscillator();
    const padLFOGain = this.ctx.createGain();

    pad1.type = "sawtooth";
    pad1.frequency.value = 65.41; // C2
    pad2.type = "sawtooth";
    pad2.frequency.value = 65.7; // Slightly detuned for richness
    padFilter.type = "lowpass";
    padFilter.frequency.value = 300;
    padFilter.Q.value = 4;
    padGain.gain.value = 0.25;

    // LFO slowly modulates filter cutoff for sweeping movement
    padLFO.type = "sine";
    padLFO.frequency.value = 0.08; // Very slow sweep
    padLFOGain.gain.value = 250;
    padLFO.connect(padLFOGain);
    padLFOGain.connect(padFilter.frequency);

    pad1.connect(padFilter);
    pad2.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(this.musicGain);
    pad1.start();
    pad2.start();
    padLFO.start();
    this.musicNodes.push(pad1, pad2, padFilter, padGain, padLFO, padLFOGain);

    // --- Layer 3: Eerie high-frequency shimmer ---
    // Filtered noise with slow modulation for "cosmic wind"
    const shimmerNoise = this.ctx.createBufferSource();
    shimmerNoise.buffer = this._noiseBuffer(120); // Long noise buffer
    shimmerNoise.loop = true;
    const shimmerFilter = this.ctx.createBiquadFilter();
    const shimmerFilter2 = this.ctx.createBiquadFilter();
    const shimmerGain = this.ctx.createGain();
    const shimmerLFO = this.ctx.createOscillator();
    const shimmerLFOGain = this.ctx.createGain();

    shimmerFilter.type = "bandpass";
    shimmerFilter.frequency.value = 4000;
    shimmerFilter.Q.value = 3;
    shimmerFilter2.type = "highpass";
    shimmerFilter2.frequency.value = 2000;
    shimmerGain.gain.value = 0.06;

    shimmerLFO.type = "sine";
    shimmerLFO.frequency.value = 0.05;
    shimmerLFOGain.gain.value = 2000;
    shimmerLFO.connect(shimmerLFOGain);
    shimmerLFOGain.connect(shimmerFilter.frequency);

    shimmerNoise.connect(shimmerFilter);
    shimmerFilter.connect(shimmerFilter2);
    shimmerFilter2.connect(shimmerGain);
    shimmerGain.connect(this.musicGain);
    shimmerNoise.start();
    shimmerLFO.start();
    this.musicNodes.push(shimmerNoise, shimmerFilter, shimmerFilter2, shimmerGain, shimmerLFO, shimmerLFOGain);

    // --- Layer 4: Haunting melodic tones (slow minor-key sequence) ---
    // Plays ethereal notes on a slow cycle for a galaxy/space feel
    const spaceNotes = [
      130.81, 155.56, 174.61, 196.00, 233.08, 261.63, // C3, Eb3, F3, G3, Bb3, C4
      261.63, 233.08, 196.00, 174.61, 155.56, 130.81  // descending back
    ];
    let noteIdx = 0;

    const melodyInterval = setInterval(() => {
      if (!this.ctx || !this.musicPlaying) return;
      const t = this.ctx.currentTime;

      // Ethereal bell-like tone
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();
      const noteFilter = this.ctx.createBiquadFilter();

      const freq = spaceNotes[noteIdx % spaceNotes.length];
      osc1.type = "sine";
      osc1.frequency.value = freq;
      osc2.type = "triangle";
      osc2.frequency.value = freq * 2.005; // Octave + slight detune for shimmer

      noteFilter.type = "lowpass";
      noteFilter.frequency.setValueAtTime(2000, t);
      noteFilter.frequency.exponentialRampToValueAtTime(400, t + 3.5);
      noteFilter.Q.value = 1;

      noteGain.gain.setValueAtTime(0, t);
      noteGain.gain.linearRampToValueAtTime(0.25, t + 0.6); // Slow fade in
      noteGain.gain.setValueAtTime(0.25, t + 1.5);
      noteGain.gain.exponentialRampToValueAtTime(0.001, t + 4.0); // Long tail

      osc1.connect(noteFilter);
      osc2.connect(noteFilter);
      noteFilter.connect(noteGain);
      noteGain.connect(this.musicGain);
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 4.5);
      osc2.stop(t + 4.5);

      // Every 3rd note, add a fifth harmony for depth
      if (noteIdx % 3 === 0) {
        const harm = this.ctx.createOscillator();
        const harmGain = this.ctx.createGain();
        harm.type = "sine";
        harm.frequency.value = freq * 1.498; // Perfect fifth (slightly detuned)
        harmGain.gain.setValueAtTime(0, t);
        harmGain.gain.linearRampToValueAtTime(0.08, t + 0.8);
        harmGain.gain.exponentialRampToValueAtTime(0.001, t + 3.5);
        harm.connect(harmGain);
        harmGain.connect(this.musicGain);
        harm.start(t);
        harm.stop(t + 4.0);
      }

      noteIdx++;
    }, 3500); // Slow cycle — one note every 3.5 seconds

    this.musicIntervals.push(melodyInterval);

    // --- Layer 5: Cosmic pulse / heartbeat ---
    // A very slow deep pulse that feels like the heartbeat of space
    const pulseInterval = setInterval(() => {
      if (!this.ctx || !this.musicPlaying) return;
      const t = this.ctx.currentTime;

      const pulse = this.ctx.createOscillator();
      const pulseGain = this.ctx.createGain();
      const pulseFilter = this.ctx.createBiquadFilter();
      pulse.type = "sine";
      pulse.frequency.setValueAtTime(55, t);
      pulse.frequency.exponentialRampToValueAtTime(30, t + 1.5);
      pulseFilter.type = "lowpass";
      pulseFilter.frequency.value = 100;
      pulseGain.gain.setValueAtTime(0, t);
      pulseGain.gain.linearRampToValueAtTime(0.35, t + 0.15);
      pulseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      pulse.connect(pulseFilter);
      pulseFilter.connect(pulseGain);
      pulseGain.connect(this.musicGain);
      pulse.start(t);
      pulse.stop(t + 2.0);
    }, 6000); // Every 6 seconds

    this.musicIntervals.push(pulseInterval);
  },

  stopMusic() {
    this.musicPlaying = false;
    this.musicIntervals.forEach((id) => {
      clearInterval(id);
    });
    this.musicIntervals = [];
    this.musicNodes.forEach((node) => {
      try { node.stop && node.stop(); } catch (e) {}
      try { node.disconnect(); } catch (e) {}
    });
    this.musicNodes = [];
  },

  // =========================================================
  // SOUND EFFECTS
  // =========================================================

  // --- LASER: Star Wars blaster / lightsaber gun style ---
  // Sharp "pew" with resonant downward sweep + transient noise burst
  playLaser() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1) Main blaster tone — resonant downward pitch sweep
    const blaster = this.ctx.createOscillator();
    const blasterGain = this.ctx.createGain();
    const blasterFilter = this.ctx.createBiquadFilter();
    blaster.type = "sawtooth";
    blaster.frequency.setValueAtTime(1800, now);
    blaster.frequency.exponentialRampToValueAtTime(250, now + 0.15);
    blasterFilter.type = "bandpass";
    blasterFilter.frequency.setValueAtTime(2200, now);
    blasterFilter.frequency.exponentialRampToValueAtTime(400, now + 0.15);
    blasterFilter.Q.value = 8; // High resonance for that iconic "ring"
    blasterGain.gain.setValueAtTime(0.3, now);
    blasterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    blaster.connect(blasterFilter);
    blasterFilter.connect(blasterGain);
    blasterGain.connect(this.sfxGain);
    blaster.start(now);
    blaster.stop(now + 0.2);

    // 2) Sub-harmonic thump for body
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(400, now);
    sub.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    subGain.gain.setValueAtTime(0.2, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.1);

    // 3) Transient "snap" — short noise burst for the attack click
    const snapBuf = this._noiseBuffer(0.03);
    const snap = this.ctx.createBufferSource();
    snap.buffer = snapBuf;
    const snapGain = this.ctx.createGain();
    const snapFilter = this.ctx.createBiquadFilter();
    snapFilter.type = "highpass";
    snapFilter.frequency.value = 3000;
    snapGain.gain.setValueAtTime(0.25, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
    snap.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(this.sfxGain);
    snap.start(now);
    snap.stop(now + 0.03);

    // 4) Slight "pew" ring-out (sine with fast decay)
    const ring = this.ctx.createOscillator();
    const ringGain = this.ctx.createGain();
    ring.type = "sine";
    ring.frequency.setValueAtTime(1200, now);
    ring.frequency.exponentialRampToValueAtTime(600, now + 0.12);
    ringGain.gain.setValueAtTime(0.08, now + 0.02);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    ring.connect(ringGain);
    ringGain.connect(this.sfxGain);
    ring.start(now);
    ring.stop(now + 0.16);
  },

  // --- ALIEN DEATH: Cinematic multi-layered destruction ---
  // Alien screech + impact explosion + debris scatter + tailing rumble
  playAlienCrumble() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const duration = 0.9;

    // 1) Alien "screech" — FM-synthesized shriek for organic feel
    const screechCarrier = this.ctx.createOscillator();
    const screechMod = this.ctx.createOscillator();
    const screechModGain = this.ctx.createGain();
    const screechGain = this.ctx.createGain();
    const screechFilter = this.ctx.createBiquadFilter();

    screechCarrier.type = "sine";
    screechCarrier.frequency.setValueAtTime(1400, now);
    screechCarrier.frequency.exponentialRampToValueAtTime(200, now + 0.4);

    screechMod.type = "sine";
    screechMod.frequency.setValueAtTime(350, now);
    screechMod.frequency.exponentialRampToValueAtTime(30, now + 0.35);
    screechModGain.gain.setValueAtTime(600, now);
    screechModGain.gain.exponentialRampToValueAtTime(20, now + 0.35);
    screechMod.connect(screechModGain);
    screechModGain.connect(screechCarrier.frequency);

    screechFilter.type = "bandpass";
    screechFilter.frequency.setValueAtTime(2000, now);
    screechFilter.frequency.exponentialRampToValueAtTime(300, now + 0.4);
    screechFilter.Q.value = 3;

    screechGain.gain.setValueAtTime(0.28, now);
    screechGain.gain.linearRampToValueAtTime(0.15, now + 0.15);
    screechGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    screechCarrier.connect(screechFilter);
    screechFilter.connect(screechGain);
    screechGain.connect(this.sfxGain);
    screechMod.start(now);
    screechCarrier.start(now);
    screechMod.stop(now + 0.5);
    screechCarrier.stop(now + 0.5);

    // 2) Impact explosion — heavy thud with downward sweep
    const impact = this.ctx.createOscillator();
    const impactGain = this.ctx.createGain();
    impact.type = "sine";
    impact.frequency.setValueAtTime(250, now);
    impact.frequency.exponentialRampToValueAtTime(35, now + 0.35);
    impactGain.gain.setValueAtTime(0.4, now);
    impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    impact.connect(impactGain);
    impactGain.connect(this.sfxGain);
    impact.start(now);
    impact.stop(now + 0.45);

    // 3) Debris scatter — band-pass filtered crackling noise
    const debrisBufSize = this.ctx.sampleRate * duration;
    const debrisBuf = this.ctx.createBuffer(1, debrisBufSize, this.ctx.sampleRate);
    const debrisData = debrisBuf.getChannelData(0);
    // Generate crackly noise with random pops (debris chunks)
    for (let i = 0; i < debrisBufSize; i++) {
      debrisData[i] = (Math.random() * 2 - 1) * 0.4;
      // Occasional sharp pops — chunks flying apart
      if (Math.random() < 0.02) {
        debrisData[i] = (Math.random() > 0.5 ? 1 : -1) * 0.9;
      }
      // Add some granularity — short silence gaps for "chunks"
      if (Math.random() < 0.1) {
        const gap = Math.min(10, debrisBufSize - i);
        for (let g = 0; g < gap; g++) {
          if (i + g < debrisBufSize) debrisData[i + g] *= 0.1;
        }
      }
    }
    const debris = this.ctx.createBufferSource();
    debris.buffer = debrisBuf;
    const debrisFilter = this.ctx.createBiquadFilter();
    debrisFilter.type = "bandpass";
    debrisFilter.frequency.setValueAtTime(4000, now);
    debrisFilter.frequency.exponentialRampToValueAtTime(200, now + duration);
    debrisFilter.Q.value = 1.5;
    const debrisGain = this.ctx.createGain();
    debrisGain.gain.setValueAtTime(0.3, now + 0.03); // Slight delay after impact
    debrisGain.gain.linearRampToValueAtTime(0.15, now + duration * 0.4);
    debrisGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    debris.connect(debrisFilter);
    debrisFilter.connect(debrisGain);
    debrisGain.connect(this.sfxGain);
    debris.start(now + 0.02);
    debris.stop(now + duration);

    // 4) Low rumble tail — sub-bass vibration fading out
    const rumble = this.ctx.createOscillator();
    const rumble2 = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    const rumbleFilter = this.ctx.createBiquadFilter();
    rumble.type = "sine";
    rumble.frequency.setValueAtTime(100, now);
    rumble.frequency.exponentialRampToValueAtTime(25, now + duration * 0.8);
    rumble2.type = "triangle";
    rumble2.frequency.setValueAtTime(80, now);
    rumble2.frequency.exponentialRampToValueAtTime(20, now + duration * 0.8);
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.value = 150;
    rumbleGain.gain.setValueAtTime(0.2, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.9);
    rumble.connect(rumbleFilter);
    rumble2.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.sfxGain);
    rumble.start(now);
    rumble2.start(now);
    rumble.stop(now + duration);
    rumble2.stop(now + duration);

    // 5) High-freq "sizzle" — disintegration energy release
    const sizzle = this.ctx.createBufferSource();
    sizzle.buffer = this._noiseBuffer(0.3);
    const sizzleFilter = this.ctx.createBiquadFilter();
    sizzleFilter.type = "highpass";
    sizzleFilter.frequency.setValueAtTime(6000, now);
    sizzleFilter.frequency.exponentialRampToValueAtTime(3000, now + 0.25);
    const sizzleGain = this.ctx.createGain();
    sizzleGain.gain.setValueAtTime(0.12, now);
    sizzleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    sizzle.connect(sizzleFilter);
    sizzleFilter.connect(sizzleGain);
    sizzleGain.connect(this.sfxGain);
    sizzle.start(now);
    sizzle.stop(now + 0.3);
  },

  // Player hit — short impactful thud
  playPlayerHit() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.35);

    // Impact noise burst
    const bufSize = this.ctx.sampleRate * 0.15;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1);
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buf;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.3, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    noiseNode.connect(nGain);
    nGain.connect(this.sfxGain);
    noiseNode.start(now);
    noiseNode.stop(now + 0.15);
  },

  // Level up — rising sparkle arpeggio
  playLevelUp() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  },

  // Game over — descending sad tones
  playGameOver() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [440, 392, 349.23, 261.63]; // A4, G4, F4, C4

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const t = now + i * 0.35;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  },

  // Win game — triumphant fanfare
  playWin() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1046.50, 1318.51, 1567.98];

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      const t = now + i * 0.15;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }
};

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  initCanvas();
  initElements();
  initEventListeners();
  loadAssets();
  initStars();
  initLeaderboard();
  initAudioToggle();
  gameLoop();
});

function initAudioToggle() {
  const btn = document.getElementById("audio-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    AudioManager.init();
    AudioManager.resume();
    const muted = AudioManager.toggleMute();
    btn.textContent = muted ? "🔇" : "🔊";
    btn.title = muted ? "Unmute" : "Mute";
  });
}

function initCanvas() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  // Responsive canvas size
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}

function resizeCanvas() {
  const container = document.getElementById("game-container");
  const maxWidth = Math.min(window.innerWidth - 40, CONFIG.CANVAS_WIDTH);
  const maxHeight = Math.min(window.innerHeight - 40, CONFIG.CANVAS_HEIGHT);

  const ratio = CONFIG.CANVAS_WIDTH / CONFIG.CANVAS_HEIGHT;
  let width = maxWidth;
  let height = width / ratio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  canvas.width = CONFIG.CANVAS_WIDTH;
  canvas.height = CONFIG.CANVAS_HEIGHT;
}

function initElements() {
  elements = {
    startScreen: document.getElementById("start-screen"),
    gameOverScreen: document.getElementById("game-over-screen"),
    levelUpScreen: document.getElementById("level-up-screen"),
    winScreen: document.getElementById("win-screen"),
    pauseIndicator: document.getElementById("pause-indicator"),
    scoreDisplay: document.getElementById("score"),
    levelDisplay: document.getElementById("level"),
    killsDisplay: document.getElementById("kills"),
    finalScore: document.getElementById("final-score"),
    finalLevel: document.getElementById("final-level"),
    winScore: document.getElementById("win-score"),
    newLevel: document.getElementById("new-level"),
    lives: [
      document.getElementById("life1"),
      document.getElementById("life2"),
      document.getElementById("life3"),
      document.getElementById("life4"),
      document.getElementById("life5")
    ],
    mobileControls: document.getElementById("mobile-controls"),
    // Leaderboard elements
    highScoreList: document.getElementById("high-score-list"),
    highScoreListGameover: document.getElementById("high-score-list-gameover"),
    newHighScoreEntry: document.getElementById("new-high-score-entry"),
    initialsInput: document.getElementById("initials-input"),
    saveScoreBtn: document.getElementById("save-score-btn"),
    leaderboardGameover: document.getElementById("leaderboard-gameover")
  };
}

function initEventListeners() {
  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    game.keys[e.key.toLowerCase()] = true;
    game.keys[e.code] = true;

    // Pause toggle
    if (e.key.toLowerCase() === "p" || e.key === "Escape") {
      togglePause();
    }

    // Prevent default for game keys
    if (
      ["ArrowLeft", "ArrowRight", "Space", " "].includes(e.key) ||
      ["a", "d", " "].includes(e.key.toLowerCase())
    ) {
      e.preventDefault();
    }
  });

  document.addEventListener("keyup", (e) => {
    game.keys[e.key.toLowerCase()] = false;
    game.keys[e.code] = false;
  });

  // Button handlers
  document.getElementById("start-btn").addEventListener("click", startGame);
  document.getElementById("retry-btn").addEventListener("click", startGame);
  document
    .getElementById("play-again-btn")
    .addEventListener("click", startGame);

  document.getElementById("back-btn").addEventListener("click", goBack);
  document.getElementById("back-btn-gameover").addEventListener("click", goBack);
  document.getElementById("back-btn-win").addEventListener("click", goBack);

  // Mobile controls
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const fireBtn = document.getElementById("fire-btn");

  // Touch events for mobile
  leftBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.keys["arrowleft"] = true;
  });
  leftBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    game.keys["arrowleft"] = false;
  });

  rightBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.keys["arrowright"] = true;
  });
  rightBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    game.keys["arrowright"] = false;
  });

  fireBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.keys[" "] = true;
  });
  fireBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    game.keys[" "] = false;
  });

  // Leaderboard input
  elements.saveScoreBtn.addEventListener("click", saveHighScore);
}

function loadAssets() {
  let loaded = 0;
  const total = 3;

  const checkLoaded = () => {
    loaded++;
    if (loaded >= total) {
      assets.loaded = true;
    }
  };

  // Load background
  assets.background = new Image();
  assets.background.onload = checkLoaded;
  assets.background.onerror = () => {
    console.log("Background not loaded, using procedural");
    checkLoaded();
  };
  assets.background.src = "assets/background.png";

  // Load spaceship
  assets.spaceship = new Image();
  assets.spaceship.onload = checkLoaded;
  assets.spaceship.onerror = () => {
    console.log("Spaceship not loaded, using procedural");
    checkLoaded();
  };
  assets.spaceship.src = "assets/spaceship.png";

  // Load alien
  assets.alien = new Image();
  assets.alien.onload = checkLoaded;
  assets.alien.onerror = () => {
    console.log("Alien not loaded, using procedural");
    checkLoaded();
  };
  assets.alien.src = "assets/alien.png";
}

function initStars() {
  game.stars = [];
  for (let i = 0; i < 100; i++) {
    game.stars.push({
      x: Math.random() * CONFIG.CANVAS_WIDTH,
      y: Math.random() * CONFIG.CANVAS_HEIGHT,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 1 + 0.5,
      brightness: Math.random()
    });
  }
}

// ========================================
// GAME CONTROL
// ========================================

function startGame() {
  game = {
    ...game,
    running: true,
    paused: false,
    level: 1,
    score: 0,
    lives: CONFIG.LIVES,
    kills: 0,
    levelKills: 0,
    lastLaserTime: 0,
    lastSpawnTime: 0,
    lasers: [],
    enemies: [],
    particles: []
  };

  // Initialize player
  game.player = {
    x: CONFIG.CANVAS_WIDTH / 2,
    y: CONFIG.CANVAS_HEIGHT - 80,
    width: 40,
    height: 50,
    invincible: false,
    invincibleTimer: 0
  };

  // Start audio & music
  AudioManager.init();
  AudioManager.resume();
  AudioManager.stopMusic();
  AudioManager.startMusic();

  // Update UI
  updateHUD();
  updateLives();

  // Hide screens
  elements.startScreen.classList.add("hidden");
  elements.gameOverScreen.classList.add("hidden");
  elements.winScreen.classList.add("hidden");
  elements.levelUpScreen.classList.add("hidden");
  elements.pauseIndicator.classList.add("hidden");
}

function togglePause() {
  if (!game.running) return;

  game.paused = !game.paused;

  if (game.paused) {
    elements.pauseIndicator.classList.remove("hidden");
  } else {
    elements.pauseIndicator.classList.add("hidden");
  }
}

function goBack() {
  window.location.href = "../../index.html";
}

function gameOver() {
  game.running = false;
  AudioManager.stopMusic();
  AudioManager.playGameOver();
  elements.finalScore.textContent = game.score.toLocaleString();
  elements.finalLevel.textContent = game.level;
  elements.finalLevel.textContent = game.level;
  elements.gameOverScreen.classList.remove("hidden");
  
  checkHighScores();
}

function winGame() {
  game.running = false;
  AudioManager.stopMusic();
  AudioManager.playWin();
  elements.winScore.textContent = game.score.toLocaleString();
  elements.winScreen.classList.remove("hidden");
}

function levelUp() {
  game.level++;
  game.levelKills = 0;

  if (game.level > CONFIG.MAX_LEVELS) {
    winGame();
    return;
  }

  AudioManager.playLevelUp();

  // Show level up screen
  elements.newLevel.textContent = game.level;
  elements.levelUpScreen.classList.remove("hidden");

  // Clear enemies
  game.enemies = [];

  // Hide after animation
  setTimeout(() => {
    elements.levelUpScreen.classList.add("hidden");
  }, 2000);

  updateHUD();
}

// ========================================
// GAME LOOP
// ========================================

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

function update() {
  const now = Date.now();

  // Always update stars for background effect
  updateStars();

  if (!game.running || game.paused) return;

  // Update player
  updatePlayer();

  // Handle shooting
  if (
    (game.keys[" "] || game.keys["Space"]) &&
    now - game.lastLaserTime > CONFIG.LASER_COOLDOWN
  ) {
    shootLaser();
    game.lastLaserTime = now;
  }

  // Spawn enemies
  const spawnInterval = Math.max(
    CONFIG.SPAWN_INTERVAL_MIN,
    CONFIG.SPAWN_INTERVAL_BASE - game.level * 100
  );

  if (now - game.lastSpawnTime > spawnInterval) {
    spawnEnemy();
    game.lastSpawnTime = now;
  }

  // Update game objects
  updateLasers();
  updateEnemies();
  updateParticles();

  // Check collisions
  checkCollisions();

  // Update invincibility
  if (game.player.invincible) {
    game.player.invincibleTimer--;
    if (game.player.invincibleTimer <= 0) {
      game.player.invincible = false;
    }
  }
}

function updateStars() {
  game.stars.forEach((star) => {
    star.y += star.speed;
    if (star.y > CONFIG.CANVAS_HEIGHT) {
      star.y = 0;
      star.x = Math.random() * CONFIG.CANVAS_WIDTH;
    }
    star.brightness = 0.5 + Math.sin(Date.now() / 500 + star.x) * 0.3;
  });
}

function updatePlayer() {
  const moveLeft =
    game.keys["arrowleft"] || game.keys["ArrowLeft"] || game.keys["a"];
  const moveRight =
    game.keys["arrowright"] || game.keys["ArrowRight"] || game.keys["d"];

  if (moveLeft) {
    game.player.x -= CONFIG.PLAYER_SPEED;
  }
  if (moveRight) {
    game.player.x += CONFIG.PLAYER_SPEED;
  }

  // Keep player in bounds
  game.player.x = Math.max(
    game.player.width / 2,
    Math.min(CONFIG.CANVAS_WIDTH - game.player.width / 2, game.player.x)
  );
}

function shootLaser() {
  // Shoot two lasers from each side of the ship
  const laserOffset = 15;

  game.lasers.push({
    x: game.player.x - laserOffset,
    y: game.player.y - game.player.height / 2,
    width: 4,
    height: 20,
    speed: CONFIG.LASER_SPEED
  });

  game.lasers.push({
    x: game.player.x + laserOffset,
    y: game.player.y - game.player.height / 2,
    width: 4,
    height: 20,
    speed: CONFIG.LASER_SPEED
  });

  AudioManager.playLaser();
}

function updateLasers() {
  game.lasers = game.lasers.filter((laser) => {
    laser.y -= laser.speed;
    return laser.y > -laser.height;
  });
}

function spawnEnemy() {
  const size = 60 + Math.random() * 30;
  const x = size / 2 + Math.random() * (CONFIG.CANVAS_WIDTH - size);
  const speed =
    CONFIG.BASE_ENEMY_SPEED + (Math.min(game.level, 5) - 1) * CONFIG.ENEMY_SPEED_INCREMENT;

  game.enemies.push({
    x: x,
    y: -size,
    width: size,
    height: size,
    speed: speed + (Math.random() - 0.5) * 0.5,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.05
  });
}

function updateEnemies() {
  game.enemies = game.enemies.filter((enemy) => {
    enemy.y += enemy.speed;
    enemy.rotation += enemy.rotationSpeed;

    // Enemy reached bottom
    if (enemy.y > CONFIG.CANVAS_HEIGHT + enemy.height) {
      return false;
    }

    return true;
  });
}

function updateParticles() {
  game.particles = game.particles.filter((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= particle.decay;
    particle.size *= 0.95;
    return particle.life > 0 && particle.size > 0.5;
  });
}

function checkCollisions() {
  // Laser vs Enemy collisions
  game.lasers.forEach((laser, laserIndex) => {
    game.enemies.forEach((enemy, enemyIndex) => {
      if (
        laser.x > enemy.x - enemy.width / 2 &&
        laser.x < enemy.x + enemy.width / 2 &&
        laser.y > enemy.y - enemy.height / 2 &&
        laser.y < enemy.y + enemy.height / 2
      ) {
        // Remove laser and enemy
        game.lasers.splice(laserIndex, 1);
        game.enemies.splice(enemyIndex, 1);

        // Create explosion particles
        createExplosion(enemy.x, enemy.y);

        // Play alien crumble/disintegration sound
        AudioManager.playAlienCrumble();

        // Update score and kills
        const points = CONFIG.BASE_POINTS_PER_KILL * game.level;
        game.score += points;
        game.kills++;
        game.levelKills++;

        updateHUD();

        // Check level up
        const killsNeeded = game.level * 5;
        if (game.levelKills >= killsNeeded) {
          levelUp();
        }
      }
    });
  });

  // Enemy vs Player collisions
  if (!game.player.invincible) {
    game.enemies.forEach((enemy, index) => {
      const dx = game.player.x - enemy.x;
      const dy = game.player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const collisionDist =
        (game.player.width + enemy.width) / 2 - 10;

      if (distance < collisionDist) {
        // Remove enemy
        game.enemies.splice(index, 1);

        // Lose a life
        game.lives--;
        updateLives();

        // Create small explosion and play hit sound
        createExplosion(game.player.x, game.player.y, true);
        AudioManager.playPlayerHit();

        if (game.lives <= 0) {
          gameOver();
        } else {
          // Brief invincibility
          game.player.invincible = true;
          game.player.invincibleTimer = 120; // 2 seconds at 60fps
        }
      }
    });
  }
}

function createExplosion(x, y, small = false) {
  const particleCount = small ? 15 : 30;
  const baseSpeed = small ? 2 : 4;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
    const speed = baseSpeed + Math.random() * 2;

    game.particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 4,
      life: 1,
      decay: 0.02 + Math.random() * 0.02,
      color:
        Math.random() > 0.5
          ? COLORS.NEON_CYAN
          : Math.random() > 0.5
          ? COLORS.NEON_MAGENTA
          : COLORS.NEON_GREEN
    });
  }
}

// ========================================
// RENDERING
// ========================================

function render() {
  // Clear canvas
  ctx.fillStyle = COLORS.BG_DARK;
  ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

  // Draw background
  drawBackground();

  // Draw stars
  drawStars();

  if (!game.running && !game.paused) {
    // Just draw background for menu
    return;
  }

  // Draw game objects
  drawLasers();
  drawEnemies();
  drawPlayer();
  drawParticles();
}

function drawBackground() {
  if (assets.background && assets.background.complete) {
    // Tile the background
    const pattern = ctx.createPattern(assets.background, "repeat");
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Add dark overlay
    ctx.fillStyle = "rgba(10, 10, 15, 0.6)";
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
  }
}

function drawStars() {
  game.stars.forEach((star) => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
    ctx.fill();

    // Random colored stars
    if (Math.random() > 0.95) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 255, ${star.brightness * 0.3})`;
      ctx.fill();
    }
  });
}

function drawPlayer() {
  if (!game.player) return;

  ctx.save();
  ctx.translate(game.player.x, game.player.y);
  ctx.globalCompositeOperation = "screen";

  // Invincibility flash
  if (game.player.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  if (assets.spaceship && assets.spaceship.complete) {
    // Draw spaceship image
    ctx.drawImage(
      assets.spaceship,
      -game.player.width / 2 - 10,
      -game.player.height / 2 - 10,
      game.player.width + 20,
      game.player.height + 20
    );
  } else {
    // Draw procedural spaceship
    drawProceduralSpaceship();
  }

  // Draw engine glow
  drawEngineGlow();

  ctx.restore();
}

function drawProceduralSpaceship() {
  // Main body - blocky shuttle shape
  ctx.fillStyle = COLORS.NEON_CYAN;
  ctx.shadowColor = COLORS.NEON_CYAN;
  ctx.shadowBlur = 15;

  // Body
  ctx.beginPath();
  ctx.moveTo(0, -25); // Top point
  ctx.lineTo(10, -10); // Right upper
  ctx.lineTo(10, 20); // Right lower
  ctx.lineTo(-10, 20); // Left lower
  ctx.lineTo(-10, -10); // Left upper
  ctx.closePath();
  ctx.fill();

  // Wings
  ctx.fillStyle = COLORS.NEON_MAGENTA;
  ctx.shadowColor = COLORS.NEON_MAGENTA;

  // Left wing
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-25, 20);
  ctx.lineTo(-15, 20);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();

  // Right wing
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(25, 20);
  ctx.lineTo(15, 20);
  ctx.lineTo(10, 10);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "#fff";
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.arc(0, -10, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

function drawEngineGlow() {
  ctx.shadowBlur = 0;

  // Engine flames
  const flameOffset = Math.sin(Date.now() / 50) * 3;

  ctx.fillStyle = COLORS.NEON_GREEN;
  ctx.shadowColor = COLORS.NEON_GREEN;
  ctx.shadowBlur = 10;

  // Left engine
  ctx.beginPath();
  ctx.moveTo(-8, 20);
  ctx.lineTo(-5, 30 + flameOffset);
  ctx.lineTo(-2, 20);
  ctx.fill();

  // Right engine
  ctx.beginPath();
  ctx.moveTo(2, 20);
  ctx.lineTo(5, 30 + flameOffset);
  ctx.lineTo(8, 20);
  ctx.fill();

  ctx.shadowBlur = 0;
}

function drawLasers() {
  game.lasers.forEach((laser) => {
    ctx.fillStyle = COLORS.NEON_GREEN;
    ctx.shadowColor = COLORS.NEON_GREEN;
    ctx.shadowBlur = 15;

    ctx.fillRect(
      laser.x - laser.width / 2,
      laser.y - laser.height / 2,
      laser.width,
      laser.height
    );

    // Glow trail
    ctx.fillStyle = "rgba(57, 255, 20, 0.3)";
    ctx.fillRect(
      laser.x - laser.width / 2 - 2,
      laser.y,
      laser.width + 4,
      laser.height
    );
  });

  ctx.shadowBlur = 0;
}

function drawEnemies() {
  game.enemies.forEach((enemy) => {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.rotation);
    ctx.globalCompositeOperation = "screen";

    if (assets.alien && assets.alien.complete) {
      // Draw only a portion of the sprite sheet (first alien)
        ctx.drawImage(
          assets.alien,
          -enemy.width / 2,
          -enemy.height / 2,
          enemy.width,
          enemy.height
        );
    } else {
      // Draw procedural alien
      drawProceduralAlien(enemy);
    }

    ctx.restore();
  });
}

function drawProceduralAlien(enemy) {
  const size = enemy.width;
  const halfSize = size / 2;
  const time = Date.now() / 200;

  // Main Body (Dome shape)
  ctx.fillStyle = COLORS.NEON_MAGENTA;
  ctx.shadowColor = COLORS.NEON_MAGENTA;
  ctx.shadowBlur = 15;

  ctx.beginPath();
  // Dome top
  ctx.arc(0, -size * 0.1, size * 0.4, Math.PI, 0); 
  // Base
  ctx.lineTo(size * 0.4, size * 0.2);
  ctx.lineTo(-size * 0.4, size * 0.2);
  ctx.closePath();
  ctx.fill();

  // Glowing Core/Brain
  ctx.fillStyle = "#ff55ff";
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.arc(0, -size * 0.1, size * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (Menacing)
  ctx.fillStyle = COLORS.NEON_CYAN;
  ctx.shadowColor = COLORS.NEON_CYAN;
  ctx.shadowBlur = 10;

  // Left Eye
  ctx.beginPath();
  ctx.ellipse(-size * 0.2, 0, size * 0.12, size * 0.08, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Right Eye
  ctx.beginPath();
  ctx.ellipse(size * 0.2, 0, size * 0.12, size * 0.08, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Tentacles/Legs
  ctx.strokeStyle = COLORS.NEON_MAGENTA;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 5;
  ctx.lineCap = "round";

  const legCount = 4;
  for (let i = 0; i < legCount; i++) {
    const xOffset = (i - 1.5) * (size * 0.25);
    const wave = Math.sin(time + i) * 5;
    
    ctx.beginPath();
    ctx.moveTo(xOffset, size * 0.2);
    ctx.quadraticCurveTo(
      xOffset + wave, 
      size * 0.5, 
      xOffset * 1.5, 
      size * 0.7 + Math.abs(wave)
    );
    ctx.stroke();
  }

  // Engine/Thruster glow at bottom
  ctx.fillStyle = COLORS.NEON_GREEN;
  ctx.shadowColor = COLORS.NEON_GREEN;
  ctx.shadowBlur = 8;
  const thrusterFlicker = Math.random() * 0.4 + 0.8;
  
  ctx.beginPath();
  ctx.ellipse(0, size * 0.25, size * 0.3 * thrusterFlicker, size * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

function drawParticles() {
  game.particles.forEach((particle) => {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = particle.life;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 5;

    ctx.beginPath();
    ctx.rect(
      particle.x - particle.size / 2,
      particle.y - particle.size / 2,
      particle.size,
      particle.size
    );
    ctx.fill();
  });

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

// ========================================
// LEADERBOARD
// ========================================

function initLeaderboard() {
  const storedScores = localStorage.getItem("neonShooter_highScores");
  
  if (storedScores) {
    game.leaderboard = JSON.parse(storedScores);
  } else {
    // Initialize with 0s as requested
    game.leaderboard = Array(5).fill().map(() => ({ name: "---", score: 0 }));
    localStorage.setItem("neonShooter_highScores", JSON.stringify(game.leaderboard));
  }
  
  updateLeaderboardUI();
}

function updateLeaderboardUI() {
  const createListItems = (listElement) => {
    listElement.innerHTML = "";
    game.leaderboard.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "score-entry";
      li.innerHTML = `
        <span class="name">${entry.name}</span>
        <span class="score">${entry.score.toLocaleString()}</span>
      `;
      listElement.appendChild(li);
    });
  };

  if (elements.highScoreList) createListItems(elements.highScoreList);
  if (elements.highScoreListGameover) createListItems(elements.highScoreListGameover);
}

function checkHighScores() {
  // Check if current score is higher than the lowest score on the leaderboard
  const lowestScore = game.leaderboard[game.leaderboard.length - 1].score;
  
  // Hide normal leaderboard on game over initially
  elements.leaderboardGameover.classList.add("hidden");
  elements.newHighScoreEntry.classList.add("hidden");

  if (game.score > lowestScore) {
    // New High Score!
    elements.newHighScoreEntry.classList.remove("hidden");
    elements.initialsInput.value = "";
    setTimeout(() => elements.initialsInput.focus(), 100);
  } else {
    // Just show the leaderboard
    elements.leaderboardGameover.classList.remove("hidden");
  }
}

function saveHighScore() {
  const name = elements.initialsInput.value.toUpperCase() || "UNK";
  const newEntry = { name: name, score: game.score };
  
  // Add new score
  game.leaderboard.push(newEntry);
  
  // Sort descending
  game.leaderboard.sort((a, b) => b.score - a.score);
  
  // Keep top 5
  game.leaderboard = game.leaderboard.slice(0, 5);
  
  // Save to local storage
  localStorage.setItem("neonShooter_highScores", JSON.stringify(game.leaderboard));
  
  // Update UI
  updateLeaderboardUI();
  
  // Hide input, show leaderboard
  elements.newHighScoreEntry.classList.add("hidden");
  elements.leaderboardGameover.classList.remove("hidden");
}

// ========================================
// HUD
// ========================================

function updateHUD() {
  elements.scoreDisplay.textContent = game.score.toLocaleString();
  elements.levelDisplay.textContent = game.level;
  const killsNeeded = game.level * 5;
  elements.killsDisplay.textContent = `${game.levelKills}/${killsNeeded}`;
}

function updateLives() {
  elements.lives.forEach((life, index) => {
    if (index < game.lives) {
      life.classList.remove("lost");
    } else {
      life.classList.add("lost");
    }
  });
}

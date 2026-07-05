const STORAGE_KEY = 'browsertrail-sound';

let audioContext = null;
let enabled = false;
let lastWhoosh = 0;

function getContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function loadSoundPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

export function saveSoundPreference(on) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
  enabled = on && !prefersReducedMotion();
}

export function setSoundEnabled(on) {
  saveSoundPreference(on);
}

export function isSoundEnabled() {
  return enabled && !prefersReducedMotion();
}

export function initSoundManager() {
  enabled = loadSoundPreference() && !prefersReducedMotion();
}

function playTone({ frequency, duration, type = 'sine', gain = 0.08 }) {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    /* audio unavailable */
  }
}

function playNoiseSweep(duration = 0.08) {
  if (!isSoundEnabled()) return;
  const now = Date.now();
  if (now - lastWhoosh < 100) return;
  lastWhoosh = now;

  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    gain.gain.value = 0.06;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    /* ignore */
  }
}

export function playPacketWhoosh() {
  playNoiseSweep(0.08);
}

export function playHandshakeClick() {
  playTone({ frequency: 880, duration: 0.06, type: 'square', gain: 0.04 });
}

export function playTunnelLock() {
  playTone({ frequency: 440, duration: 0.2, type: 'sine', gain: 0.06 });
  setTimeout(() => playTone({ frequency: 660, duration: 0.15, type: 'sine', gain: 0.05 }), 80);
}

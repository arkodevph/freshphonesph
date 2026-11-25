// Each icon's sound, made on the spot from its choreography: the materials it
// strikes and when (motion.sound), placed between the two speakers along the
// path its moving mass travels. The same synthesis as the Jiggicons library.
import { normalizeCue, soundRate } from './engine/library-foley.mjs';
import { renderStrikes } from './engine/library-sfx.mjs';
import { soundPath, spatialCurve } from './engine/sound-space.mjs';
import { stereoize, widthOf } from './engine/stereo-stage.mjs';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const releaseSeconds = .022;
const materialOf = variant => variant === 'glass' ? 'solid' : variant === 'duotone' ? 'outline' : variant;

// The seed the library uses for an icon, so it sounds the same everywhere.
export function seedOf(id) {
  let hash = 2166136261;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

// Mono samples for an icon's cue, levelled like every library cue.
export function renderCue(icon) {
  return normalizeCue(renderStrikes(icon.motion.sound, seedOf(icon.id), soundRate));
}

// The cue in stereo for one variant: { left, right } Float32Arrays.
export function renderStereo(icon, variant = 'outline') {
  const material = materialOf(variant);
  const mass = icon.svg?.[variant]?.mass;
  const curve = spatialCurve(soundPath(icon.motion, material, mass));
  return stereoize(renderCue(icon), curve, widthOf(icon.motion.sound), soundRate, icon.motion.sound);
}

let engine = null;
let master = 1;
let current = null;
let lastTap = -Infinity;
const cues = new Map();

function context() {
  if (engine !== null) return engine;
  engine = undefined;
  const Context = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Context) return engine;
  try {
    const audio = new Context({ latencyHint: 'interactive' });
    // One gentle limiter, so overlapping cues never clip.
    let output = audio.destination;
    if (audio.createDynamicsCompressor) {
      output = audio.createDynamicsCompressor();
      output.threshold.value = -14;
      output.knee.value = 8;
      output.ratio.value = 4;
      output.attack.value = .002;
      output.release.value = .16;
      output.connect(audio.destination);
    }
    engine = { audio, output };
  } catch {
    engine = undefined;
  }
  return engine;
}

// Quick repeated taps play softer, so a burst of clicks never shouts.
function gainForInterval(seconds) {
  const t = clamp((seconds - .075) / .48, 0, 1);
  return .42 + .58 * t * t * (3 - 2 * t);
}

function stereoFor(icon, variant) {
  const key = icon.id + '/' + variant;
  let stereo = cues.get(key);
  if (stereo) cues.delete(key);
  else {
    stereo = renderStereo(icon, variant);
    if (cues.size >= 64) cues.delete(cues.keys().next().value);
  }
  cues.set(key, stereo);
  return stereo;
}

// Sets the volume for every icon sound, 0 to 1.
export function setVolume(value) {
  master = clamp(Number(value) || 0, 0, 1);
}

// Fades out the sound that is playing.
export function stopSound() {
  const voice = current;
  current = null;
  voice?.release();
}

// Plays an icon's sound. It starts only once the visitor has interacted with
// the page (a browser rule); before that it is silent. With `overlap` it
// plays beside a sound still ringing instead of cutting it off.
export function playSound(icon, { variant = 'outline', volume = 1, overlap = false } = {}) {
  if (!icon?.motion?.sound?.length || master <= 0 || volume <= 0) return Promise.resolve();
  const live = context();
  if (!live) return Promise.resolve();
  const { audio } = live;
  // A context the page may not start yet (no click or key press so far)
  // starts nothing: a sound that waited would play late, out of the blue.
  const asked = performance.now();
  const ready = audio.state === 'running' ? Promise.resolve() : audio.resume();
  return ready.then(() => {
    if (audio.state !== 'running' || performance.now() - asked > 250) return;
    if (!overlap) stopSound();
    start(icon, variant, volume, live);
  }).catch(() => {});
}

function start(icon, variant, volume, { audio, output }) {
  const now = audio.currentTime;
  const level = gainForInterval(now - lastTap) * master * clamp(volume, 0, 1);
  lastTap = now;
  const stereo = stereoFor(icon, variant);
  const buffer = audio.createBuffer(2, stereo.left.length, soundRate);
  buffer.copyToChannel(stereo.left, 0);
  buffer.copyToChannel(stereo.right, 1);
  const source = audio.createBufferSource();
  const envelope = audio.createGain();
  envelope.gain.value = level;
  source.buffer = buffer;
  source.connect(envelope);
  envelope.connect(output);
  const voice = {
    release() {
      const at = audio.currentTime;
      envelope.gain.setValueAtTime(level, at);
      envelope.gain.linearRampToValueAtTime(0, at + releaseSeconds);
      try { source.stop(at + releaseSeconds); } catch { /* already stopped */ }
    },
  };
  source.onended = () => {
    source.disconnect();
    envelope.disconnect();
    if (current === voice) current = null;
  };
  current = voice;
  source.start();
}

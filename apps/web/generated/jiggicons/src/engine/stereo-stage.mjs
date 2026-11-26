// Turns an icon's mono cue into a stereo pair for two speakers. The sound sits
// where the icon's moving mass is (sound-space.mjs): as the icon swings, flies
// or drops, the cue moves between the left and right speakers with it, a
// little quieter and duller when it is farther away. What the icon is made of
// sets how wide it sounds: a ringing bell or a glass ping spreads out, a
// knock on wood or a heartbeat stays tight in its spot.
import { positionAt } from './sound-space.mjs';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// How far each material's sound spreads between the speakers, 0 (a point) to
// about .6 (a wide shimmer).
export const WIDTH = {
  brass: .55, glass: .5, coin: .45, water: .4, spring: .35, bubble: .35, air: .3, metal: .3, leaf: .25, blip: .25,
  paper: .2, shutter: .2, plastic: .2, cardboard: .2, cloth: .15, wood: .15, rubber: .15, stone: .1, tick: .1,
  heartbeat: 0,
};

// The stereo width of a cue: its strikes' materials, weighted by how loud
// each one is.
export function widthOf(sound = []) {
  const total = sound.reduce((sum, strike) => sum + (strike.v ?? 1), 0);
  if (!total) return .2;
  return sound.reduce((sum, strike) => sum + (WIDTH[strike.m] ?? .2) * (strike.v ?? 1), 0) / total;
}

// Where the cue is between the speakers at a moment: -1 hard left, 1 hard
// right. The path's angle is widened so even a modest swing is clear on two
// speakers, without ever collapsing into one of them.
export function panAt(curve, seconds) {
  if (!curve) return [0, 1];
  const [x, y, z] = positionAt(curve, seconds);
  const distance = Math.max(.3, Math.hypot(x, y, z));
  return [clamp(1.6 * x / distance, -.92, .92), distance];
}

// A travel pop (the `air` material) marks an icon setting off, so it is heard
// where the icon is headed: the furthest point of its sideways travel in the
// next 0.4 s. Contact sounds stay where the hit happens.
const travelLead = .4, travelHold = .12;
function travelTargets(curve, strikes) {
  if (!curve) return [];
  return strikes.filter(strike => strike.m === 'air').map(strike => {
    let best = strike.t, farthest = -1;
    for (let t = strike.t; t <= strike.t + travelLead; t += curve.step) {
      const [pan] = panAt(curve, t);
      if (Math.abs(pan) > farthest) { farthest = Math.abs(pan); best = t; }
    }
    return { from: strike.t, to: strike.t + travelHold, at: best };
  });
}

export function stereoize(samples, curve, width = .2, rate = 44100, strikes = []) {
  const targets = travelTargets(curve, strikes);
  const itd = .00045 * rate; // the far speaker hears it up to ~0.45 ms later
  const echoLeft = Math.round(.011 * rate), echoRight = Math.round(.017 * rate);
  const length = samples.length + echoRight + Math.ceil(itd) + 1;
  const left = new Float32Array(length), right = new Float32Array(length);
  const at = index => index >= 0 && index < samples.length ? samples[index] : 0;
  const between = position => {
    const index = Math.floor(position), mix = position - index;
    return at(index) * (1 - mix) + at(index + 1) * mix;
  };
  let softLeft = 0, softRight = 0;
  for (let i = 0; i < length; i++) {
    const time = i / rate;
    const target = targets.find(entry => time >= entry.from && time < entry.to);
    const [pan, distance] = panAt(curve, target ? target.at : time);
    const angle = (pan + 1) * Math.PI / 4;
    const near = clamp(distance ** -.7, .65, 1.25);
    const leftGain = Math.cos(angle) * 1.15 * near, rightGain = Math.sin(angle) * 1.15 * near;
    const delay = Math.abs(pan) * itd;
    const direct = [between(i - (pan > 0 ? delay : 0)), between(i - (pan < 0 ? delay : 0))];
    // Each speaker also carries its own short echo of the source, so the two
    // channels differ slightly and the sound has width; less when panned hard.
    const spread = width * .5 * near * (1 - .5 * Math.abs(pan));
    let l = leftGain * direct[0] + spread * at(i - echoLeft);
    let r = rightGain * direct[1] + spread * at(i - echoRight);
    // Farther away, the top end softens.
    const open = clamp(1 - (distance - .8) * .55, .35, 1);
    softLeft += open * (l - softLeft);
    softRight += open * (r - softRight);
    left[i] = softLeft;
    right[i] = softRight;
  }
  // Settle both channels to silence at the very end.
  const fade = Math.min(length, Math.round(.006 * rate));
  for (let k = 0; k < fade; k++) {
    const gain = k / fade;
    left[length - 1 - k] *= gain;
    right[length - 1 - k] *= gain;
  }
  return { left, right };
}

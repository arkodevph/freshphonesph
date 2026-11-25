// Where an icon's sound is in 3D space while it plays. The source starts
// straight ahead of the listener and travels with the icon's own moving mass,
// so a rocket that blasts up and right is heard rising to the right, a bell
// swinging is heard swaying, and a heart that swells comes closer. Where the
// icon sits on screen plays no part.
import { bake, poseOf, RATE } from './motion-spec.mjs';

const STEP = 2; // 120 Hz motion, 60 Hz sound path
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// A layer's transform about its origin, in the order CSS applies it:
// translate, rotate, scale. Affine [a, b, c, d, e, f].
function local(pose, ox, oy) {
  const angle = pose.r * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const a = cos * pose.sx, b = sin * pose.sx, c = -sin * pose.sy, d = cos * pose.sy;
  return [a, b, c, d, ox + pose.x - (a * ox + c * oy), oy + pose.y - (b * ox + d * oy)];
}

const compose = ([a1, b1, c1, d1, e1, f1], [a2, b2, c2, d2, e2, f2]) => [
  a1 * a2 + c1 * b2, b1 * a2 + d1 * b2, a1 * c2 + c1 * d2, b1 * c2 + d1 * d2,
  a1 * e2 + c1 * f2 + e1, b1 * e2 + d1 * f2 + f1,
];

// How the icon's mass moves, frame by frame at 60 Hz: its displacement on the
// 24-unit grid and how much bigger or smaller it is drawn.
// `mass` lists each layer's [x, y, area]; without it, origins stand in.
export function soundPath(motion, material = 'outline', mass) {
  const parts = motion[material] ?? motion.outline;
  const baked = bake(parts, motion.ms);
  const count = Math.round(motion.ms / 1000 * RATE) + 1;
  const points = parts.map(([, ox, oy], index) => mass?.[index] ?? (index === 0 ? [12, 12, 100] : [ox, oy, 5]));
  const frames = [];
  for (let i = 0; i < count; i += STEP) frames.push(i);
  if (frames.at(-1) !== count - 1) frames.push(count - 1);

  const tracks = parts.map(() => []);
  for (const i of frames) {
    const matrices = [];
    const matrixOf = index => {
      if (matrices[index]) return matrices[index];
      const [parent, ox, oy] = parts[index];
      const own = local(poseOf(baked[index], i), ox, oy);
      return (matrices[index] = parent >= 0 ? compose(matrixOf(parent), own) : own);
    };
    parts.forEach((_, index) => {
      const [a, b, c, d, e, f] = matrixOf(index);
      const [x, y] = points[index];
      tracks[index].push([a * x + c * y + e, b * x + d * y + f, Math.sqrt(Math.abs(a * d - b * c))]);
    });
  }

  // Parts that travel count for more than their ink alone, so a swinging
  // clapper or a launched streamer still steers the sound.
  const travel = tracks.map(track => Math.max(...track.map(([x, y, size]) =>
    Math.hypot(x - track[0][0], y - track[0][1]) + 6 * Math.abs(size - 1))));
  const most = Math.max(1e-6, ...travel);
  const weights = points.map(([, , area], index) => Math.max(area, 1) * (1 + 3 * travel[index] / most));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return {
    step: STEP / RATE,
    times: frames.map(i => i / RATE),
    dx: frames.map((_, n) => tracks.reduce((sum, track, k) => sum + weights[k] * (track[n][0] - track[0][0]), 0) / total),
    dy: frames.map((_, n) => tracks.reduce((sum, track, k) => sum + weights[k] * (track[n][1] - track[0][1]), 0) / total),
    grow: frames.map((_, n) => tracks.reduce((sum, track, k) => sum + weights[k] * track[n][2], 0) / total),
  };
}

// Listener coordinates for the path (metres; x right, y up, -z ahead). The
// sideways and vertical travel turn into azimuth and elevation, scaled so even
// a small nudge is audible and a big launch stays within a comfortable arc;
// growing brings the source closer.
export function spatialCurve(path) {
  const peak = Math.max(...path.dx.map((x, i) => Math.hypot(x, path.dy[i])));
  const gain = peak < .05 ? 0 : Math.min(Math.max(9, 8 / peak), 45 / peak); // degrees per unit
  const x = [], y = [], z = [];
  for (let i = 0; i < path.dx.length; i++) {
    const azimuth = clamp(path.dx[i] * gain, -50, 50) * Math.PI / 180;
    const elevation = clamp(-path.dy[i] * gain * .8, -35, 35) * Math.PI / 180;
    const distance = clamp(1 / path.grow[i] ** 2.2, .5, 1.8);
    x.push(Math.sin(azimuth) * Math.cos(elevation) * distance);
    y.push(Math.sin(elevation) * distance);
    z.push(-Math.cos(azimuth) * Math.cos(elevation) * distance);
  }
  return { step: path.step, x, y, z };
}

// The position at a moment in the cue; after the motion ends the source rests
// straight ahead.
export function positionAt(curve, seconds) {
  const index = seconds / curve.step;
  const last = curve.x.length - 1;
  if (!(index < last)) return [curve.x[last], curve.y[last], curve.z[last]];
  const low = Math.max(0, Math.floor(index)), mix = index - low;
  return [0, 1, 2].map(axis => {
    const values = [curve.x, curve.y, curve.z][axis];
    return values[low] + (values[low + 1] - values[low]) * mix;
  });
}

// Per-icon choreography, built from the same physics as the landing sampler:
// smooth impulses drive damped springs, and parts can follow other parts with
// their own spring so they lag, overshoot and settle naturally.
//
// Authors write one spec per icon in motion-specs/*.json; tools/motion-lab.mjs
// validates, previews and compiles them. Units are the 24-unit artboard.
//
// {
//   "idea": "The bell swings from its crown; the clapper lags and strikes the rim.",
//   "ms": 1200, "dir": [-1, 0],
//   "sound": [{ "m": "brass", "t": 0.105, "v": 1 }, { "m": "brass", "t": 0.28, "v": 0.45, "p": 1.001 }],
//   "body": { "origin": [12, 3], "r": { "push": [[-22, 0, 0.13], [8, 0.17, 0.3]], "spring": [3.6, 0.25] } },
//   "parts": [{ "name": "clapper", "pick": [[8,18],[16,18],[16,23],[8,23]], "parent": "body", "origin": [12, 18.6],
//               "r": { "follow": "body.r", "spring": [3.2, 0.28], "relative": true } }],
//   "solid": { "body": {...}, "parts": [...] }   // optional override for solid and glass
// }
//
// For a hand-drawn icon (icon-sources/), a part names the layers it moves
// instead: "parts": [{ "name": "clapper", "layers": ["clapper"], ... }].
//
// A track moves one layer about its origin with channels:
//   x, y  translation in units      r  rotation in degrees
//   sq    squash: scaleX = 1 + v, scaleY = 1 - v (negative stretches tall)
//   s     uniform scale offset: scale = 1 + v      o  opacity offset: opacity = 1 + v
// A channel is { push, hold, turn, spring } or { follow, gain, relative, spring }:
//   push  [[amount, start, end], ...]  smooth sin² bumps that rise and return to 0
//   hold  [[amount, start, end, ramp], ...]  ease up over ramp seconds, stay,
//         then ease back down over ramp seconds before end (a lid held open)
//   turn  [[amount, start, end], ...]  smooth steps that stay (r only). The total
//         must be a whole turn, or 360/n for an n-fold symmetric shape such as a
//         gear (n up to 12), so the end pose looks identical to the rest pose
//   follow "layer.channel"  drive from another layer's channel times gain;
//          relative: true subtracts that leader, for a part nested in it.
//          A layer may follow its own earlier channel (order x, y, r, sq, s, o),
//          e.g. a lid's r following its own y to tilt as it lifts.
//   spring [frequency Hz, damping ratio]  position chases the drive like a mass
// Times are in seconds from the tap.

export const RATE = 120;
export const CHANNELS = ['x', 'y', 'r', 'sq', 's', 'o'];
export const MATERIALS = ['wood', 'brass', 'glass', 'metal', 'plastic', 'paper', 'cardboard', 'cloth', 'bubble',
  'water', 'air', 'heartbeat', 'rubber', 'tick', 'coin', 'shutter', 'spring', 'blip', 'stone', 'leaf'];

const TRACK_FIELDS = new Set(['origin', ...CHANNELS]);
const CHANNEL_FIELDS = new Set(['push', 'hold', 'turn', 'spring', 'follow', 'gain', 'relative']);
const LIMITS = { x: 26, y: 26, r: 720, sq: .6, s: 1.5, o: 1 };

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function point(value, where) {
  check(Array.isArray(value) && value.length === 2 && value.every(Number.isFinite), where + ' must be [x, y]');
  check(value.every(v => v >= -12 && v <= 36), where + ' is far outside the 24-unit artboard');
}

function validateChannel(channel, name, where, seconds, layers, own) {
  check(channel && typeof channel === 'object', where + ' must be an object');
  for (const key of Object.keys(channel)) check(CHANNEL_FIELDS.has(key), `${where}: unknown field "${key}"`);
  const driven = channel.push || channel.turn || channel.hold;
  check(Boolean(driven) !== Boolean(channel.follow), where + ' needs either push/hold/turn or follow');
  for (const kind of ['push', 'hold', 'turn']) {
    if (!channel[kind]) continue;
    if (kind === 'turn') check(name === 'r', where + '.turn is only for rotation');
    check(Array.isArray(channel[kind]) && channel[kind].length >= 1 && channel[kind].length <= 8, `${where}.${kind} needs 1 to 8 entries`);
    for (const [index, entry] of channel[kind].entries()) {
      const at = `${where}.${kind}[${index}]`;
      const size = kind === 'hold' ? 4 : 3;
      check(Array.isArray(entry) && entry.length === size && entry.every(Number.isFinite),
        at + (kind === 'hold' ? ' must be [amount, start, end, ramp]' : ' must be [amount, start, end]'));
      const [amount, start, end, ramp] = entry;
      if (kind === 'hold') check(ramp > 0 && ramp * 2 <= end - start + 1e-9, at + ' ramp must be positive and at most half of end - start');
      check(Math.abs(amount) <= LIMITS[name] * (kind === 'turn' ? 1 : 1.5), at + ' amount is out of range');
      check(start >= -0.5 && end > start && end <= seconds, at + ' must satisfy start < end <= duration');
    }
  }
  if (channel.turn) {
    const total = channel.turn.reduce((sum, [amount]) => sum + amount, 0);
    const symmetric = Array.from({ length: 12 }, (_, k) => 360 / (k + 1)).some(unit => Math.abs(total / unit - Math.round(total / unit)) < 1e-6);
    check(total !== 0 && symmetric, where + '.turn amounts must add up to a whole turn or 360/n for an n-fold symmetric shape');
  }
  if (channel.follow !== undefined) {
    check(typeof channel.follow === 'string' && /^[a-z][\w-]*\.(x|y|r|sq|s|o)$/.test(channel.follow), where + '.follow must look like "body.r"');
    const [layer, leaderChannel] = channel.follow.split('.');
    if (layer === own) check(CHANNELS.indexOf(leaderChannel) < CHANNELS.indexOf(name), `${where}.follow may only use this layer's earlier channels (order x, y, r, sq, s, o)`);
    else check(layers.has(layer), `${where}.follow refers to "${layer}", which must be body, an earlier part or this layer`);
    if (channel.gain !== undefined) check(Number.isFinite(channel.gain) && Math.abs(channel.gain) <= 20, where + '.gain is out of range');
    if (channel.relative !== undefined) check(typeof channel.relative === 'boolean', where + '.relative must be true or false');
  } else {
    check(channel.gain === undefined && channel.relative === undefined, where + ': gain and relative only apply to follow');
  }
  if (channel.spring !== undefined) {
    check(Array.isArray(channel.spring) && channel.spring.length === 2 && channel.spring.every(Number.isFinite), where + '.spring must be [frequency, damping]');
    const [frequency, damping] = channel.spring;
    check(frequency >= 0.8 && frequency <= 16, where + '.spring frequency must be 0.8 to 16 Hz');
    check(damping >= 0.08 && damping <= 2, where + '.spring damping must be 0.08 to 2');
  }
}

function validateTrack(track, where, seconds, layers, own) {
  check(track && typeof track === 'object', where + ' must be an object');
  for (const key of Object.keys(track)) check(TRACK_FIELDS.has(key) || ['name', 'pick', 'islands', 'layers', 'cut', 'parent'].includes(key), `${where}: unknown field "${key}"`);
  if (track.origin !== undefined) point(track.origin, where + '.origin');
  for (const name of CHANNELS) if (track[name] !== undefined) validateChannel(track[name], name, `${where}.${name}`, seconds, layers, own);
}

function validateRig(rig, where, seconds) {
  for (const key of Object.keys(rig)) check(['body', 'parts'].includes(key), `${where}: unknown field "${key}"`);
  const layers = new Set(['body']);
  if (rig.body !== undefined) validateTrack(rig.body, where + '.body', seconds, new Set(), 'body');
  const parts = rig.parts ?? [];
  check(Array.isArray(parts), where + '.parts must be an array');
  check(parts.length <= 8, where + ' has more than 8 parts');
  for (const [index, part] of parts.entries()) {
    const at = `${where}.parts[${index}]`;
    check(typeof part.name === 'string' && /^[a-z][\w-]*$/.test(part.name) && part.name !== 'body', at + '.name must be a lowercase word');
    check(!layers.has(part.name), `${at}: duplicate name ${part.name}`);
    const picks = ['pick', 'islands', 'layers'].filter(key => part[key] !== undefined);
    check(picks.length === 1, at + ' needs exactly one of layers (names), pick (polygon) or islands (indices)');
    if (part.layers !== undefined) {
      check(Array.isArray(part.layers) && part.layers.length >= 1 && part.layers.every(name => typeof name === 'string' && /^[a-z][a-z0-9-]*$/.test(name)),
        at + '.layers must list layer names from the icon source');
      check(!part.cut, at + ': cut needs a pick polygon');
    } else if (part.pick !== undefined) {
      check(Array.isArray(part.pick) && part.pick.length >= 3, at + '.pick must be a polygon of at least 3 points');
      part.pick.forEach((value, k) => point(value, `${at}.pick[${k}]`));
    } else {
      check(Array.isArray(part.islands) && part.islands.length >= 1 && part.islands.every(n => Number.isInteger(n) && n >= 0),
        at + '.islands must list island numbers from the grid');
      check(!part.cut, at + ': cut needs a pick polygon');
    }
    if (part.cut !== undefined) check(typeof part.cut === 'boolean', at + '.cut must be true or false');
    if (part.parent !== undefined) check(layers.has(part.parent), `${at}.parent must be "body" or an earlier part`);
    validateTrack(part, at, seconds, layers, part.name);
    layers.add(part.name);
  }
}

export function validateSpec(spec, id = 'spec') {
  check(spec && typeof spec === 'object', id + ' must be an object');
  for (const key of Object.keys(spec)) check(['idea', 'ms', 'sound', 'dir', 'body', 'parts', 'solid'].includes(key), `${id}: unknown field "${key}"`);
  check(typeof spec.idea === 'string' && spec.idea.trim().length >= 12, id + '.idea must describe the motion');
  check(Number.isInteger(spec.ms) && spec.ms >= 400 && spec.ms <= 1800, id + '.ms must be an integer from 400 to 1800');
  const seconds = spec.ms / 1000;
  check(Array.isArray(spec.sound) && spec.sound.length >= 1 && spec.sound.length <= 6, id + '.sound needs 1 to 6 strikes');
  for (const [index, strike] of spec.sound.entries()) {
    const at = `${id}.sound[${index}]`;
    for (const key of Object.keys(strike)) check(['m', 't', 'v', 'p'].includes(key), `${at}: unknown field "${key}"`);
    check(MATERIALS.includes(strike.m), `${at}.m must be one of ${MATERIALS.join(', ')}`);
    check(Number.isFinite(strike.t) && strike.t >= 0 && strike.t < seconds, at + '.t must fall within the motion');
    check(strike.v === undefined || (Number.isFinite(strike.v) && strike.v > 0 && strike.v <= 1), at + '.v must be within 0..1');
    check(strike.p === undefined || (Number.isFinite(strike.p) && strike.p >= 0.5 && strike.p <= 2), at + '.p must be within 0.5..2');
  }
  if (spec.dir !== undefined) check(Array.isArray(spec.dir) && spec.dir.length === 2 && spec.dir.every(v => [-1, 0, 1].includes(v)), id + '.dir must be [x, y] with -1, 0 or 1');
  validateRig({ body: spec.body, parts: spec.parts }, id, seconds);
  if (spec.solid !== undefined) validateRig(spec.solid, id + '.solid', seconds);
  // Island numbers and cut polygons are specific to one drawing, so the solid
  // drawing must state its own parts whenever the outline uses either.
  if ((spec.parts ?? []).some(part => (part.islands || part.cut) && !part.layers)) {
    check(Array.isArray(spec.solid?.parts), id + ': parts using islands or cut need an explicit solid.parts (use [] for a body-only solid motion)');
  }
  const moving = [spec.body, ...(spec.parts ?? []), spec.solid?.body, ...(spec.solid?.parts ?? [])]
    .some(track => track && CHANNELS.some(name => track[name]));
  check(moving, id + ' has no motion');
  return spec;
}

// Compiled tracks keep the authored channels; the client bakes them on play.
function compileRig(rig) {
  const parts = rig.parts ?? [];
  const names = ['body', ...parts.map(part => part.name)];
  const index = name => names.indexOf(name);
  const track = (source, parent, self) => {
    const channels = {};
    for (const name of CHANNELS) {
      const channel = source?.[name];
      if (!channel) continue;
      const [leader, leaderChannel] = channel.follow?.split('.') ?? [];
      channels[name] = channel.follow
        ? { ...channel, follow: [leader === (source.name ?? 'body') ? self : index(leader), leaderChannel] }
        : channel;
    }
    return [parent, ...(source?.origin ?? [12, 12]), channels];
  };
  return [track(rig.body, -1, 0), ...parts.map((part, k) => track(part, part.parent ? index(part.parent) : -1, k + 1))];
}

export function compileSpec(spec) {
  const result = { ms: spec.ms, sound: spec.sound, outline: compileRig(spec) };
  if (spec.solid) result.solid = compileRig({ body: spec.solid.body ?? spec.body, parts: spec.solid.parts ?? spec.parts });
  if (spec.dir) result.dir = spec.dir;
  return result;
}

export function rigOf(spec) {
  const strip = parts => (parts ?? []).map(({ pick, islands, cut, layers }) => layers ? { layers } : islands ? { islands } : cut ? { pick, cut } : { pick });
  const result = { parts: strip(spec.parts) };
  if (spec.solid) result.solid = { parts: strip(spec.solid.parts ?? spec.parts) };
  return result;
}

// ---- Baking ---------------------------------------------------------------

function bump(time, start, end) {
  if (time <= start || time >= end) return 0;
  return Math.sin(Math.PI * (time - start) / (end - start)) ** 2;
}

function plateau(time, start, end, ramp) {
  if (time <= start || time >= end) return 0;
  if (time < start + ramp) return Math.sin(Math.PI / 2 * (time - start) / ramp) ** 2;
  if (time > end - ramp) return Math.sin(Math.PI / 2 * (end - time) / ramp) ** 2;
  return 1;
}

function step(time, start, end) {
  if (time <= start) return 0;
  if (time >= end) return 1;
  const u = (time - start) / (end - start);
  return u * u * (3 - 2 * u);
}

function spring(target, frequency, damping) {
  const result = new Float64Array(target.length);
  let position = 0, velocity = 0;
  const omega = 2 * Math.PI * frequency;
  // Substeps keep stiff springs stable at the 120 Hz bake rate.
  const substeps = 4, dt = 1 / (RATE * substeps);
  for (let i = 0; i < target.length; i++) {
    for (let k = 0; k < substeps; k++) {
      const acceleration = omega ** 2 * (target[i] - position) - 2 * damping * omega * velocity;
      velocity += acceleration * dt;
      position += velocity * dt;
    }
    result[i] = position;
  }
  return result;
}

// Bake every channel of every layer: { [layer]: { [channel]: Float64Array } }.
// Samples run from 0 to ms inclusive at 120 Hz.
export function bake(layers, ms) {
  const count = Math.round(ms / 1000 * RATE) + 1;
  const time = Array.from({ length: count }, (_, i) => i / RATE);
  const result = layers.map(() => ({}));
  layers.forEach(([, , , channels], index) => {
    for (const name of CHANNELS) {
      const channel = channels[name];
      if (!channel) continue;
      let drive;
      if (channel.follow) {
        const [leader, leaderChannel] = channel.follow;
        const source = result[leader]?.[leaderChannel] ?? new Float64Array(count);
        drive = Float64Array.from(source, value => value * (channel.gain ?? 1));
      } else {
        drive = Float64Array.from(time, t =>
          (channel.push ?? []).reduce((sum, [amount, start, end]) => sum + amount * bump(t, start, end), 0) +
          (channel.hold ?? []).reduce((sum, [amount, start, end, ramp]) => sum + amount * plateau(t, start, end, ramp), 0) +
          (channel.turn ?? []).reduce((sum, [amount, start, end]) => sum + amount * step(t, start, end), 0));
      }
      let values = channel.spring ? spring(drive, ...channel.spring) : drive;
      let rest = (channel.turn ?? []).reduce((sum, [amount]) => sum + amount, 0) * (channel.follow ? 0 : 1);
      if (channel.follow) {
        // A follower settles where its leader settles, scaled by its gain.
        const leader = result[channel.follow[0]]?.[channel.follow[1]];
        rest = (leader?.rest ?? 0) * (channel.gain ?? 1);
        if (channel.relative && leader) {
          values = values.map((value, i) => value - leader[i]);
          rest -= leader.rest ?? 0;
        }
      }
      values.rest = rest;
      result[index][name] = values;
    }
  });
  return result;
}

// How far each channel still is from rest when the motion ends.
export function residue(baked) {
  let worst = 0;
  for (const channels of baked) {
    for (const [name, values] of Object.entries(channels)) {
      const end = values.at(-1) - (values.rest ?? 0);
      const scale = { x: 1, y: 1, r: 1 / 6, sq: 12, s: 12, o: 4 }[name];
      worst = Math.max(worst, Math.abs(end) * scale);
    }
  }
  return worst;
}

export function poseOf(channels, i) {
  const at = name => channels[name]?.[i] ?? 0;
  const sq = at('sq'), s = 1 + at('s');
  return { x: at('x'), y: at('y'), r: at('r'), sx: s * (1 + sq), sy: s * (1 - sq), o: Math.max(0, Math.min(1, 1 + at('o'))) };
}

// Web Animations keyframes for one layer, sampled at 60 Hz with the final
// frame snapped to rest (whole turns count as rest).
export function keyframesOf(channels, ms) {
  const names = Object.keys(channels);
  if (!names.length) return null;
  const count = channels[names[0]].length;
  const frames = [];
  for (let i = 0; i < count; i += 2) {
    const last = i + 2 >= count;
    const pose = last ? { x: 0, y: 0, r: channels.r?.rest ?? 0, sx: 1, sy: 1, o: 1 } : poseOf(channels, i);
    frames.push({
      offset: last ? 1 : i / (count - 1),
      transform: `translate(${pose.x / 24 * 100}%, ${pose.y / 24 * 100}%) rotate(${pose.r}deg) scale(${pose.sx}, ${pose.sy})`,
      opacity: pose.o,
    });
    if (last) break;
  }
  return frames;
}

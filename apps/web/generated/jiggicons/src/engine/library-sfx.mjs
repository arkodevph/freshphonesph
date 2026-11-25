// Physically modelled UI foley for the library: each strike excites a few
// decaying resonant modes of a small real object, plus a short contact noise.
// The palette is tuned like a polished interface rather than a toy box:
//
//   - a crisp, short contact on top of a tonal body, the way designed UI
//     clicks and pops are built;
//   - mid registers: every material's body sits between about 150 Hz and
//     1.6 kHz, and nothing rings above about 2.7 kHz;
//   - soft onsets (1 to 3 ms) and short decays (a few tens of milliseconds;
//     only bells and glass ring on, and quietly);
//   - no sweeps: any glide (a drop, a bubble, a pop) moves less than a
//     semitone, so nothing reads as a laser, a zap or a riser;
//   - a touch of room (a few very short reflections) for polish.
//
// Cues are quiet; stereo-stage places them between the speakers.
const TAU = 2 * Math.PI;

function modes(t, list) {
  let sum = 0;
  for (const [hz, gain, decay] of list) sum += gain * Math.exp(-t / decay) * Math.sin(TAU * hz * t);
  return sum;
}

// A tone that glides gently from `from` to `to` Hz over `time` seconds (an
// exponential approach, so the change is front-loaded and settles).
function glide(t, from, to, time) {
  return TAU * (to * t + (from - to) * time * (1 - Math.exp(-t / time)));
}

// Each model: (t seconds, contact noise, pitch) -> sample. `attack` softens the
// onset, `texture` smooths the contact noise (lower is darker), `tail` bounds
// the render, and `level` balances loudness between materials.
export const SFX = {
  // A knock on a small wooden block: a warm, round "tok".
  wood: { attack: .0015, texture: .55, tail: .2, level: 1, voice: (t, n, p) => modes(t * p, [
    [392, .75, .045], [655, .4, .03], [1046, .22, .018], [1580, .09, .011]]) + .32 * n * Math.exp(-t / .003) },
  // A small desk bell, struck softly: two close rim modes beat gently.
  brass: { attack: .002, texture: .4, tail: 1, level: .68, voice: (t, n, p) => modes(t * p, [
    [620, .42, .3], [623, .26, .26], [1240, .22, .2], [1612, .17, .14], [2050, .07, .085]]) + .12 * n * Math.exp(-t / .004) },
  // A glass tile tapped: a clear, short "tink" that rings only a moment.
  glass: { attack: .0012, texture: .55, tail: .4, level: .55, voice: (t, n, p) => modes(t * p, [
    [1180, .5, .09], [1188, .2, .075], [2620, .12, .04]]) + .14 * n * Math.exp(-t / .0015) },
  // A latch, clasp or switch settling home: a solid, low click.
  metal: { attack: .0008, texture: .65, tail: .13, level: .8, voice: (t, n, p) => modes(t * p, [
    [420, .28, .028], [740, .45, .02], [1180, .28, .012], [1890, .1, .007]]) + .32 * n * Math.exp(-t / .002) },
  // A plastic button or casing: a short, slightly hollow tap.
  plastic: { attack: .001, texture: .65, tail: .12, level: .95, voice: (t, n, p) => modes(t * p, [
    [660, .55, .022], [1190, .27, .013], [1880, .09, .007]]) + .36 * n * Math.exp(-t / .0025) },
  // Paper or card: a soft fingertip pat on a page.
  paper: { attack: .001, texture: .45, tail: .08, level: .85, voice: (t, n, p) => modes(t * p, [
    [520, .35, .012], [980, .17, .007]]) + .3 * n * Math.exp(-t / .004) },
  // A hollow box, folder or lid landing: a dull, roomy thud.
  cardboard: { attack: .003, texture: .38, tail: .2, level: 1, voice: (t, n, p) => modes(t * p, [
    [210, .65, .04], [470, .3, .028], [880, .14, .014]]) + .34 * n * Math.exp(-t / .01) },
  // Fabric, a cushion or a soft body: a short, muted pat.
  cloth: { attack: .002, texture: .24, tail: .1, level: 1, voice: (t, n, p) =>
    Math.exp(-t / .032) * Math.sin(TAU * 170 * p * t) + modes(t * p, [[380, .12, .015]]) + .12 * n * Math.exp(-t / .004) },
  // A bubble or a chat pop: a round, tonal pop that lifts a touch as it opens.
  bubble: { attack: .002, texture: .55, tail: .18, level: .8, voice: (t, n, p) => {
    const phase = glide(t, 530 * p, 560 * p, .02);
    return Math.exp(-t / .045) * (Math.sin(phase) + .25 * Math.sin(2 * phase)) + .14 * n * Math.exp(-t / .002);
  } },
  // A water droplet: a soft "plip" that lifts slightly as it lands.
  water: { attack: .002, texture: .3, tail: .18, level: .75, voice: (t, n, p) => {
    const phase = glide(t, 600 * p, 640 * p, .02);
    return Math.exp(-t / .04) * Math.sin(phase) + .08 * n * Math.exp(-t / .003);
  } },
  // Anything that travels (arrows, planes, sends): a soft, round puff.
  air: { attack: .002, texture: .22, tail: .12, level: .75, voice: (t, n, p) => {
    const phase = glide(t, 330 * p, 300 * p, .025);
    return Math.exp(-t / .03) * (Math.sin(phase) + .1 * Math.sin(2 * phase)) + .12 * n * Math.exp(-t / .01);
  } },
  // A low membrane thump, for hearts, pulses and soft bodies.
  heartbeat: { attack: .006, texture: .09, tail: .3, level: 1, voice: (t, n, p) => {
    const phase = glide(t, 96 * p, 88 * p, .033);
    return .83 * Math.exp(-t / .052) * Math.sin(phase) + .37 * Math.exp(-t / .039) * Math.sin(phase * 2.06) +
      .18 * Math.exp(-t / .027) * Math.sin(phase * 3.45) + .2 * n * Math.exp(-t / .025);
  } },
  // Rubber or a ball bouncing: a dull, springy thump.
  rubber: { attack: .002, texture: .32, tail: .2, level: 1, voice: (t, n, p) =>
    Math.exp(-t / .04) * Math.sin(glide(t, 205 * p, 190 * p, .02)) +
    modes(t * p, [[520, .15, .02]]) + .25 * n * Math.exp(-t / .01) },
  // A clock escapement: a tiny, dry, wooden "tic".
  tick: { attack: .0006, texture: .7, tail: .06, level: .7, voice: (t, n, p) => modes(t * p, [
    [640, .25, .01], [880, .45, .012], [1320, .2, .006]]) + .34 * n * Math.exp(-t / .0015) },
  // A coin or small key: a soft metallic "ting" that rings briefly.
  coin: { attack: .001, texture: .4, tail: .45, level: .5, voice: (t, n, p) => modes(t * p, [
    [1320, .45, .13], [1328, .2, .11], [1980, .2, .08]]) + .12 * n * Math.exp(-t / .002) },
  // A camera shutter: two soft mechanical clicks around a brief blade brush.
  shutter: { attack: .0008, texture: .28, tail: .14, level: .8, voice: (t, n, p) => {
    const click = u => u < 0 ? 0 : modes(u * p, [[860, .4, .008], [1450, .24, .005]]) + .25 * n * Math.exp(-u / .0025);
    return click(t) + .7 * click(t - .048) + .08 * n * Math.exp(-(((t - .024) / .016) ** 2));
  } },
  // A soft spring: a short, gentle "doink" with a slight wobble.
  spring: { attack: .002, texture: .25, tail: .3, level: .65, voice: (t, n, p) =>
    Math.exp(-t / .09) * Math.sin(TAU * 260 * p * t + .25 * Math.sin(TAU * 14 * t) * Math.exp(-t / .08)) +
    .08 * n * Math.exp(-t / .005) },
  // Screens and digital things: a clean tonal click, a short pitched body
  // under a crisp key contact, never a beep.
  blip: { attack: .002, texture: .7, tail: .12, level: .55, voice: (t, n, p) =>
    Math.exp(-t / .03) * (Math.sin(TAU * 780 * p * t) + .22 * Math.sin(TAU * 1560 * p * t)) +
    .16 * n * Math.exp(-t / .0015) },
  // A pebble, brick or ceramic knock: dense and low.
  stone: { attack: .001, texture: .4, tail: .13, level: 1, voice: (t, n, p) => modes(t * p, [
    [290, .6, .03], [690, .3, .015], [1380, .13, .008]]) + .38 * n * Math.exp(-t / .004) },
  // Leaves, grass or feathers: a light, soft flick.
  leaf: { attack: .0008, texture: .45, tail: .05, level: .55, voice: (t, n, p) => modes(t * p, [
    [760, .22, .009], [1150, .3, .006], [1720, .16, .004]]) + .22 * n * Math.exp(-t / .0015) },
};

function mulberry(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return (((x ^ (x >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

// Authored pitches range from half to double; heard as they are, the top of
// that range turns small objects shrill. They are kept in proportion but drawn
// in towards the material's own register (an octave up is heard as about a
// fifth up), and kept within a sixth either side.
export function pitchOf(p = 1) {
  return Math.min(1.26, Math.max(.8, Math.pow(p, .55)));
}

// Render the strikes of one icon. Each icon's seed nudges pitch by up to 3%
// so neighbours made of the same material still sound like different objects.
export function renderStrikes(strikes, seed, rate) {
  const detune = .97 + ((seed >>> 3) & 255) / 255 * .06;
  const end = Math.max(...strikes.map(strike => strike.t + SFX[strike.m].tail));
  const samples = new Float32Array(Math.ceil((end + .06) * rate));
  for (const [number, strike] of strikes.entries()) {
    const model = SFX[strike.m];
    const random = mulberry(seed + 4821 * (number + 1));
    const pitch = pitchOf(strike.p) * detune;
    const level = (strike.v ?? 1) * model.level;
    const start = Math.round(strike.t * rate);
    const stop = Math.min(samples.length, start + Math.ceil(model.tail * rate));
    let contact = 0;
    for (let index = start; index < stop; index++) {
      const t = (index - start) / rate;
      contact += model.texture * (random() - contact);
      // Fade the last 15 ms so a truncated tail never clicks.
      const fade = Math.min(1, (stop - index) / (.015 * rate));
      samples[index] += level * (1 - Math.exp(-t / model.attack)) * model.voice(t, contact, pitch) * fade;
    }
  }
  // Two gentle one-pole low-passes round off anything harsh, so every cue
  // stays smooth on laptop speakers and earbuds alike.
  const smoothing = Math.exp(-TAU * 6000 / rate);
  for (let pass = 0; pass < 2; pass++) {
    let previous = 0;
    for (let i = 0; i < samples.length; i++) previous = samples[i] = samples[i] * (1 - smoothing) + previous * smoothing;
  }
  // A touch of room: four short, darker reflections, as if the object sat on
  // a desk in a quiet room.
  const dry = samples.slice();
  const dark = Math.exp(-TAU * 2500 / rate);
  for (const [ms, gain] of [[9, .16], [15, .11], [23, .07], [31, .04]]) {
    const offset = Math.round(ms / 1000 * rate);
    let previous = 0;
    for (let i = offset; i < samples.length; i++) {
      previous = dry[i - offset] * (1 - dark) + previous * dark;
      samples[i] += gain * previous;
    }
  }
  // The render ends in silence (its last 60 ms are padding): end on a clean zero.
  samples[samples.length - 1] = 0;
  return samples;
}

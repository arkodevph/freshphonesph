import { renderStrikes } from './library-sfx.mjs';
// A dry, intimate mallet palette for browsing. The landing sampler keeps its
// own recordings. The main note reaches its attack at the visible gesture.
export const soundRate = 44100;

const timbres = {
  felt:    { harmonics: [1,.12,.035], attack: .016, decay: .036, bend: .014 },
  wood:    { harmonics: [1,.18,.085], attack: .012, decay: .031, bend: .024 },
  round:   { harmonics: [1,.085,.024], attack: .019, decay: .044, bend: .075 },
  pluck:   { harmonics: [1,.22,.055], attack: .014, decay: .049, bend: .009 },
  bell:    { harmonics: [1,.24,.075], attack: .020, decay: .055, bend: .002 },
  breath:  { harmonics: [1,.065,.028], attack: .026, decay: .051, bend: -.038 },
  drop:    { harmonics: [1,.13,.028], attack: .018, decay: .042, bend: -.083 },
};

// The pickup has a related pitch and a light touch. There are at most two
// notes in a cue, even for an icon with several modifiers.
const voices = {
  tap:      { timbre:'felt',  root:246.94, interval:1,     pickup:.13 },
  shutter:  { timbre:'wood',  root:293.66, interval:.75,   pickup:.22 },
  clock:    { timbre:'wood',  root:329.63, interval:1,     pickup:.15 },
  latch:    { timbre:'wood',  root:220,    interval:1.125, pickup:.18 },
  chime:    { timbre:'bell',  root:349.23, interval:.75,   pickup:.12 },
  clink:    { timbre:'bell',  root:392,    interval:.8,    pickup:.13 },
  heartbeat:{ timbre:'round', root:146.83, interval:.89,   pickup:.33 },
  land:     { timbre:'round', root:185,    interval:1.125, pickup:.16 },
  bounce:   { timbre:'round', root:246.94, interval:.75,   pickup:.23 },
  paper:    { timbre:'felt',  root:261.63, interval:.89,   pickup:.22 },
  stroke:   { timbre:'breath',root:293.66, interval:.89,   pickup:.18 },
  breeze:   { timbre:'breath',root:329.63, interval:.8,    pickup:.17 },
  roll:     { timbre:'wood',  root:196,    interval:.89,   pickup:.21 },
  slide:    { timbre:'drop',  root:261.63, interval:.75,   pickup:.19 },
  tone:     { timbre:'pluck', root:329.63, interval:.8,    pickup:.15 },
  string:   { timbre:'pluck', root:293.66, interval:.667,  pickup:.24 },
  bubble:   { timbre:'drop',  root:311.13, interval:.75,   pickup:.2 },
  hinge:    { timbre:'felt',  root:220,    interval:.8,    pickup:.22 },
};

const originalVoices = {
  saved:'tap', bell:'chime', heart:'heartbeat', message:'bubble', upload:'slide',
  gift:'hinge', cart:'roll', download:'land', confetti:'string',
};
const subjectVoices = [
  [/^(security-camera|camera|aperture|image|photo|screenshot|film)/, 'shutter'],
  [/^(clock|timer|stopwatch|hourglass|access-time)/, 'clock'],
  [/^(lock|unlock|vault|key|shield|wrench|scissors|keyboard|calculator|joystick|switch|toggle)/, 'latch'],
  [/^(coin|cash|money|currency|medal|trophy|star|sparkle|crystal|glass|beaker|drink|bottle|beer|cup|cheers)/, 'clink'],
  [/^(alert|alarm|call|lightbulb|notification)/, 'chime'],
  [/^(heart|pulse|stethoscope|health)/, 'heartbeat'],
  [/^(water|drop|rain|weather-(rain|shower|drizzle)|swim|bubble|chat|comment|emoji)/, 'bubble'],
  [/^(book|paper|document|mail|note|receipt|newspaper|calendar|clipboard|playing-card)/, 'paper'],
  [/^(paint|pen|pencil|ink|draw|chalk|brush|eraser|text|font|marker|highlight)/, 'stroke'],
  [/^(globe|planet|leaf|flower|tree|plant|feather|butterfly|airplane|rocket|wind|weather|fan|cloud)/, 'breeze'],
  [/^(wheel|vehicle|car-|train|truck|bicycle|scooter|tractor|cart|gear|settings)/, 'roll'],
  [/^(guitar|music|piano|headphone|speaker|mic-|mic$|metronome|vinyl)/, 'string'],
  [/^(folder|box|package|briefcase|gift|archive|door|backpack)/, 'hinge'],
  [/^(sport|ball-|baseball|golf|tennis|animal|foot|boot|sneaker)/, 'bounce'],
  [/^(arrow|caret|chevron|swipe|navigation|slide)/, 'slide'],
];
const categoryVoices = {
  'Time & status':'clock', 'People & health':'land', Nature:'breeze', Interface:'tap',
  Travel:'roll', Media:'string', Communication:'bubble', 'Art & design':'stroke',
  Technology:'tone', 'Files & office':'paper', 'Home & objects':'land', 'Arrows & navigation':'slide',
  'Sports & games':'bounce', Commerce:'clink', 'Food & drink':'tap', 'Data & charts':'tone', Security:'latch',
};

function addNote(samples, time, hz, level, timbre, attack, decay, overtone) {
  const start = Math.round(Math.max(0,time) * soundRate);
  const count = Math.min(samples.length - start, Math.ceil((attack + 5 * decay) * soundRate));
  let phase = 0;
  const step = 2 * Math.PI * hz / soundRate;
  const release = Math.exp(-1 / (decay * soundRate));
  const settle = Math.exp(-1 / (.024 * soundRate));
  let amplitude = 1;
  let bend = timbre.bend;
  const rise = Math.ceil(attack * soundRate);
  for (let i = 0; i < count; i++) {
    const attackEnvelope = i < rise ? .5 - .5 * Math.cos(Math.PI * i / rise) : 1;
    const tail = Math.min(1, (count - i - 1) / (.012 * soundRate));
    const second = overtone * timbre.harmonics[1] * amplitude;
    const third = overtone * timbre.harmonics[2] * amplitude * amplitude;
    const wave = Math.sin(phase) + second * Math.sin(2 * phase) + third * Math.sin(3 * phase);
    samples[start+i] += level * attackEnvelope * amplitude * tail * wave;
    phase += step * (1 + bend);
    bend *= settle;
    if (i >= rise) amplitude *= release;
  }
}

export function normalizeCue(samples) {
  // Preserve some dynamic range between subjects. A separate short-window RMS
  // ceiling prevents sustained tones from sounding louder than a felt tap.
  const window = Math.round(.025 * soundRate);
  let peak = 0, rollingEnergy = 0, maxEnergy = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i];
    peak = Math.max(peak, Math.abs(value));
    rollingEnergy += value*value;
    if (i >= window) rollingEnergy -= samples[i-window] ** 2;
    maxEnergy = Math.max(maxEnergy, rollingEnergy);
  }
  const gain = Math.min(.145 / peak, .078 / Math.sqrt(maxEnergy / window));
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  return samples;
}

export function renderLibraryCue(icon, gesture) {
  // Authored choreography names the materials and the moments they sound.
  if (gesture.sound?.length) return normalizeCue(renderStrikes(gesture.sound, gesture.seed >>> 0, soundRate));
  const key = originalVoices[icon.id] ?? subjectVoices.find(([pattern]) => pattern.test(icon.id))?.[1]
    ?? categoryVoices[icon.category] ?? 'tap';
  const voice = voices[key];
  const timbre = timbres[voice.timbre];
  const seed = gesture.seed >>> 0;
  const register = [.89, 1, 1.125, 1.25][seed % 4];
  const detune = .982 + ((seed >>> 2) & 255) / 255 * .036;
  const overtone = .72 + ((seed >>> 10) & 255) / 255 * .35;
  const lift = /-(add|up|open|checkmark|sparkles?)$/.test(icon.id);
  const settle = /-(off|down|dismiss|close|lock|error)$/.test(icon.id);
  const hz = Math.min(465, Math.max(128, voice.root * register * detune * (lift ? 1.125 : settle ? .89 : 1)));
  const attack = timbre.attack * (.94 + ((seed >>> 18) & 127) / 127 * .14);
  const decay = timbre.decay * (.86 + ((seed >>> 25) & 127) / 127 * .23);
  const accent = gesture.accent / 1000;
  const samples = new Float32Array(Math.ceil((accent + decay * 5 + .012) * soundRate) + 1);
  const pickupTime = Math.min(.027, accent * .13);
  const pickup = /-(clock|timer|settings|sync)$/.test(icon.id) ? timbres.wood
    : /-(edit|search|text|brush)$/.test(icon.id) ? timbres.breath : timbre;
  addNote(samples, pickupTime, hz * voice.interval, voice.pickup, pickup, pickup.attack, pickup.decay * .65, overtone);
  addNote(samples, accent - attack, hz, 1, timbre, attack, decay, overtone);
  return normalizeCue(samples);
}

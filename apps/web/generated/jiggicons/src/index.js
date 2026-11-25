// The Jiggicons runtime: draws an icon in any of its four variants and plays
// its motion (Web Animations) and spatial sound (Web Audio). Framework
// packages (jiggicons-react, jiggicons-vue) and the <jigg-icon> element are
// thin layers over these functions. No dependencies.
import { bake, keyframesOf } from './engine/motion-spec.mjs';
import { playSound, stopSound, setVolume } from './audio.js';

export { playSound, stopSound, setVolume };

export const VARIANTS = Object.freeze(['outline', 'solid', 'duotone', 'glass']);

// The drawing each variant moves: glass moves like solid, duotone like outline.
export const materialOf = variant => variant === 'glass' ? 'solid' : variant === 'duotone' ? 'outline' : variant;

function pick(icon, variant) {
  if (!icon || !icon.svg) throw new TypeError('Not a Jiggicons icon');
  if (icon.svg[variant]) return variant;
  // An icon added with fewer variants falls back to one it has.
  return VARIANTS.find(name => icon.svg[name]) ?? Object.keys(icon.svg)[0];
}

// The inner markup of one variant, with its gradient and mask ids made unique
// for this instance so several copies on one page never share them.
export function markupOf(icon, variant = 'outline', uid = '') {
  const name = pick(icon, variant);
  const markup = icon.svg[name].markup;
  if (!uid) return markup;
  const prefix = 'jigg-' + icon.id + '-' + name;
  return markup.replaceAll(prefix + '-', prefix + '-' + String(uid).replace(/[^a-zA-Z0-9_-]/g, '') + '-');
}

const escapeAttribute = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

// A complete <svg> string, for server rendering, templates and design tools.
// With a `title` the icon is announced as an image; without one it is hidden
// from assistive technology, since it sits beside its own label.
export function toSvg(icon, { variant = 'outline', size = 24, title, className, uid = '' } = {}) {
  const label = title ? ` role="img" aria-label="${escapeAttribute(title)}"` : ' aria-hidden="true"';
  const cls = className ? ` class="${escapeAttribute(className)}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" data-jiggicon="${icon.id}" data-variant="${pick(icon, variant)}"${label}${cls}>${markupOf(icon, variant, uid)}</svg>`;
}

const running = new WeakMap();
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Stops an icon's motion and returns it to its rest pose.
export function stop(root) {
  running.get(root)?.();
}

// Plays the icon drawn inside `root` (its <svg> or any element containing
// it). Motion follows prefers-reduced-motion; sound plays only when asked
// (`sound: true`) and only after the visitor has interacted with the page,
// as browsers require. Returns a function that stops it.
export function play(root, icon, { variant, sound = false, volume } = {}) {
  if (!root || !icon?.motion) return () => {};
  const svg = root.matches?.('svg') ? root : root.querySelector?.('svg');
  const drawn = svg?.dataset?.variant ?? variant ?? 'outline';
  const name = pick(icon, variant ?? drawn);
  if (sound) playSound(icon, { variant: name, volume });
  stop(root);
  if (reducedMotion() || typeof root.querySelectorAll !== 'function') return () => {};
  const { motion } = icon;
  const layers = motion[materialOf(name)] ?? motion.outline;
  const baked = bake(layers, motion.ms);
  const animations = [];
  for (const element of root.querySelectorAll('[data-rig-layer]')) {
    if (typeof element.animate !== 'function') continue;
    const frames = keyframesOf(baked[Number(element.dataset.rigLayer)] ?? {}, motion.ms);
    if (frames) animations.push(element.animate(frames, { duration: motion.ms }));
  }
  if (!animations.length) return () => {};
  const halt = () => {
    if (running.get(root) !== halt) return;
    for (const animation of animations) animation.cancel();
    running.delete(root);
  };
  animations.at(-1).onfinish = () => { if (running.get(root) === halt) running.delete(root); };
  running.set(root, halt);
  return halt;
}

// Where a trigger listens: the nearest button, link or label around the icon,
// so hovering or clicking the whole control plays it; otherwise the icon.
export function triggerTarget(element) {
  return element?.parentElement?.closest?.('button, a, label, summary, [role="button"], [role="menuitem"], [role="tab"], [data-jiggicon-trigger]') ?? element;
}

// Wires `animate` ("hover", "click", "mount" or "none") to an icon element
// and returns a cleanup function. Hover also plays on keyboard focus.
export function bindTrigger(element, animate, run) {
  if (!element || animate === 'none' || animate === false) return () => {};
  if (animate === 'mount') {
    const frame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(run) : setTimeout(run);
    return () => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(frame) : clearTimeout(frame));
  }
  const target = triggerTarget(element);
  const events = animate === 'click' ? ['click'] : ['pointerenter', 'focusin'];
  const handler = event => {
    if (event.type === 'focusin' && !target.matches?.(':focus-visible')) return;
    run();
  };
  for (const type of events) target.addEventListener(type, handler);
  return () => { for (const type of events) target.removeEventListener(type, handler); };
}

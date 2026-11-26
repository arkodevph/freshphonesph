// <jigg-icon name="heart" variant="solid" animate="hover" sound label="Liked">
// A custom element for pages without a framework. Register the icons it may
// draw, then define the element once:
//
//   import { define, register } from 'jiggicons/element';
//   import heart from 'jiggicons/icons/heart';
//   register(heart);
//   define();
import { bindTrigger, play, stop, toSvg } from './index.js';

const icons = new Map();
let counter = 0;

export function register(...list) {
  for (const icon of list.flat()) {
    if (!icon?.id || !icon.svg) throw new TypeError('register() takes Jiggicons icon data');
    icons.set(icon.id, icon);
  }
  // Elements that arrived before their icon draw now.
  if (typeof document !== 'undefined') {
    for (const element of document.querySelectorAll('jigg-icon')) element.render?.();
  }
}

export const registered = id => icons.get(id);

const Base = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;

export class JiggIcon extends Base {
  static observedAttributes = ['name', 'variant', 'size', 'label', 'animate'];

  connectedCallback() {
    this.uid ??= 'e' + (++counter).toString(36);
    if (!this.style.display) this.style.display = 'inline-flex';
    this.render();
  }

  disconnectedCallback() {
    this.unbind?.();
    this.unbind = null;
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  get icon() {
    return icons.get(this.getAttribute('name'));
  }

  render() {
    const icon = this.icon;
    this.unbind?.();
    this.unbind = null;
    if (!icon) {
      this.innerHTML = '';
      return;
    }
    this.innerHTML = toSvg(icon, {
      variant: this.getAttribute('variant') ?? 'outline',
      size: this.getAttribute('size') ?? 24,
      title: this.getAttribute('label') ?? undefined,
      uid: this.uid,
    });
    this.unbind = bindTrigger(this, this.getAttribute('animate') ?? 'hover', () => this.play());
  }

  // Plays the icon's motion, and its sound when the element has `sound`.
  play() {
    const icon = this.icon;
    if (!icon) return;
    play(this, icon, { sound: this.hasAttribute('sound'), volume: Number(this.getAttribute('volume') ?? 1) });
  }

  stop() {
    stop(this);
  }
}

export function define(tag = 'jigg-icon') {
  if (typeof customElements === 'undefined' || customElements.get(tag)) return;
  customElements.define(tag, class extends JiggIcon {});
}

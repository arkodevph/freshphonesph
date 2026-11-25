export type JiggiconVariant = 'outline' | 'solid' | 'duotone' | 'glass';
export type JiggiconAnimate = 'hover' | 'click' | 'mount' | 'none';

/** One icon: its drawing in each variant and its choreography. */
export interface JiggiconData {
  v: number;
  id: string;
  name: string;
  category: string;
  svg: Partial<Record<JiggiconVariant, { markup: string; mass: number[][] }>>;
  motion: { ms: number; sound: { m: string; t: number; v?: number; p?: number }[]; [material: string]: unknown };
}

export const VARIANTS: readonly JiggiconVariant[];
export function materialOf(variant: JiggiconVariant): 'outline' | 'solid';
/** The inner markup of one variant; `uid` makes its ids unique on the page. */
export function markupOf(icon: JiggiconData, variant?: JiggiconVariant, uid?: string): string;
/** A complete <svg> string. */
export function toSvg(icon: JiggiconData, options?: { variant?: JiggiconVariant; size?: number | string; title?: string; className?: string; uid?: string }): string;
/** Plays the icon drawn inside `root`; returns a function that stops it. */
export function play(root: Element, icon: JiggiconData, options?: { variant?: JiggiconVariant; sound?: boolean; volume?: number }): () => void;
export function stop(root: Element): void;
export function triggerTarget(element: Element): Element;
export function bindTrigger(element: Element, animate: JiggiconAnimate | false, run: () => void): () => void;
export function playSound(icon: JiggiconData, options?: { variant?: JiggiconVariant; volume?: number; overlap?: boolean }): Promise<void>;
export function stopSound(): void;
/** Volume for every icon sound, 0 to 1. */
export function setVolume(value: number): void;

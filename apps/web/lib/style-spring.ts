import { advanceMenuSpring, type MenuSpring } from "./menu-spring";

/** Retarget CSS variables while keeping each channel's position and velocity. */
export function createStyleSpring(
  element: HTMLElement,
  initial: Record<string, number>,
) {
  const channels = new Map(
    Object.entries(initial).map(([key, position]) => {
      return [key, { position, velocity: 0, target: position }];
    }),
  );

  const preference = matchMedia("(prefers-reduced-motion: reduce)");

  let frame = 0;

  let lastTime: number | null = null;

  function paint() {
    for (const [key, state] of channels) {
      element.style.setProperty(key, String(state.position));
    }
  }

  function settle() {
    cancelAnimationFrame(frame);

    frame = 0;

    lastTime = null;

    for (const state of channels.values()) {
      state.position = state.target;

      state.velocity = 0;
    }

    paint();
  }

  function tick(time: number) {
    const elapsed = lastTime === null ? 1 / 120 : (time - lastTime) / 1000;

    lastTime = time;

    let moving = false;

    for (const state of channels.values()) {
      const next: MenuSpring = advanceMenuSpring(state, state.target, elapsed);

      Object.assign(state, next);

      if (
        Math.abs(state.position - state.target) < 0.001 &&
        Math.abs(state.velocity) < 0.01
      ) {
        state.position = state.target;

        state.velocity = 0;
      } else {
        moving = true;
      }
    }

    paint();

    frame = moving ? requestAnimationFrame(tick) : 0;

    if (!moving) {
      lastTime = null;
    }
  }

  function onPreference() {
    if (preference.matches) {
      settle();
    }
  }

  preference.addEventListener("change", onPreference);

  paint();

  return {
    to(targets: Record<string, number>) {
      for (const [key, target] of Object.entries(targets)) {
        const state = channels.get(key);

        if (state) {
          state.target = target;
        }
      }

      if (preference.matches) {
        settle();
      } else if (!frame) {
        frame = requestAnimationFrame(tick);
      }
    },
    dispose() {
      cancelAnimationFrame(frame);

      preference.removeEventListener("change", onPreference);

      for (const key of channels.keys()) {
        element.style.removeProperty(key);
      }
    },
  };
}

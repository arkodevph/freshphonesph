export type MenuSpring = { position: number; velocity: number };

/** Advance a damped spring without discarding velocity when its target changes. */
export function advanceMenuSpring(
  state: MenuSpring,
  target: number,
  elapsed: number,
): MenuSpring {
  let { position, velocity } = state;

  let remaining = Math.min(Math.max(elapsed, 0), 0.032);

  while (remaining > 0) {
    const step = Math.min(remaining, 1 / 120);

    const acceleration = 520 * (target - position) - 40 * velocity;

    velocity += acceleration * step;

    position += velocity * step;

    remaining -= step;
  }

  return { position, velocity };
}

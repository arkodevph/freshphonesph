import choreography from "./jiggicons-choreography.json";
import { play, type JiggiconData } from "@/generated/jiggicons/src/index.js";

const motions: Record<string, { idea: string; ms: number; layers: unknown[] }> =
  choreography;

// Keep the licensed source assets intact; author Freshphones motion separately.
export function creativeIcon(source: JiggiconData): JiggiconData {
  const motion = motions[source.id];

  let markup = source.svg.glass!.markup;

  if (source.id === "home") {
    const doorAt = markup.lastIndexOf('<g data-rig-layer="0"');

    const door = markup.slice(doorAt);

    const opening = door
      .replace(/<g[^>]*>/, "<g>")
      .replace('fill="url(#jigg-home-glass-g1)"', 'fill="#161617"');

    const leaf = door
      .replace('data-rig-layer="0"', 'data-rig-layer="1" data-motion-axis="y"')
      .replace("transform-origin:50% 91.67%", "transform-origin:37.5% 73.33%")
      .replace(
        "</g>",
        '<circle cx="13.8" cy="17.9" r="0.35" fill="#e3e3e5"/></g>',
      );

    markup = markup.slice(0, doorAt) + opening + leaf;
  }

  if (source.id === "cube") {
    // The top surface occurs in both visible art and its glass masks.
    markup = markup.replace(
      /<g data-rig-layer="0" style="[^"]+">(?=<path fill-rule="evenodd" d="M11\.34 2\.11)/g,
      '<g data-rig-layer="1" data-motion-axis="x" style="transform-box:view-box;transform-origin:50% 30.21%">',
    );
  }

  const hinges: Partial<
    Record<string, { layer: number; axis: string; origin: string }>
  > = {
    calendar: { layer: 0, axis: "x", origin: "50% 25%" },
    key: { layer: 0, axis: "z", origin: "50% 50%" },
    briefcase: { layer: 2, axis: "x", origin: "50% 28.13%" },
    folder: { layer: 1, axis: "x", origin: "50% 83.33%" },
    globe: { layer: 1, axis: "y", origin: "50% 50%" },
    door: { layer: 1, axis: "y", origin: "26.04% 50%" },
  };

  const hinge = hinges[source.id];

  if (hinge) {
    markup = markup.replace(
      new RegExp(`<g data-rig-layer="${hinge.layer}" style="[^"]+">`, "g"),
      `<g data-rig-layer="${hinge.layer}" data-motion-axis="${hinge.axis}" style="transform-box:view-box;transform-origin:${hinge.origin}">`,
    );
  }

  return {
    ...source,
    svg: { glass: { ...source.svg.glass!, markup } },
    motion: {
      ...source.motion,
      ms: motion.ms,
      outline: motion.layers,
      solid: motion.layers,
    },
  };
}

export function playCreativeIcon(element: SVGSVGElement, icon: JiggiconData) {
  play(element, icon, { variant: "glass", sound: false });

  // Reuse the original sampled springs and lifecycle, adding the hinge's 3D axis.
  // Apply it to the masks as well as visible layers so the glass stays coherent.
  for (const animation of element.getAnimations({ subtree: true })) {
    const effect = animation.effect;

    if (!(effect instanceof KeyframeEffect)) {
      continue;
    }

    const axis = (effect.target as SVGElement | null)?.dataset.motionAxis;

    if (!axis || axis === "z") {
      continue;
    }

    effect.setKeyframes(
      effect.getKeyframes().map((frame) => ({
        offset: frame.offset,
        easing: frame.easing,
        opacity: frame.opacity,
        transform: String(frame.transform).replace(
          "rotate(",
          `perspective(72px) rotate${axis.toUpperCase()}(`,
        ),
      })),
    );
  }
}

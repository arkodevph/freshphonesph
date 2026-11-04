"use client";

import { useVerificationGlass } from "./useVerificationGlass";

export default function VerificationGlass({
  className,
}: {
  className: string;
}) {
  const { id, layer, map } = useVerificationGlass();

  return (
    <>
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter
            id={id}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feImage
              href={map || undefined}
              x="0"
              y="0"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              result="edge-map"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="edge-map"
              scale="26"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      <span
        ref={layer}
        className={className}
        aria-hidden="true"
        style={
          map
            ? {
                backdropFilter: `url(#${id}) blur(3px) saturate(1.25)`,
                WebkitBackdropFilter: `url(#${id}) blur(3px) saturate(1.25)`,
              }
            : undefined
        }
      />
    </>
  );
}

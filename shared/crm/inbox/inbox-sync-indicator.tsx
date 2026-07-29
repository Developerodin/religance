"use client";

import { createTimeline, stagger } from "animejs";
import { useEffect, useId, useRef } from "react";

/** Salt-lattice sync mark — purple crystals + slow orbit, tuned for frequent 30s polls. */
const SIZES = { sm: 14, md: 18 } as const;

const CRYSTAL_SITES = [
  { cx: 9, cy: 4.6 },
  { cx: 5.15, cy: 11.05 },
  { cx: 12.85, cy: 11.05 },
] as const;

export function InboxSyncIndicator({
  active,
  size = "md",
  className = "",
}: {
  active: boolean;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const timelineRef = useRef<ReturnType<typeof createTimeline> | null>(null);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const stop = () => {
      timelineRef.current?.revert();
      timelineRef.current = null;
    };

    if (!active) {
      stop();
      return stop;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return stop;
    }

    const orbit = root.querySelector<SVGElement>("[data-sync-orbit]");
    const crystals = root.querySelectorAll<SVGElement>("[data-sync-crystal]");

    const tl = createTimeline({
      loop: true,
      defaults: { ease: "inOutSine" },
    });

    tl.add(
      crystals,
      {
        scale: [1, 1.2, 1],
        opacity: [0.42, 1, 0.42],
        duration: 1050,
        delay: stagger(130, { from: "center" }),
      },
      0
    );

    if (orbit) {
      tl.add(
        orbit,
        {
          rotate: [0, 360],
          duration: 4800,
          ease: "linear",
        },
        0
      );
    }

    timelineRef.current = tl;
    return stop;
  }, [active]);

  const px = SIZES[size];
  const gradId = `inboxSyncGrad-${uid}`;
  const glowId = `inboxSyncGlow-${uid}`;

  return (
    <span
      ref={rootRef}
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: px, height: px }}
      aria-hidden
    >
      <svg width={px} height={px} viewBox="0 0 18 18" fill="none">
        <defs>
          <linearGradient id={gradId} x1="3" y1="3" x2="15" y2="15">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="55%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#c4b5fd" />
          </linearGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.55" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g data-sync-orbit style={{ transformOrigin: "9px 9px" }}>
          <circle
            cx="9"
            cy="9"
            r="7.2"
            stroke={`url(#${gradId})`}
            strokeWidth="0.65"
            strokeDasharray="1.6 2.6"
            opacity="0.4"
          />
        </g>
        {CRYSTAL_SITES.map((site, i) => (
          <g
            key={i}
            data-sync-crystal
            style={{ transformOrigin: `${site.cx}px ${site.cy}px` }}
          >
            <rect
              x={site.cx - 1.3}
              y={site.cy - 1.3}
              width={2.6}
              height={2.6}
              rx={0.3}
              transform={`rotate(45 ${site.cx} ${site.cy})`}
              fill={`url(#${gradId})`}
              filter={`url(#${glowId})`}
            />
          </g>
        ))}
      </svg>
    </span>
  );
}

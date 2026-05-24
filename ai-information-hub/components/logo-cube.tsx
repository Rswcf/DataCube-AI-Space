"use client";

import { useId } from "react";

interface LogoCubeProps {
  className?: string;
  size?: number;
}

export function LogoCube({ className, size = 40 }: LogoCubeProps) {
  const uid = useId();

  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${uid}-top`} x1="130" y1="74" x2="380" y2="226" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#142335" />
          <stop offset="100%" stopColor="#07111f" />
        </linearGradient>
        <linearGradient id={`${uid}-left`} x1="74" y1="142" x2="256" y2="456" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#132236" />
          <stop offset="100%" stopColor="#07111f" />
        </linearGradient>
        <linearGradient id={`${uid}-right`} x1="256" y1="108" x2="438" y2="404" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1D7FEA" />
          <stop offset="100%" stopColor="#0B57D0" />
        </linearGradient>
        <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#06111f" floodOpacity="0.18" />
        </filter>
      </defs>
      <g filter={`url(#${uid}-soft)`} stroke="#F8FAFC" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round">
        <polygon points="256,52 438,146 256,240 74,146" fill={`url(#${uid}-top)`} />
        <polygon points="74,146 256,240 256,458 74,354" fill={`url(#${uid}-left)`} />
        <polygon points="256,240 438,146 438,354 256,458" fill={`url(#${uid}-right)`} />

        <path d="M165 99 346 193M74 250l182 104M165 407V193M347 407V193M74 354l182-114 182 114M74 146l182 94 182-94" fill="none" opacity="0.92" />
        <path d="M165 193 256 146 347 193M165 99v308M347 99v308M256 52v406" fill="none" opacity="0.74" />

        <path d="M112 294 160 238 220 286 180 344 112 294Z" fill="none" strokeWidth="10" opacity="0.95" />
        <g fill="#F8FAFC" stroke="none">
          <circle cx="112" cy="294" r="14" />
          <circle cx="160" cy="238" r="14" />
          <circle cx="220" cy="286" r="14" />
          <circle cx="180" cy="344" r="14" />
        </g>

        <polygon points="256,354 304,382 304,434 256,458" fill="#10B981" strokeWidth="10" />
        <path d="M314 326h34l17-52 28 104 20-56h25" fill="none" stroke="#F2A51A" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round" />
      </g>
    </svg>
  );
}

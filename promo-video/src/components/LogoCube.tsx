import React from 'react';

interface LogoCubeProps {
  size?: number;
}

export const LogoCube: React.FC<LogoCubeProps> = ({ size = 120 }) => {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="logo-r" x1="256" y1="54" x2="422" y2="342" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="logo-l" x1="256" y1="54" x2="90" y2="342" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
        <linearGradient id="logo-b" x1="256" y1="246" x2="256" y2="438" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {/* Right face (Tech - Blue) */}
      <polygon points="256,246 256,54 422,150 422,342" fill="url(#logo-r)" />
      {/* Left face (Tips - Teal) */}
      <polygon points="256,246 256,54 90,150 90,342" fill="url(#logo-l)" />
      {/* Bottom face (Investment - Amber) */}
      <polygon points="256,246 422,342 256,438 90,342" fill="url(#logo-b)" />
    </svg>
  );
};

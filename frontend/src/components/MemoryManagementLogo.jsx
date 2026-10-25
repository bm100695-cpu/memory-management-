import React from 'react';

/**
 * Memory Management Chip Logo
 * Custom vector logo matching the microchip + golden memory core icon.
 */
export default function MemoryManagementLogo({
  size = 40,
  showText = false,
  layout = 'horizontal', // 'horizontal' or 'stacked'
  className = '',
  textClassName = '',
}) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Chip Vector Graphic */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm"
      >
        {/* Outer Connection Pins */}
        {/* Top 3 Pins */}
        <line x1="32" y1="6" x2="32" y2="22" stroke="#0e3d6b" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="50" y1="6" x2="50" y2="22" stroke="#0e3d6b" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="68" y1="6" x2="68" y2="22" stroke="#0e3d6b" strokeWidth="4.5" strokeLinecap="round" />

        {/* Bottom 3 Pins */}
        <line x1="32" y1="78" x2="32" y2="94" stroke="#0e3d6b" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="50" y1="78" x2="50" y2="94" stroke="#0e3d6b" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="68" y1="78" x2="68" y2="94" stroke="#0e3d6b" strokeWidth="4.5" strokeLinecap="round" />

        {/* Left 4 Pins */}
        <line x1="6" y1="31" x2="22" y2="31" stroke="#0e3d6b" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="6" y1="44" x2="22" y2="44" stroke="#0e3d6b" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="6" y1="56" x2="22" y2="56" stroke="#0e3d6b" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="6" y1="69" x2="22" y2="69" stroke="#0e3d6b" strokeWidth="4.5" strokeLinecap="round" />

        {/* Right 4 Pins */}
        <line x1="78" y1="31" x2="94" y2="31" stroke="#0e3d6b" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="78" y1="44" x2="94" y2="44" stroke="#0e3d6b" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="78" y1="56" x2="94" y2="56" stroke="#0e3d6b" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="78" y1="69" x2="94" y2="69" stroke="#0e3d6b" strokeWidth="4.5" strokeLinecap="round" />

        {/* Chip Body */}
        <rect
          x="18"
          y="18"
          width="64"
          height="64"
          rx="12"
          fill="#1c5d99"
          stroke="#0e3d6b"
          strokeWidth="3.5"
        />

        {/* Inner Border Inset */}
        <rect
          x="22"
          y="22"
          width="56"
          height="56"
          rx="8"
          fill="none"
          stroke="#3884c7"
          strokeWidth="1.5"
          opacity="0.8"
        />

        {/* Amber Cog / Core Gear */}
        <g transform="translate(50, 50)">
          {/* Radial Gear Teeth (12 teeth) */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <rect
              key={deg}
              x="-2.5"
              y="-19"
              width="5"
              height="6"
              rx="1"
              fill="#f59e0b"
              transform={`rotate(${deg})`}
            />
          ))}

          {/* Golden Core Ring */}
          <circle cx="0" cy="0" r="14" fill="#f59e0b" />
          {/* Inner cutout ring */}
          <circle cx="0" cy="0" r="8" fill="#1c5d99" />
          {/* Center Amber Dot */}
          <circle cx="0" cy="0" r="4.5" fill="#f59e0b" />
        </g>
      </svg>

      {/* Typography Label */}
      {showText && (
        <div className={`flex flex-col leading-tight ${textClassName}`}>
          <span className="font-bold tracking-tight text-lg sm:text-xl" style={{ color: 'var(--text-primary)' }}>
            Memory
          </span>
          <span className="font-semibold text-base sm:text-lg opacity-90" style={{ color: 'var(--text-primary)' }}>
            Management
          </span>
        </div>
      )}
    </div>
  );
}

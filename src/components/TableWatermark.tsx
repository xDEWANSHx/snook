import React from 'react';

interface TableWatermarkProps {
  theme: 'felt' | 'chalk';
}

export const TableWatermark: React.FC<TableWatermarkProps> = ({ theme }) => {
  const isFelt = theme === 'felt';

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center select-none z-0">
      {/* Overhead Tournament Luminaire Spotlight (Diffuse ambient cone) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[120vw] max-w-4xl h-[55vh] rounded-full pointer-events-none"
        style={{
          background: isFelt
            ? 'radial-gradient(ellipse at 50% 15%, rgba(52, 211, 153, 0.28) 0%, rgba(16, 185, 129, 0.14) 40%, rgba(6, 78, 59, 0.03) 70%, transparent 100%)'
            : 'radial-gradient(ellipse at 50% 10%, rgba(255, 255, 255, 0.9) 0%, rgba(245, 238, 225, 0.5) 50%, transparent 100%)',
        }}
      />

      {/* Atmospheric Snooker Table Blueprint & Spot Markers */}
      <svg
        className={`w-full h-full max-w-xl mx-auto transition-opacity duration-300 ${
          isFelt ? 'opacity-25' : 'opacity-10'
        }`}
        viewBox="0 0 400 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Table Cushion Outer Guide */}
        <rect
          x="12"
          y="15"
          width="376"
          height="770"
          rx="24"
          stroke={isFelt ? '#34d399' : '#78716c'}
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* 6 Snooker Pocket Markers */}
        <circle cx="24" cy="28" r="10" stroke={isFelt ? '#fbbf24' : '#78716c'} strokeWidth="1.5" fill="none" opacity="0.6" />
        <circle cx="376" cy="28" r="10" stroke={isFelt ? '#fbbf24' : '#78716c'} strokeWidth="1.5" fill="none" opacity="0.6" />
        <circle cx="18" cy="400" r="10" stroke={isFelt ? '#fbbf24' : '#78716c'} strokeWidth="1.5" fill="none" opacity="0.6" />
        <circle cx="382" cy="400" r="10" stroke={isFelt ? '#fbbf24' : '#78716c'} strokeWidth="1.5" fill="none" opacity="0.6" />
        <circle cx="24" cy="772" r="10" stroke={isFelt ? '#fbbf24' : '#78716c'} strokeWidth="1.5" fill="none" opacity="0.6" />
        <circle cx="376" cy="772" r="10" stroke={isFelt ? '#fbbf24' : '#78716c'} strokeWidth="1.5" fill="none" opacity="0.6" />

        {/* The Baulk Line (Horizontal line at the baulk end) */}
        <line
          x1="24"
          y1="165"
          x2="376"
          y2="165"
          stroke={isFelt ? '#34d399' : '#a8a29e'}
          strokeWidth="1.5"
        />

        {/* The Famous "D" Semicircle */}
        <path
          d="M 155 165 A 45 45 0 0 1 245 165"
          stroke={isFelt ? '#34d399' : '#a8a29e'}
          strokeWidth="1.5"
          strokeDasharray="3 3"
          fill="none"
        />

        {/* Spot: Brown Spot (center of Baulk line) */}
        <circle cx="200" cy="165" r="3" fill={isFelt ? '#d97706' : '#78716c'} />

        {/* Spot: Green Spot (left of D) */}
        <circle cx="155" cy="165" r="3" fill={isFelt ? '#22c55e' : '#78716c'} />

        {/* Spot: Yellow Spot (right of D) */}
        <circle cx="245" cy="165" r="3" fill={isFelt ? '#eab308' : '#78716c'} />

        {/* Center Blue Spot */}
        <circle cx="200" cy="400" r="3.5" fill={isFelt ? '#3b82f6' : '#78716c'} />
        <line x1="190" y1="400" x2="210" y2="400" stroke={isFelt ? '#60a5fa' : '#a8a29e'} strokeWidth="1" />

        {/* Pink Spot */}
        <circle cx="200" cy="580" r="3.5" fill={isFelt ? '#f43f5e' : '#78716c'} />

        {/* Black Spot */}
        <circle cx="200" cy="710" r="4" fill={isFelt ? '#ffffff' : '#1c1917'} opacity="0.8" />
        <circle cx="200" cy="710" r="1.5" fill={isFelt ? '#000000' : '#ffffff'} />
      </svg>
    </div>
  );
};

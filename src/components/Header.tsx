import React from 'react';

export const Header: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 right-0 p-3 sm:p-4 pointer-events-none z-10 bg-gradient-to-b from-[#0a0e14]/80 via-[#0a0e14]/40 to-transparent">
      <h1 className="text-base sm:text-lg font-bold text-[#e9edf3] tracking-tight drop-shadow-md">
        Roof Twin — 45 × 38 ft terrace
      </h1>
      <div className="mt-0.5 text-[10.5px] sm:text-xs font-mono text-[#c3ccd8] tracking-wider uppercase drop-shadow">
        Tape survey · 2,239 sq ft · strips L 6 ft · R 3 ft · Front 3 ft
      </div>
    </div>
  );
};

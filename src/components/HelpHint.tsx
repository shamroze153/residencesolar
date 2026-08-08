import React from 'react';

export const HelpHint: React.FC = () => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 hidden md:block text-xs font-medium text-[#cfd6e0] bg-[#121820]/80 backdrop-blur border border-[#2a3340] px-4 py-1.5 rounded-full shadow-lg pointer-events-none select-none">
      Drag to orbit · Scroll to zoom · Right-drag to pan · Click any asset
    </div>
  );
};

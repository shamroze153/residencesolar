import React from 'react';
import { X } from 'lucide-react';
import { AssetInfo } from '../types';

interface InfoCardProps {
  asset: AssetInfo | null;
  onClose: () => void;
}

export const InfoCard: React.FC<InfoCardProps> = ({ asset, onClose }) => {
  if (!asset) return null;

  return (
    <div className="fixed right-3 top-16 sm:top-20 z-30 w-[260px] sm:w-[280px] bg-[#121820]/95 backdrop-blur-md border border-[#2a3340] border-l-2 border-l-[#ffb020] rounded-xl p-3.5 sm:p-4 shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-right-4">
      <button
        onClick={onClose}
        className="absolute top-2.5 right-2.5 text-[#8b96a6] hover:text-[#e9edf3] transition-colors p-1 rounded-md hover:bg-white/10"
        aria-label="Close details"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="font-mono text-[10px] tracking-widest text-[#ffb020] font-semibold uppercase mb-1">
        {asset.code}
      </div>

      <h2 className="text-sm sm:text-base font-semibold text-[#e9edf3] leading-snug mb-3 pr-6">
        {asset.name}
      </h2>

      <dl className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11.5px] border-t border-[#2a3340]/60 pt-2.5 mb-3">
        {asset.rows.map(([label, val], idx) => (
          <React.Fragment key={idx}>
            <dt className="text-[#8b96a6] truncate">{label}</dt>
            <dd className="text-[#e9edf3] font-medium text-right truncate">{val}</dd>
          </React.Fragment>
        ))}
      </dl>

      {asset.note && (
        <p className="text-[11px] leading-relaxed text-[#a0abb8] border-t border-[#2a3340]/60 pt-2.5">
          {asset.note}
        </p>
      )}
    </div>
  );
};

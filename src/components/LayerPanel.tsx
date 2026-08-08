import React from 'react';
import { LayerKey, LayerConfig, ViewPreset } from '../types';

interface LayerPanelProps {
  layers: Record<LayerKey, boolean>;
  onToggleLayer: (key: LayerKey) => void;
  activeView: ViewPreset | null;
  onSelectView: (view: ViewPreset) => void;
}

const LAYER_CONFIGS: LayerConfig[] = [
  { key: 'hvac', label: 'AC condensers', color: '#e3e6e9', keyShortcut: '1' },
  { key: 'solar', label: 'Solar Structure', color: '#38bdf8', keyShortcut: '2' },
  { key: 'struct', label: 'Structures', color: '#b0bdbc', keyShortcut: '3' },
  { key: 'util', label: 'Loose items', color: '#7d8794', keyShortcut: '4' },
  { key: 'context', label: 'Neighbours', color: '#6a7482', keyShortcut: '5' },
  { key: 'dims', label: 'Dimensions', color: '#ffb020', keyShortcut: '6' },
];

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  onToggleLayer,
  activeView,
  onSelectView,
}) => {
  return (
    <div className="fixed left-3 bottom-3 sm:left-4 sm:bottom-4 z-20 w-48 sm:w-52 bg-[#121820]/90 backdrop-blur-md border border-[#2a3340] rounded-xl p-2.5 sm:p-3 shadow-xl">
      <div className="text-[10px] tracking-widest font-semibold text-[#8b96a6] uppercase mb-2 px-1">
        Layers
      </div>

      <div className="space-y-1">
        {LAYER_CONFIGS.map((layer) => {
          const isActive = layers[layer.key];
          return (
            <button
              key={layer.key}
              onClick={() => onToggleLayer(layer.key)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                isActive
                  ? 'text-[#e9edf3] hover:bg-white/10'
                  : 'text-[#8b96a6] opacity-40 hover:opacity-70 hover:bg-white/5'
              }`}
            >
              <span
                className="w-3 h-3 rounded-[3px] border border-white/20 shrink-0"
                style={{ backgroundColor: layer.color }}
              />
              <span className="truncate flex-1">{layer.label}</span>
              <span className="font-mono text-[10px] text-[#8b96a6] ml-auto">
                {layer.keyShortcut}
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-[#2a3340] mt-2.5 pt-2.5 flex gap-1.5">
        {(['iso', 'plan', 'entry'] as ViewPreset[]).map((view) => (
          <button
            key={view}
            onClick={() => onSelectView(view)}
            className={`flex-1 py-1 text-[10.5px] font-mono rounded-md border transition-colors uppercase ${
              activeView === view
                ? 'bg-[#ffb020]/20 border-[#ffb020] text-[#ffb020] font-bold'
                : 'bg-white/5 border-[#2a3340] text-[#8b96a6] hover:text-[#e9edf3] hover:border-[#ffb020]/50'
            }`}
          >
            {view}
          </button>
        ))}
      </div>
    </div>
  );
};

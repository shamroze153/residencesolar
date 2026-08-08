import React, { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Maximize2, Compass } from 'lucide-react';
import { Header } from './components/Header';
import { LayerPanel } from './components/LayerPanel';
import { InfoCard } from './components/InfoCard';
import { HelpHint } from './components/HelpHint';
import { TerraceViewer } from './components/TerraceViewer';
import { AssetInfo, LayerKey, ViewPreset } from './types';

export default function App() {
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    hvac: true,
    solar: true,
    struct: true,
    util: true,
    context: true,
    dims: true, // Visible by default so 45 ft and 38 ft measurements show on screen
  });

  const [activeView, setActiveView] = useState<ViewPreset | null>('iso');
  const [selectedAsset, setSelectedAsset] = useState<AssetInfo | null>(null);
  
  // Single-click toggle for Structure-Only / Clean View mode
  const [showUI, setShowUI] = useState<boolean>(false);

  const toggleLayer = useCallback((key: LayerKey) => {
    setLayers((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const handleSelectView = useCallback((view: ViewPreset) => {
    setActiveView(view);
  }, []);

  const handleSelectAsset = useCallback((asset: AssetInfo | null) => {
    setSelectedAsset(asset);
  }, []);

  // Keyboard shortcuts for layers (1-6) and UI toggle (H or Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const keyMap: Record<string, LayerKey> = {
        '1': 'hvac',
        '2': 'solar',
        '3': 'struct',
        '4': 'util',
        '5': 'context',
        '6': 'dims',
      };

      const layerKey = keyMap[e.key];
      if (layerKey) {
        toggleLayer(layerKey);
      }

      if (e.key.toLowerCase() === 'h') {
        setShowUI((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleLayer]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0e1218] text-[#e9edf3] select-none">
      {/* Header - visible only when showUI is true */}
      {showUI && <Header />}

      {/* Main 3D Viewport - pristine structure on screen */}
      <main className="w-full h-full">
        <TerraceViewer
          layers={layers}
          activeView={activeView}
          onSelectAsset={handleSelectAsset}
          selectedAssetCode={selectedAsset?.code || null}
        />
      </main>

      {/* Top Floating Bar: Measurements & Single Click UI Toggle */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 max-w-[95vw]">
        {/* Sleek Light Measurement Pill Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121820]/80 backdrop-blur-md border border-white/10 shadow-md text-xs font-sans tracking-wide text-[#cbd5e1]">
          <Compass className="w-3.5 h-3.5 text-[#ffb020] shrink-0" />
          <span className="font-normal text-[11px]"><strong className="font-semibold text-white">45 ft</strong> Front × <strong className="font-semibold text-white">38 ft</strong> Side</span>
          <span className="hidden sm:inline text-[#64748b] text-[10px] border-l border-white/10 pl-2">1,710 sq ft</span>
        </div>

        {/* Solar Output & Estimated Units Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0d2238]/90 backdrop-blur-md border border-[#38bdf8]/40 shadow-md text-xs font-sans tracking-wide text-[#38bdf8]">
          <span className="font-bold text-[11px] text-[#38bdf8]">69 PANELS</span>
          <span className="text-white/80 font-mono text-[10px]">(65 Structure + 4 Geyser Roof)</span>
          <span className="border-l border-[#38bdf8]/30 pl-2 text-white font-semibold text-[11px]">⚡ ~170 Units/Day</span>
        </div>

        {/* Single Click Toggle for Structure Only / Full UI */}
        <button
          onClick={() => setShowUI(!showUI)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-lg border backdrop-blur-md cursor-pointer ${
            showUI
              ? 'bg-[#1e2632]/90 border-[#3a475a] text-[#e9edf3] hover:bg-[#283444]'
              : 'bg-[#ffb020] border-[#ffb020] text-[#10131a] font-bold hover:bg-[#ffa000]'
          }`}
          title="Click to toggle structure-only mode / UI panels"
        >
          {showUI ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hide Controls (Structure Only)</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Show Controls & Layers</span>
            </>
          )}
        </button>

        {/* Quick View Switchers when in Structure Only mode */}
        {!showUI && (
          <div className="hidden md:flex items-center gap-1 bg-[#121820]/80 backdrop-blur-md border border-[#2a3340] rounded-full p-1">
            {(['iso', 'plan', 'entry'] as ViewPreset[]).map((v) => (
              <button
                key={v}
                onClick={() => handleSelectView(v)}
                className={`px-2.5 py-1 text-[10px] font-mono rounded-full uppercase transition-colors ${
                  activeView === v
                    ? 'bg-[#ffb020] text-[#10131a] font-bold'
                    : 'text-[#8b96a6] hover:text-[#e9edf3]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Control Panels & Overlays - shown when showUI is true */}
      {showUI && (
        <LayerPanel
          layers={layers}
          onToggleLayer={toggleLayer}
          activeView={activeView}
          onSelectView={handleSelectView}
        />
      )}

      {/* Help Hint */}
      {showUI && <HelpHint />}
    </div>
  );
}

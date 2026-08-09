import React, { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Maximize2, Compass, Type, Layers } from 'lucide-react';
import { Header } from './components/Header';
import { LayerPanel } from './components/LayerPanel';
import { InfoCard } from './components/InfoCard';
import { HelpHint } from './components/HelpHint';
import { SunPathControl } from './components/SunPathControl';
import { TerraceViewer } from './components/TerraceViewer';
import { AssetInfo, LayerKey, ViewPreset } from './types';

export default function App() {
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    hvac: true,
    solar: true,
    struct: true,
    util: true,
    context: true,
    dims: true,
  });

  const [activeView, setActiveView] = useState<ViewPreset | null>('iso');
  const [selectedAsset, setSelectedAsset] = useState<AssetInfo | null>(null);
  
  // Dynamic Sun & Time-of-Day states
  const [timeOfDay, setTimeOfDay] = useState<number>(12.0); // 6.0 AM to 18.5 PM
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showSunArc, setShowSunArc] = useState<boolean>(true);

  // Toggle state for full UI side panel controls
  const [showUI, setShowUI] = useState<boolean>(false);

  // Toggle state for all 3D text labels, measurements & attached info badges
  const [showText, setShowText] = useState<boolean>(true);

  // Sun Animation Loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimeOfDay((prev) => {
        let next = prev + 0.05;
        if (next > 18.5) next = 6.0;
        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [isPlaying]);

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

  // Keyboard shortcuts for layers (1-6) and text toggle (T) / UI toggle (H)
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

      if (e.key.toLowerCase() === 't') {
        setShowText((prev) => !prev);
      } else if (e.key.toLowerCase() === 'h') {
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
          showText={showText}
          timeOfDay={timeOfDay}
          showSunArc={showSunArc}
          activeView={activeView}
          onSelectAsset={handleSelectAsset}
          selectedAssetCode={selectedAsset?.code || null}
          onTimeChange={(t) => setTimeOfDay(t)}
        />
      </main>

      {/* Top Side Bar: Positioned on Top-Left Side so structure is unobscured */}
      <div className="fixed top-3 left-3 sm:left-4 z-30 flex items-center gap-2 max-w-[95vw] flex-wrap pointer-events-auto">
        {/* Toggle Button for Show Text / Hide Text */}
        <button
          onClick={() => setShowText(!showText)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-lg border backdrop-blur-md cursor-pointer ${
            showText
              ? 'bg-[#ffb020] border-[#ffb020] text-[#10131a] hover:bg-[#ffa000]'
              : 'bg-[#1e2632]/90 border-[#3a475a] text-[#94a3b8] hover:text-white hover:bg-[#283444]'
          }`}
          title="Click to show/hide all measurements, text badges, and callouts"
        >
          <Type className="w-3.5 h-3.5" />
          <span>{showText ? 'Hide Text' : 'Show Text'}</span>
        </button>

        {/* Elegant Side Info Badge (Shown ONLY when showText is true) */}
        {showText && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111722]/90 backdrop-blur-md border border-[#2b384e] shadow-lg text-xs font-sans whitespace-nowrap transition-all">
            <Compass className="w-3.5 h-3.5 text-[#ffb020] shrink-0" />
            <span className="text-[#cbd5e1] text-[11px] font-sans tracking-wide">
              <strong className="font-semibold text-white">45 ft</strong> Front × <strong className="font-semibold text-white">38 ft</strong> Side
            </span>
            <span className="text-[#334155] text-[10px]">|</span>
            <span className="text-[#38bdf8] font-bold text-[11px] tracking-wide">73 Panels (645W)</span>
            <span className="text-[#38bdf8]/80 text-[10px] hidden md:inline">⚡ ~200+ Units/Day</span>
          </div>
        )}

        {/* Toggle Button for Show/Hide Controls & Layers */}
        <button
          onClick={() => setShowUI(!showUI)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-lg border backdrop-blur-md cursor-pointer ${
            showUI
              ? 'bg-[#253040]/90 border-[#475569] text-[#e9edf3] hover:bg-[#324054]'
              : 'bg-[#151c28]/85 border-[#2b384e] text-[#cbd5e1] hover:text-white hover:bg-[#1e2838]'
          }`}
          title="Click to toggle side controls & layers panel"
        >
          <Layers className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span>{showUI ? 'Hide Controls' : 'Show Controls'}</span>
        </button>

        {/* Quick Camera View Preset Buttons */}
        <div className="flex items-center gap-1 bg-[#111722]/85 backdrop-blur-md border border-[#2b384e] rounded-full p-1 shadow-md">
          {(['iso', 'plan', 'entry'] as ViewPreset[]).map((v) => (
            <button
              key={v}
              onClick={() => handleSelectView(v)}
              className={`px-2.5 py-1 text-[10px] font-mono rounded-full uppercase transition-colors cursor-pointer ${
                activeView === v
                  ? 'bg-[#ffb020] text-[#10131a] font-bold'
                  : 'text-[#8b96a6] hover:text-[#e9edf3]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Interactive Sun Path & Shadow Control Panel */}
      <SunPathControl
        timeOfDay={timeOfDay}
        setTimeOfDay={setTimeOfDay}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        showSunArc={showSunArc}
        setShowSunArc={setShowSunArc}
        showText={showText}
      />

      {/* Selected Asset Information Modal Card */}
      {selectedAsset && (
        <InfoCard
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
        />
      )}

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

      {/* Signature Credit Badge Overlay (Shown ONLY when showText is true) */}
      {showText && (
        <div className="fixed bottom-3 right-3 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121820]/90 backdrop-blur-md border border-[#ffb020]/50 shadow-lg text-xs font-sans text-[#ffb020] pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-[#ffb020] animate-pulse"></span>
          <span className="font-semibold text-[11px] tracking-wide text-white">Made by Engr. Shamroze</span>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import {
  Compass,
  Eye,
  EyeOff,
  Move,
  RotateCw,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
  RotateCcw,
  Sliders,
  MapPin,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface MonkeyLadderControlProps {
  showMonkeyLadder: boolean;
  setShowMonkeyLadder: (show: boolean) => void;
  monkeyLadderX: number;
  setMonkeyLadderX: (x: number) => void;
  monkeyLadderZ: number;
  setMonkeyLadderZ: (z: number) => void;
  monkeyLadderRotation: number;
  setMonkeyLadderRotation: (rot: number) => void;
  onClose?: () => void;
}

const PRESETS = [
  { name: 'Walkway 1 Entrance (Col 1-A)', x: -7.90, z: -4.20, rot: 0 },
  { name: 'Walkway 1 Rear (Col 1-E)', x: -7.90, z: 4.20, rot: 180 },
  { name: 'Walkway 2 Mid (Col 4-A)', x: -1.00, z: -4.20, rot: 0 },
  { name: 'Walkway 2 Rear (Col 4-E)', x: -1.00, z: 4.20, rot: 180 },
  { name: 'Walkway 3 Entrance (Col 7-A)', x: 5.50, z: -4.20, rot: 0 },
  { name: 'Walkway 3 Rear (Col 7-E)', x: 5.50, z: 4.20, rot: 180 },
];

export const MonkeyLadderControl: React.FC<MonkeyLadderControlProps> = ({
  showMonkeyLadder,
  setShowMonkeyLadder,
  monkeyLadderX,
  setMonkeyLadderX,
  monkeyLadderZ,
  setMonkeyLadderZ,
  monkeyLadderRotation,
  setMonkeyLadderRotation,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const resetToDefault = () => {
    setMonkeyLadderX(-7.90);
    setMonkeyLadderZ(-4.20);
    setMonkeyLadderRotation(0);
    setShowMonkeyLadder(true);
  };

  const nudge = (dx: number, dz: number) => {
    setMonkeyLadderX(Number((monkeyLadderX + dx).toFixed(2)));
    setMonkeyLadderZ(Number((monkeyLadderZ + dz).toFixed(2)));
  };

  const rotateStep = () => {
    setMonkeyLadderRotation((monkeyLadderRotation + 90) % 360);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:right-6 z-40 max-w-sm w-full bg-[#0f172a]/95 border border-[#22c55e]/50 backdrop-blur-xl rounded-2xl p-3.5 shadow-2xl text-white font-sans transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-[#22c55e]/20 border border-[#22c55e]/40 text-[#22c55e]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight text-white uppercase font-mono flex items-center gap-1.5">
              Monkey Ladder Editor
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30 font-semibold">
                Editable
              </span>
            </h3>
            <p className="text-[10px] text-[#94a3b8]">
              Reposition PV cleaning ladder anywhere on roof
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Quick Visibility Toggle */}
          <button
            onClick={() => setShowMonkeyLadder(!showMonkeyLadder)}
            className={`p-1.5 rounded-lg text-[10px] font-mono font-semibold flex items-center transition-all cursor-pointer border ${
              showMonkeyLadder
                ? 'bg-[#22c55e] border-[#22c55e] text-[#0f172a]'
                : 'bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:text-white'
            }`}
            title={showMonkeyLadder ? "Click to Hide Ladder" : "Click to Show Ladder"}
          >
            {showMonkeyLadder ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-white transition-all cursor-pointer"
            title={isMinimized ? "Expand Panel" : "Minimize Panel"}
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-red-500/20 border border-[#334155] hover:border-red-500/40 text-[#94a3b8] hover:text-red-400 transition-all cursor-pointer"
              title="Close Control Panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Controls Content */}
      {!isMinimized && (
        <div className="mt-3 space-y-3 text-xs">
          {/* Status & Position Display */}
          <div className="bg-[#1e293b]/70 p-2.5 rounded-xl border border-[#334155]/60 flex items-center justify-between">
            <div>
              <div className="text-[9.5px] uppercase font-mono text-[#94a3b8]">Current Position</div>
              <div className="text-xs font-mono font-bold text-[#22c55e] mt-0.5">
                X: {monkeyLadderX.toFixed(2)}m · Z: {monkeyLadderZ.toFixed(2)}m · {monkeyLadderRotation}°
              </div>
            </div>
            <button
              onClick={() => setShowMonkeyLadder(!showMonkeyLadder)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border cursor-pointer transition-all ${
                showMonkeyLadder
                  ? 'bg-[#22c55e]/20 border-[#22c55e]/50 text-[#22c55e]'
                  : 'bg-red-500/20 border-red-500/40 text-red-400'
              }`}
            >
              {showMonkeyLadder ? 'Ladder VISIBLE' : 'Ladder HIDDEN'}
            </button>
          </div>

          {/* Quick Attachment Presets */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#22c55e]" />
              Quick Attachment Column Presets
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((preset) => {
                const isSelected =
                  Math.abs(monkeyLadderX - preset.x) < 0.1 &&
                  Math.abs(monkeyLadderZ - preset.z) < 0.1;
                return (
                  <button
                    key={preset.name}
                    onClick={() => {
                      setMonkeyLadderX(preset.x);
                      setMonkeyLadderZ(preset.z);
                      setMonkeyLadderRotation(preset.rot);
                      setShowMonkeyLadder(true);
                    }}
                    className={`p-1.5 rounded-lg text-[10px] font-sans text-left transition-all cursor-pointer border truncate ${
                      isSelected
                        ? 'bg-[#22c55e] border-[#22c55e] text-[#0f172a] font-bold shadow-md'
                        : 'bg-[#1e293b]/80 border-[#334155] text-[#cbd5e1] hover:border-[#22c55e]/50 hover:bg-[#22c55e]/10'
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliders for Precision Moving */}
          <div className="space-y-2 bg-[#1e293b]/40 p-2.5 rounded-xl border border-[#334155]/40">
            {/* X-Axis Slider */}
            <div>
              <div className="flex justify-between items-center text-[10.5px] mb-1">
                <span className="text-[#94a3b8] font-mono">X Position (East-West):</span>
                <span className="font-mono text-[#38bdf8] font-bold">{monkeyLadderX.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min="-8.50"
                max="6.50"
                step="0.10"
                value={monkeyLadderX}
                onChange={(e) => setMonkeyLadderX(parseFloat(e.target.value))}
                className="w-full accent-[#22c55e] bg-[#0f172a] h-1.5 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[8.5px] text-[#64748b] font-mono mt-0.5">
                <span>Col 1 (-8.3m)</span>
                <span>Col 4 (-1.0m)</span>
                <span>Col 8 (+5.5m)</span>
              </div>
            </div>

            {/* Z-Axis Slider */}
            <div>
              <div className="flex justify-between items-center text-[10.5px] mb-1">
                <span className="text-[#94a3b8] font-mono">Z Position (North-South):</span>
                <span className="font-mono text-[#38bdf8] font-bold">{monkeyLadderZ.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min="-5.20"
                max="5.20"
                step="0.10"
                value={monkeyLadderZ}
                onChange={(e) => setMonkeyLadderZ(parseFloat(e.target.value))}
                className="w-full accent-[#22c55e] bg-[#0f172a] h-1.5 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[8.5px] text-[#64748b] font-mono mt-0.5">
                <span>Row A (-4.6m)</span>
                <span>Row C (0m)</span>
                <span>Row E (+4.6m)</span>
              </div>
            </div>

            {/* Rotation Controls */}
            <div className="pt-1">
              <div className="flex justify-between items-center text-[10.5px] mb-1">
                <span className="text-[#94a3b8] font-mono">Ladder Orientation:</span>
                <span className="font-mono text-[#ffb020] font-bold">{monkeyLadderRotation}°</span>
              </div>
              <div className="flex items-center gap-1">
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => setMonkeyLadderRotation(deg)}
                    className={`flex-1 py-1 text-[10px] font-mono rounded-lg border transition-all cursor-pointer ${
                      monkeyLadderRotation === deg
                        ? 'bg-[#ffb020] border-[#ffb020] text-[#0f172a] font-bold'
                        : 'bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Directional Nudge Pad */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => nudge(-0.25, 0)}
                className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#22c55e]/20 border border-[#334155] hover:border-[#22c55e]/50 text-[#cbd5e1] hover:text-[#22c55e] transition-all cursor-pointer"
                title="Move West (-X)"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => nudge(0.25, 0)}
                className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#22c55e]/20 border border-[#334155] hover:border-[#22c55e]/50 text-[#cbd5e1] hover:text-[#22c55e] transition-all cursor-pointer"
                title="Move East (+X)"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => nudge(0, -0.25)}
                className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#22c55e]/20 border border-[#334155] hover:border-[#22c55e]/50 text-[#cbd5e1] hover:text-[#22c55e] transition-all cursor-pointer"
                title="Move North (-Z)"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => nudge(0, 0.25)}
                className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#22c55e]/20 border border-[#334155] hover:border-[#22c55e]/50 text-[#cbd5e1] hover:text-[#22c55e] transition-all cursor-pointer"
                title="Move South (+Z)"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={rotateStep}
                className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#ffb020]/20 border border-[#334155] hover:border-[#ffb020]/50 text-[#cbd5e1] hover:text-[#ffb020] transition-all cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={resetToDefault}
              className="px-2 py-1.5 rounded-lg bg-[#1e293b] hover:bg-slate-700 border border-[#334155] text-[10px] text-[#94a3b8] hover:text-white flex items-center gap-1 transition-all cursor-pointer shrink-0"
              title="Reset Position to Default"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

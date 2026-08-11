import React, { useState } from 'react';
import { Grid, Eye, EyeOff, ChevronDown, ChevronUp, Compass, ShieldCheck } from 'lucide-react';

interface ColumnPlanCardProps {
  showColumnPlan: boolean;
  setShowColumnPlan: (show: boolean) => void;
  columnFocusMode?: boolean;
  onToggleColumnFocusMode?: () => void;
  activeView: string | null;
  onSelectColumnPlanView: () => void;
}

export const ColumnPlanCard: React.FC<ColumnPlanCardProps> = ({
  showColumnPlan,
  setShowColumnPlan,
  columnFocusMode = false,
  onToggleColumnFocusMode,
  activeView,
  onSelectColumnPlanView,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  return (
    <div className="fixed bottom-4 left-4 z-20 max-w-xs w-full bg-[#0f172a]/95 border border-[#38bdf8]/40 backdrop-blur-xl rounded-2xl p-3 shadow-2xl text-white font-sans transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#38bdf8]/15 border border-[#38bdf8]/30 text-[#38bdf8]">
            <Grid className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight text-white uppercase font-mono flex items-center gap-1.5">
              Column Plan
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#0284c7]/20 border border-[#0284c7]/40 text-[#38bdf8]">
                8×5 Grid
              </span>
            </h3>
            <p className="text-[10px] text-[#94a3b8]">
              40 Columns · Twin Pairs under Walkways
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowColumnPlan(!showColumnPlan)}
            className={`p-1.5 rounded-lg text-[10px] font-mono font-semibold flex items-center transition-all cursor-pointer border ${
              showColumnPlan
                ? 'bg-[#38bdf8] border-[#38bdf8] text-[#0f172a]'
                : 'bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:text-white'
            }`}
            title="Toggle Grid Overlay Lines"
          >
            {showColumnPlan ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-white transition-all cursor-pointer"
            title={isMinimized ? "Expand Details" : "Minimize Details"}
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {!isMinimized && (
        <div className="mt-2.5 pt-2 border-t border-[#1e293b] space-y-2 text-xs">
          {/* Boss Column Focus Mode Quick Button */}
          {onToggleColumnFocusMode && (
            <button
              onClick={onToggleColumnFocusMode}
              className={`w-full py-2 px-2.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer border shadow-lg ${
                columnFocusMode
                  ? 'bg-[#38bdf8] text-[#0f172a] border-[#38bdf8] shadow-[0_0_15px_rgba(56,189,248,0.5)] font-extrabold'
                  : 'bg-gradient-to-r from-[#0284c7]/30 to-[#38bdf8]/20 hover:from-[#0284c7]/50 hover:to-[#38bdf8]/40 text-[#38bdf8] border-[#38bdf8]/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#ffb020] shrink-0" />
              <span>{columnFocusMode ? 'Columns Focus ACTIVE (Click to Exit)' : 'Boss Mode: Show Columns Only'}</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
            <div className="bg-[#1e293b]/70 p-2 rounded-xl border border-[#334155]/60">
              <div className="text-[#94a3b8] text-[9px] uppercase font-mono">Column Total</div>
              <div className="text-[#38bdf8] font-bold font-mono text-xs mt-0.5">
                40 Steel Posts
              </div>
            </div>
            <div className="bg-[#1e293b]/70 p-2 rounded-xl border border-[#334155]/60">
              <div className="text-[#94a3b8] text-[9px] uppercase font-mono">Walkway Placement</div>
              <div className="text-[#ffb020] font-bold font-mono text-xs mt-0.5">
                24" Twin Pairs
              </div>
            </div>
          </div>

          <div className="bg-[#1e293b]/40 p-2 rounded-xl border border-[#334155]/40 text-[10px] space-y-1">
            <div className="flex justify-between items-center text-[#e2e8f0]">
              <span className="text-[#94a3b8]">X Grid Lines (1–8):</span>
              <span className="font-mono text-[#38bdf8]">Cols 1 to 8</span>
            </div>
            <div className="flex justify-between items-center text-[#e2e8f0]">
              <span className="text-[#94a3b8]">Z Grid Lines (A–E):</span>
              <span className="font-mono text-[#38bdf8]">Rows A to E</span>
            </div>
          </div>

          <button
            onClick={onSelectColumnPlanView}
            className={`w-full py-1.5 px-2.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer border shadow-md ${
              activeView === 'plan'
                ? 'bg-[#0284c7] text-white border-[#38bdf8]'
                : 'bg-[#1e293b] hover:bg-[#38bdf8]/20 text-[#38bdf8] border-[#38bdf8]/40'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>2D Top-Down CAD Plan View</span>
          </button>
        </div>
      )}
    </div>
  );
};

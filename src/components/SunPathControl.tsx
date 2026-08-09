import React from 'react';
import { Sun, Moon, Play, Pause, Sunrise, Sunset, Clock, Sparkles } from 'lucide-react';

interface SunPathControlProps {
  timeOfDay: number; // 6.0 to 19.0
  setTimeOfDay: (time: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  showSunArc: boolean;
  setShowSunArc: (show: boolean) => void;
  showText?: boolean;
}

export const SunPathControl: React.FC<SunPathControlProps> = ({
  timeOfDay,
  setTimeOfDay,
  isPlaying,
  setIsPlaying,
  showSunArc,
  setShowSunArc,
  showText = true,
}) => {
  // Format hours float to standard time string (e.g. 13.5 -> "01:30 PM")
  const formatTime = (time: number) => {
    const hours = Math.floor(time);
    const minutes = Math.floor((time - hours) * 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    const formattedHours = displayHours < 10 ? `0${displayHours}` : displayHours;
    return `${formattedHours}:${formattedMinutes} ${period}`;
  };

  // Calculate approximate solar angle for display
  const getSunStats = (t: number) => {
    const norm = Math.max(0, Math.min(1, (t - 6) / 12));
    const angleRad = Math.PI * norm;
    const elevationDeg = Math.round(Math.sin(angleRad) * 72);
    const azimuthDeg = Math.round(90 + norm * 180); // 90 (East) -> 180 (South) -> 270 (West)
    
    let phase = 'Morning Light';
    let shadowDesc = 'Long western shadows';
    
    if (t < 7.5) {
      phase = 'Sunrise / Low Angle';
      shadowDesc = 'Dramatically long shadows stretching west across deck';
    } else if (t < 11.0) {
      phase = 'Mid-Morning Sun';
      shadowDesc = 'Medium angled shadows under girders';
    } else if (t < 13.5) {
      phase = 'Solar Noon / Peak Overhead';
      shadowDesc = 'Short vertical shadows directly under 73 solar panels';
    } else if (t < 16.5) {
      phase = 'Mid-Afternoon Sun';
      shadowDesc = 'Angled shadows shifting toward eastern terrace wall';
    } else if (t < 18.5) {
      phase = 'Golden Hour / Sunset';
      shadowDesc = 'Warm low-angle amber shadows stretching east';
    } else {
      phase = 'Dusk / Twilight';
      shadowDesc = 'Soft ambient twilight reflection';
    }

    return { elevationDeg, azimuthDeg, phase, shadowDesc };
  };

  const stats = getSunStats(timeOfDay);

  const presets = [
    { label: 'Sunrise', time: 7.0, icon: Sunrise },
    { label: 'Morning', time: 9.5, icon: Sun },
    { label: 'Noon', time: 12.0, icon: Sparkles },
    { label: 'Afternoon', time: 15.0, icon: Sun },
    { label: 'Sunset', time: 18.0, icon: Sunset },
  ];

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 w-[92vw] max-w-2xl bg-[#0f172a]/90 backdrop-blur-xl border border-[#334155]/80 shadow-2xl rounded-2xl p-3 text-white pointer-events-auto transition-all">
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#ffb020]/15 border border-[#ffb020]/40 flex items-center justify-center text-[#ffb020]">
            <Sun className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">DYNAMIC SUN PATH & SHADOWS</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#38bdf8]/15 border border-[#38bdf8]/30 text-[#38bdf8]">
                {formatTime(timeOfDay)}
              </span>
            </div>
            {showText && (
              <p className="text-[10px] text-[#94a3b8] font-sans truncate max-w-sm">
                {stats.phase} · {stats.shadowDesc}
              </p>
            )}
          </div>
        </div>

        {/* Right side controls: Play/Pause & Arc toggle */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isPlaying
                ? 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
                : 'bg-[#ffb020] text-[#0f172a] hover:bg-[#ffa000] font-bold'
            }`}
            title={isPlaying ? 'Pause Sun Movement' : 'Play Continuous Sun Path Animation'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Animate Sun'}</span>
          </button>

          <button
            onClick={() => setShowSunArc(!showSunArc)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
              showSunArc
                ? 'bg-[#38bdf8]/20 border-[#38bdf8]/50 text-[#38bdf8]'
                : 'bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:text-white'
            }`}
            title="Toggle 3D Sun Path Arc trajectory overlay in sky"
          >
            3D Arc: <strong className="ml-0.5">{showSunArc ? 'ON' : 'OFF'}</strong>
          </button>
        </div>
      </div>

      {/* Time Slider & Presets Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Slider */}
        <div className="flex-1 flex items-center gap-2 bg-[#1e293b]/60 px-3 py-1.5 rounded-xl border border-[#334155]/50">
          <Clock className="w-3.5 h-3.5 text-[#ffb020] shrink-0" />
          <span className="text-[10px] font-mono text-[#94a3b8] shrink-0">06:00</span>
          <input
            type="range"
            min="6.0"
            max="18.5"
            step="0.05"
            value={timeOfDay}
            onChange={(e) => {
              setIsPlaying(false);
              setTimeOfDay(parseFloat(e.target.value));
            }}
            className="w-full accent-[#ffb020] cursor-pointer h-1.5 bg-[#334155] rounded-lg"
          />
          <span className="text-[10px] font-mono text-[#94a3b8] shrink-0">18:30</span>
        </div>

        {/* Preset Time Buttons */}
        <div className="flex items-center gap-1 justify-between sm:justify-start">
          {presets.map((p) => {
            const Icon = p.icon;
            const isActive = Math.abs(timeOfDay - p.time) < 0.4;
            return (
              <button
                key={p.label}
                onClick={() => {
                  setIsPlaying(false);
                  setTimeOfDay(p.time);
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#ffb020] text-[#0f172a] font-bold shadow-md'
                    : 'bg-[#1e293b] text-[#cbd5e1] hover:bg-[#334155] hover:text-white border border-[#334155]/60'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Solar Stats Telemetry Strip */}
      {showText && (
        <div className="mt-2 pt-1.5 border-t border-[#1e293b]/60 flex items-center justify-between text-[10px] text-[#94a3b8] font-mono">
          <div>
            Sun Alt: <strong className="text-white">{stats.elevationDeg}°</strong> · Azimuth: <strong className="text-white">{stats.azimuthDeg}°</strong>
          </div>
          <div className="hidden sm:block text-[#ffb020]/90 font-sans italic">
            *Watch real-time live shadow patterns cast by 40 girders & 73 solar panels onto terrace deck
          </div>
        </div>
      )}
    </div>
  );
};

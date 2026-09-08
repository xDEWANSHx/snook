import React, { useState, useEffect } from 'react';
import { RotateCcw, RotateCw, Flag, History, Settings, ShieldCheck, Radio, Palette } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface TopBarProps {
  matchStartTime: number;
  turnCount: number;
  roomCode: string;
  realtimeStatus: 'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED';
  canUndo: boolean;
  canRedo: boolean;
  theme: 'felt' | 'chalk';
  onToggleTheme: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onEndGameClick: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onNewGameClick: () => void;
  onOpenRoom: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  matchStartTime,
  turnCount,
  roomCode,
  realtimeStatus,
  canUndo,
  canRedo,
  theme,
  onToggleTheme,
  onUndo,
  onRedo,
  onEndGameClick,
  onOpenHistory,
  onOpenSettings,
  onNewGameClick,
  onOpenRoom,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const isSupabaseReady = isSupabaseConfigured();

  useEffect(() => {
    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((Date.now() - matchStartTime) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [matchStartTime]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const isFelt = theme === 'felt';

  return (
    <header
      className={`sticky top-0 z-30 backdrop-blur-md border-b px-2.5 py-2 sm:px-4 sm:py-2.5 transition-all shadow-md ${
        isFelt
          ? 'bg-[#071d16]/90 border-emerald-900/60 text-stone-100'
          : 'bg-[#FAF8F5]/95 border-stone-200/80 text-stone-900'
      }`}
    >
      <div className="max-w-xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Left: Branding & Timer & Room Code */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onNewGameClick}
            title="Start New Match (Select Players)"
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition border ${
              isFelt
                ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border-emerald-800/80'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-200'
            }`}
          >
            <span className="text-sm sm:text-base leading-none">🎱</span>
            <span className="font-black tracking-tight hidden xs:inline">NEW</span>
          </button>

          {/* Room Live Sync Badge */}
          <button
            onClick={onOpenRoom}
            title="Share Room link with other phones"
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-bold transition border shadow-sm ${
              realtimeStatus === 'SUBSCRIBED'
                ? 'bg-emerald-900/80 text-emerald-300 border-emerald-600 hover:bg-emerald-800'
                : 'bg-amber-950/70 text-amber-300 border-amber-600 hover:bg-amber-900'
            }`}
          >
            <Radio className={`w-3 h-3 ${realtimeStatus === 'SUBSCRIBED' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            <span>{roomCode}</span>
          </button>

          {/* Timer */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-stone-950 text-stone-100 text-xs font-mono font-bold shadow-inner border border-stone-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          <span className="text-[11px] font-semibold text-stone-400 hidden sm:inline">
            Turn {turnCount}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Theme Switcher Toggle */}
          <button
            onClick={onToggleTheme}
            title={`Switch Background Theme (Current: ${isFelt ? 'Championship Felt' : 'Warm Chalk'})`}
            className={`p-1.5 sm:p-2 rounded-xl flex items-center justify-center transition-all border shadow-sm ${
              isFelt
                ? 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 border-emerald-700/60'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
            }`}
            aria-label="Toggle Theme"
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* Undo Button with prompt indicator */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo Last Action"
            className={`p-1.5 sm:p-2 rounded-xl flex items-center justify-center transition-all ${
              canUndo
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 active:scale-95 shadow-sm border border-amber-500/50 font-semibold'
                : 'bg-stone-800/30 text-stone-500 cursor-not-allowed border border-transparent'
            }`}
            aria-label="Undo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Redo Button */}
          {canRedo && (
            <button
              onClick={onRedo}
              title="Redo Action"
              className="p-1.5 sm:p-2 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all border border-amber-500/40 shadow-sm"
              aria-label="Redo"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}

          {/* History Drawer Toggle */}
          <button
            onClick={onOpenHistory}
            title="Match History"
            className={`p-1.5 sm:p-2 rounded-xl transition border shadow-sm ${
              isFelt
                ? 'bg-stone-900/80 hover:bg-stone-800 text-stone-200 border-stone-700'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
            }`}
            aria-label="Past Matches"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            title={isSupabaseReady ? 'Supabase Connected' : 'Setup Supabase Cloud Sync'}
            className={`p-1.5 sm:p-2 rounded-xl transition active:scale-95 border shadow-sm ${
              isSupabaseReady
                ? 'bg-emerald-950 text-emerald-400 border-emerald-600 hover:bg-emerald-900'
                : isFelt
                ? 'bg-stone-900 text-stone-400 border-stone-700 hover:bg-stone-800'
                : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
            }`}
            aria-label="Settings"
          >
            {isSupabaseReady ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <Settings className="w-4 h-4" />
            )}
          </button>

          {/* End Game Button */}
          <button
            onClick={onEndGameClick}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black transition shadow-sm border border-rose-700"
          >
            <Flag className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">End Frame</span>
          </button>
        </div>
      </div>
    </header>
  );
};

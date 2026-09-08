import React, { useState, useEffect } from 'react';
import { RotateCcw, RotateCw, Flag, History, Settings, ShieldCheck } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface TopBarProps {
  matchStartTime: number;
  turnCount: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onEndGameClick: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onNewGameClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  matchStartTime,
  turnCount,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onEndGameClick,
  onOpenHistory,
  onOpenSettings,
  onNewGameClick,
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

  return (
    <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200/80 px-3 py-2 sm:px-4 sm:py-2.5 transition-all shadow-sm">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Branding & Timer/Status */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onNewGameClick}
            title="Start New Match"
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition border border-stone-200"
          >
            <span className="text-base leading-none">🎱</span>
            <span className="font-extrabold tracking-tight hidden xs:inline">SNOOK</span>
          </button>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-stone-900 text-stone-100 text-xs font-mono font-semibold shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{formatTime(elapsedSeconds)}</span>
          </div>

          <span className="text-[11px] font-medium text-stone-400 hidden sm:inline">
            Turn {turnCount}
          </span>
        </div>

        {/* Right: Actions (Undo, Redo, History, Settings, End Game) */}
        <div className="flex items-center gap-1.5">
          {/* Undo Button */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo Last Action"
            className={`p-2 rounded-xl flex items-center justify-center transition-all ${
              canUndo
                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 active:scale-95 shadow-sm border border-amber-300/60 font-semibold'
                : 'bg-stone-100 text-stone-300 cursor-not-allowed border border-transparent'
            }`}
            aria-label="Undo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Redo Button (shown if canRedo) */}
          {canRedo && (
            <button
              onClick={onRedo}
              title="Redo Action"
              className="p-2 rounded-xl flex items-center justify-center bg-amber-50 text-amber-800 hover:bg-amber-100 active:scale-95 transition-all border border-amber-200 shadow-sm"
              aria-label="Redo"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}

          {/* History Drawer Toggle */}
          <button
            onClick={onOpenHistory}
            title="Match History"
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 transition border border-stone-200 shadow-sm"
            aria-label="Past Matches"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Config / Supabase Status */}
          <button
            onClick={onOpenSettings}
            title={isSupabaseReady ? 'Supabase Connected' : 'Setup Supabase Cloud Sync'}
            className={`p-2 rounded-xl transition active:scale-95 border shadow-sm ${
              isSupabaseReady
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
            }`}
            aria-label="Settings"
          >
            {isSupabaseReady ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <Settings className="w-4 h-4" />
            )}
          </button>

          {/* End Game Button */}
          <button
            onClick={onEndGameClick}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition shadow-sm border border-rose-700"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>End Frame</span>
          </button>
        </div>
      </div>
    </header>
  );
};

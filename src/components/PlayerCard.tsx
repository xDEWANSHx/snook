import React from 'react';
import type { Player } from '../types';
import { Flame } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  isActive: boolean;
  playerIndex: number;
  totalPlayers: number;
  theme?: 'felt' | 'chalk';
  onSelectPlayer: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isActive,
  playerIndex,
  totalPlayers,
  theme = 'felt',
  onSelectPlayer,
}) => {
  const isCompact = totalPlayers >= 5;
  const isFelt = theme === 'felt';

  return (
    <div
      onClick={onSelectPlayer}
      className={`relative rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden ${
        isCompact ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3.5'
      } ${
        isFelt
          ? isActive
            ? 'bg-gradient-to-b from-[#0f2e24] via-[#0d2a21] to-[#0a231b] border-2 border-emerald-400 shadow-[0_4px_25px_rgba(16,185,129,0.25)] scale-[1.01] ring-4 ring-emerald-500/20'
            : 'bg-[#0a221a]/85 backdrop-blur-sm border border-emerald-900/60 hover:border-emerald-700/60 hover:bg-[#0d2c21] shadow-md opacity-90'
          : isActive
          ? 'bg-gradient-to-b from-white via-white to-stone-50 border-2 border-emerald-600 shadow-card-glow-active scale-[1.01] ring-4 ring-emerald-500/20'
          : 'bg-white/90 backdrop-blur-sm border border-stone-300/80 hover:border-stone-400 hover:bg-white shadow-sm opacity-90'
      }`}
    >
      {/* Decorative Brass Table Rivet in corner */}
      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-300 border border-amber-600/60 shadow-xs pointer-events-none opacity-60" />

      {/* Top Banner: Active Badge & Name */}
      <div className="flex items-center justify-between gap-1.5 mb-1 pr-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              isActive ? 'bg-emerald-400 animate-ping' : isFelt ? 'bg-emerald-800' : 'bg-stone-300'
            }`}
          />
          <h3
            className={`font-black truncate ${
              isCompact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
            } ${
              isFelt
                ? isActive ? 'text-white font-extrabold' : 'text-emerald-100/90'
                : isActive ? 'text-stone-900 font-extrabold' : 'text-stone-700'
            }`}
          >
            {player.name}
          </h3>
        </div>

        {isActive ? (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-xs border ${
              isFelt
                ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500/50'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300/70'
            }`}
          >
            {/* Realistic Snooker Cue SVG Icon */}
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor">
              <line x1="2" y1="22" x2="16" y2="8" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="16" y1="8" x2="19" y2="5" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
              <circle cx="20.5" cy="3.5" r="1.5" fill="#38bdf8" />
            </svg>
            <span>ON TABLE</span>
          </span>
        ) : (
          <span className={`text-[10px] font-bold font-mono ${isFelt ? 'text-emerald-500/70' : 'text-stone-400'}`}>
            P{playerIndex + 1}
          </span>
        )}
      </div>

      {/* Scores Display Area */}
      <div className="flex items-baseline justify-between pt-0.5">
        {/* Total Score */}
        <div className="flex flex-col">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${isFelt ? 'text-emerald-400/80' : 'text-stone-500'}`}>
            Total Points
          </span>
          <span
            className={`font-mono font-black tracking-tight ${
              isCompact
                ? isActive
                  ? isFelt ? 'text-3xl sm:text-4xl text-white' : 'text-3xl sm:text-4xl text-stone-900'
                  : isFelt ? 'text-xl sm:text-2xl text-emerald-100/85' : 'text-xl sm:text-2xl text-stone-700'
                : isActive
                ? isFelt ? 'text-4xl sm:text-5xl text-white' : 'text-4xl sm:text-5xl text-stone-900'
                : isFelt ? 'text-2xl sm:text-3xl text-emerald-100/85' : 'text-2xl sm:text-3xl text-stone-700'
            } leading-none`}
          >
            {player.score}
          </span>
        </div>

        {/* Current Break Score */}
        <div className="flex flex-col items-end">
          <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 ${isFelt ? 'text-amber-400' : 'text-amber-800'}`}>
            {player.currentBreak > 0 && <Flame className="w-2.5 h-2.5 text-amber-500" />}
            Break
          </span>
          <div
            className={`px-2 py-0.5 rounded-md font-mono font-black transition-all ${
              player.currentBreak > 0
                ? isFelt
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm text-base sm:text-lg'
                  : 'bg-amber-100 text-amber-950 border border-amber-300 shadow-sm text-base sm:text-lg'
                : isFelt
                ? 'bg-black/30 text-emerald-400/50 text-xs'
                : 'bg-stone-100 text-stone-400 text-xs'
            }`}
          >
            {player.currentBreak > 0 ? `+${player.currentBreak}` : '0'}
          </div>
        </div>
      </div>

      {/* Decorative snooker table felt rail stripe for active player */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500" />
      )}
    </div>
  );
};

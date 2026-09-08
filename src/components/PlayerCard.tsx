import React from 'react';
import type { Player } from '../types';
import { Target, Flame } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  isActive: boolean;
  playerIndex: number;
  totalPlayers: number;
  onSelectPlayer: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isActive,
  playerIndex,
  totalPlayers,
  onSelectPlayer,
}) => {
  return (
    <div
      onClick={onSelectPlayer}
      className={`relative rounded-2xl p-3 sm:p-4 transition-all duration-200 cursor-pointer overflow-hidden ${
        isActive
          ? 'bg-gradient-to-b from-white to-stone-50 border-2 border-emerald-600 shadow-card-glow-active scale-[1.02] ring-4 ring-emerald-500/20'
          : 'bg-white/80 border border-stone-200 hover:border-stone-300 hover:bg-white shadow-sm opacity-90'
      } ${
        totalPlayers === 3 && playerIndex === 0 && isActive ? 'col-span-full' : ''
      }`}
    >
      {/* Top Banner: Active Badge & Name */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              isActive ? 'bg-emerald-500 animate-ping' : 'bg-stone-300'
            }`}
          />
          <h3
            className={`font-bold truncate text-sm sm:text-base ${
              isActive ? 'text-stone-900 font-extrabold' : 'text-stone-600'
            }`}
          >
            {player.name}
          </h3>
        </div>

        {isActive ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
            <Target className="w-3 h-3 text-emerald-600 animate-spin-slow" />
            Shooting
          </span>
        ) : (
          <span className="text-[11px] text-stone-400 font-medium">P{playerIndex + 1}</span>
        )}
      </div>

      {/* Scores Display Area */}
      <div className="flex items-baseline justify-between pt-1">
        {/* Total Score */}
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
            Total Points
          </span>
          <span
            className={`font-mono font-black tracking-tight ${
              isActive
                ? 'text-4xl sm:text-5xl text-stone-900 leading-none drop-shadow-sm'
                : 'text-2xl sm:text-3xl text-stone-700 leading-none'
            }`}
          >
            {player.score}
          </span>
        </div>

        {/* Current Break Score */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-0.5">
            {player.currentBreak > 0 && <Flame className="w-2.5 h-2.5 text-amber-500" />}
            Break
          </span>
          <div
            className={`px-2.5 py-0.5 rounded-lg font-mono font-black transition-all ${
              player.currentBreak > 0
                ? 'bg-amber-100/90 text-amber-900 border border-amber-300 shadow-sm text-lg sm:text-xl'
                : 'bg-stone-100 text-stone-400 text-sm'
            }`}
          >
            {player.currentBreak > 0 ? `+${player.currentBreak}` : '0'}
          </div>
        </div>
      </div>

      {/* Decorative pool felt accent stripe for active player */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
      )}
    </div>
  );
};

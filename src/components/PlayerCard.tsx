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
  const isCompact = totalPlayers >= 5;

  return (
    <div
      onClick={onSelectPlayer}
      className={`relative rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden ${
        isCompact ? 'p-2 sm:p-3' : 'p-3 sm:p-4'
      } ${
        isActive
          ? 'bg-gradient-to-b from-white to-stone-50 border-2 border-emerald-600 shadow-card-glow-active scale-[1.01] ring-4 ring-emerald-500/20'
          : 'bg-white/85 backdrop-blur-sm border border-stone-200/90 hover:border-stone-300 hover:bg-white shadow-sm opacity-90'
      }`}
    >
      {/* Top Banner: Active Badge & Name */}
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              isActive ? 'bg-emerald-500 animate-ping' : 'bg-stone-300'
            }`}
          />
          <h3
            className={`font-black truncate ${
              isCompact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
            } ${isActive ? 'text-stone-900 font-extrabold' : 'text-stone-700'}`}
          >
            {player.name}
          </h3>
        </div>

        {isActive ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase tracking-wider shadow-sm">
            <Target className="w-2.5 h-2.5 text-emerald-600" />
            Shooting
          </span>
        ) : (
          <span className="text-[10px] text-stone-400 font-semibold font-mono">P{playerIndex + 1}</span>
        )}
      </div>

      {/* Scores Display Area */}
      <div className="flex items-baseline justify-between pt-0.5">
        {/* Total Score */}
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500">
            Points
          </span>
          <span
            className={`font-mono font-black tracking-tight ${
              isCompact
                ? isActive ? 'text-3xl sm:text-4xl text-stone-900' : 'text-xl sm:text-2xl text-stone-700'
                : isActive ? 'text-4xl sm:text-5xl text-stone-900' : 'text-2xl sm:text-3xl text-stone-700'
            } leading-none`}
          >
            {player.score}
          </span>
        </div>

        {/* Current Break Score */}
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-0.5">
            {player.currentBreak > 0 && <Flame className="w-2.5 h-2.5 text-amber-500" />}
            Break
          </span>
          <div
            className={`px-2 py-0.5 rounded-md font-mono font-black transition-all ${
              player.currentBreak > 0
                ? 'bg-amber-100/90 text-amber-900 border border-amber-300 shadow-sm text-base sm:text-lg'
                : 'bg-stone-100 text-stone-400 text-xs'
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

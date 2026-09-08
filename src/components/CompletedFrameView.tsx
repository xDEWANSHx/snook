import React from 'react';
import type { Player } from '../types';
import { calculateRanks, formatRankLabel } from '../utils/ranking';
import { Trophy, PlusCircle, History } from 'lucide-react';

interface CompletedFrameViewProps {
  players: Player[];
  roomCode: string;
  theme?: 'felt' | 'chalk';
  onStartNewFrame: () => void;
  onOpenHistory: () => void;
}

export const CompletedFrameView: React.FC<CompletedFrameViewProps> = ({
  players,
  roomCode,
  theme = 'felt',
  onStartNewFrame,
  onOpenHistory,
}) => {
  const isFelt = theme === 'felt';
  const ranks = calculateRanks(players);
  const winners = ranks.filter(r => r.rank === 1);
  const isTie = winners.length > 1;

  return (
    <section
      className={`w-full rounded-3xl p-5 sm:p-6 shadow-2xl border flex flex-col gap-5 text-center animate-fade-in ${
        isFelt
          ? 'bg-gradient-to-b from-[#0a231b] via-[#071d16] to-[#04120e] border-emerald-500/40 text-stone-100'
          : 'bg-[#FAF8F5] border-stone-300 text-stone-900'
      }`}
    >
      {/* Top Banner: Frame Complete */}
      <div className="flex flex-col items-center gap-2">
        <div className="inline-flex p-3 rounded-2xl bg-amber-400/20 text-amber-400 border border-amber-400/40 shadow-sm">
          <Trophy className="w-8 h-8 fill-amber-400 text-amber-300" />
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-stone-800/80 text-amber-300 border border-amber-500/40">
            Table #{roomCode}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600/90 text-white">
            Frame Complete
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
          {isTie ? 'Joint Victory Tie!' : `${winners.map(w => w.playerName).join(' & ')} Wins!`}
        </h2>
        <p className="text-xs text-stone-400 max-w-xs">
          This frame has ended. Scores are locked. To continue playing, start a new frame below.
        </p>
      </div>

      {/* Standings List */}
      <div className="flex flex-col gap-2 text-left">
        <span className="text-xs font-black uppercase tracking-wider text-stone-400 px-1">
          Final Standings
        </span>
        {ranks.map((player) => {
          const isFirst = player.rank === 1;
          const rankLabel = formatRankLabel(player.rank, player.isTie);

          return (
            <div
              key={player.playerId}
              className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition ${
                isFirst
                  ? isFelt
                    ? 'bg-gradient-to-r from-amber-500/20 via-emerald-950/40 to-amber-500/10 border-amber-400/60 shadow-md ring-1 ring-amber-400/30'
                    : 'bg-amber-50/90 border-amber-300 shadow-md ring-1 ring-amber-300'
                  : isFelt
                  ? 'bg-stone-900/60 border-emerald-900/60 text-stone-200'
                  : 'bg-white border-stone-200 text-stone-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center font-mono ${
                    isFirst
                      ? 'bg-amber-400 text-stone-950 shadow-sm'
                      : player.rank === 2
                      ? 'bg-stone-300 text-stone-800'
                      : player.rank === 3
                      ? 'bg-amber-800 text-white'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : `#${player.rank}`}
                </span>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm sm:text-base">
                      {player.playerName}
                    </span>
                    {player.isTie && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-400/30 text-amber-200 border border-amber-400/50">
                        Tie
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium opacity-70">
                    {rankLabel}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono font-black text-2xl leading-none">
                  {player.finalScore}
                </span>
                <span className="text-[10px] uppercase font-bold opacity-60 block">
                  points
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2.5 pt-1">
        <button
          type="button"
          onClick={onStartNewFrame}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-500 hover:to-teal-700 active:scale-[0.98] text-white font-black text-base shadow-xl border-2 border-emerald-400/40 flex items-center justify-center gap-2 cursor-pointer transition"
        >
          <PlusCircle className="w-5 h-5" />
          <span>START NEW FRAME</span>
        </button>

        <button
          type="button"
          onClick={onOpenHistory}
          className={`w-full py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            isFelt
              ? 'bg-stone-900/60 border-stone-700 text-stone-300 hover:bg-stone-800'
              : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>View Past Match History</span>
        </button>
      </div>
    </section>
  );
};

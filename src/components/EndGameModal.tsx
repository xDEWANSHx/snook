import React, { useState, useEffect } from 'react';
import type { Player, PlayerRankResult } from '../types';
import { calculateRanks, formatRankLabel } from '../utils/ranking';
import { saveMatch } from '../services/matchService';
import { playVictorySound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Trophy, Cloud, HardDrive, RefreshCw, X, ArrowRight } from 'lucide-react';

interface EndGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  matchStartTime: number;
  onNewGame: () => void;
  onOpenHistory: () => void;
  onConfirmGameOver?: () => void;
}

export const EndGameModal: React.FC<EndGameModalProps> = ({
  isOpen,
  onClose,
  players,
  matchStartTime,
  onNewGame,
  onOpenHistory,
  onConfirmGameOver,
}) => {
  const [step, setStep] = useState<'confirm' | 'results'>('confirm');
  const [rankedResults, setRankedResults] = useState<PlayerRankResult[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [syncResult, setSyncResult] = useState<{ source: 'supabase' | 'local'; error?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setSyncResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmEndGame = async () => {
    const ranks = calculateRanks(players);
    setRankedResults(ranks);
    setStep('results');

    // Notify game engine that frame is officially over
    onConfirmGameOver?.();

    // Trigger celebration effects
    try {
      playVictorySound();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0f4c3a', '#D4AF37', '#DC2626', '#2563EB', '#ffffff'],
      });
    } catch {
      // Ignore confetti issues
    }

    // Persist to Supabase
    setIsSaving(true);
    const durationSeconds = Math.max(0, Math.floor((Date.now() - matchStartTime) / 1000));
    const winners = ranks.filter(r => r.rank === 1).map(r => r.playerName);

    try {
      const res = await saveMatch({
        player_count: players.length,
        winner_names: winners,
        duration_seconds: durationSeconds,
        players: ranks.map(r => ({
          player_name: r.playerName,
          final_score: r.finalScore,
          rank: r.rank,
        })),
      });

      setSyncResult({
        source: res.source,
        error: res.error,
      });
    } catch (e: unknown) {
      console.warn('Error saving match:', e);
      setSyncResult({ source: 'local', error: String(e) });
    } finally {
      setIsSaving(false);
    }
  };

  const winners = rankedResults.filter(r => r.rank === 1);
  const isTieForFirst = winners.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF8F5] border border-stone-300 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        {step === 'confirm' ? (
          /* Confirmation Dialog */
          <div className="p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-sm">
              <Trophy className="w-7 h-7 text-amber-600" />
            </div>
            <h2 className="text-xl font-black text-stone-900 mb-2">End This Frame?</h2>
            <p className="text-stone-600 text-sm mb-6">
              This will lock the current scores, calculate final rankings and tiebreakers, and save the match to history.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 font-bold text-stone-700 text-sm transition"
              >
                Keep Playing
              </button>
              <button
                type="button"
                onClick={handleConfirmEndGame}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm shadow-md transition"
              >
                Finish & Rank
              </button>
            </div>
          </div>
        ) : (
          /* Final Results & Podium */
          <div>
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900 via-stone-900 to-emerald-950 text-white p-6 text-center relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="inline-flex p-3 rounded-2xl bg-amber-400/20 text-amber-300 mb-2 border border-amber-400/30">
                <Trophy className="w-8 h-8 fill-amber-400 text-amber-300" />
              </div>

              <h2 className="text-2xl font-black tracking-tight">Frame Complete!</h2>
              <p className="text-emerald-200 text-xs mt-0.5">
                {isTieForFirst ? '🤝 Joint Winners Tie Decided' : '🏆 Champion Crowned'}
              </p>

              {/* Winner Announcement Banner */}
              <div className="mt-4 py-2 px-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 inline-block">
                <span className="text-xs uppercase font-bold tracking-wider text-amber-300 block">
                  {isTieForFirst ? 'Joint 1st Place' : 'Frame Winner'}
                </span>
                <span className="text-lg font-black text-white">
                  {winners.map(w => w.playerName).join(' & ')}
                </span>
              </div>
            </div>

            {/* Content: Leaderboard */}
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Final Standings
                </span>
                {/* Sync status */}
                <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-500">
                  {isSaving ? (
                    <span className="flex items-center gap-1 text-amber-600">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
                    </span>
                  ) : syncResult?.source === 'supabase' ? (
                    <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Cloud className="w-3 h-3" /> Supabase Cloud Synced
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                      <HardDrive className="w-3 h-3" /> Local Storage Saved
                    </span>
                  )}
                </div>
              </div>

              {/* Standings List */}
              <div className="flex flex-col gap-2">
                {rankedResults.map((player) => {
                  const isFirst = player.rank === 1;
                  const rankLabel = formatRankLabel(player.rank, player.isTie);

                  return (
                    <div
                      key={player.playerId}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                        isFirst
                          ? 'bg-amber-50/80 border-amber-300 shadow-sm ring-1 ring-amber-300/60'
                          : 'bg-white border-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center font-mono ${
                            isFirst
                              ? 'bg-amber-400 text-stone-950 shadow'
                              : player.rank === 2
                              ? 'bg-stone-300 text-stone-800'
                              : player.rank === 3
                              ? 'bg-amber-800 text-white'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : `#${player.rank}`}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 text-sm">
                              {player.playerName}
                            </span>
                            {player.isTie && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                Tie
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-stone-500">
                            {rankLabel}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-xl text-stone-900">
                          {player.finalScore}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">
                          pts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNewGame();
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Start New Frame</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenHistory();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-sm transition flex items-center justify-center gap-2"
                >
                  <span>View Past Matches</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import type { MatchRecord } from '../types';
import { getMatchHistory, deleteMatch } from '../services/matchService';
import { X, Search, Trophy, Calendar, Clock, Trash2, RefreshCw, Cloud, HardDrive } from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, onClose }) => {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'supabase' | 'local'>('local');
  const [searchQuery, setSearchQuery] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await getMatchHistory();
      setMatches(res.matches);
      setSource(res.source);
    } catch (e) {
      console.warn('Error loading history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (matchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this match record from history?')) {
      await deleteMatch(matchId);
      setMatches(prev => prev.filter(m => m.id !== matchId));
    }
  };

  const filteredMatches = matches.filter(match => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesWinner = match.winner_names.some(w => w.toLowerCase().includes(q));
    const matchesPlayer = (match.match_players || []).some(p => p.player_name.toLowerCase().includes(q));
    return matchesWinner || matchesPlayer;
  });

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const formatDuration = (secs?: number) => {
    if (!secs) return '< 1m';
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    if (mins === 0) return `${remainder}s`;
    return `${mins}m ${remainder}s`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-fade-in flex justify-end">
      <div className="w-full max-w-md bg-[#FAF8F5] h-full shadow-2xl flex flex-col border-l border-stone-300">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-black text-stone-900">Match History</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {matches.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadHistory}
              disabled={loading}
              title="Refresh matches"
              className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Source & Search Bar */}
        <div className="p-3 bg-stone-50 border-b border-stone-200 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs px-1 text-stone-500">
            <span>Storage Status:</span>
            {source === 'supabase' ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <Cloud className="w-3.5 h-3.5" /> Supabase Database
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-stone-600">
                <HardDrive className="w-3.5 h-3.5" /> Local Device Storage
              </span>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by player or winner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Match List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {loading && matches.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
              <p className="text-xs font-semibold">Loading matches...</p>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="py-16 text-center text-stone-400">
              <span className="text-4xl block mb-2">🎱</span>
              <p className="text-sm font-bold text-stone-600">No matches found</p>
              <p className="text-xs text-stone-400 mt-1">
                Completed games will appear here with full player score breakdowns.
              </p>
            </div>
          ) : (
            filteredMatches.map((match) => {
              const isTie = match.winner_names.length > 1;

              return (
                <div
                  key={match.id}
                  className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-sm hover:border-stone-300 transition flex flex-col gap-3"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(match.created_at)}</span>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDuration(match.duration_seconds)}</span>
                    </div>

                    <button
                      onClick={(e) => handleDelete(match.id, e)}
                      title="Delete match"
                      className="text-stone-300 hover:text-rose-600 transition p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Winner Banner */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">🏆</span>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 block leading-tight">
                          {isTie ? 'Joint Winners' : 'Winner'}
                        </span>
                        <span className="text-sm font-black text-stone-900">
                          {match.winner_names.join(' & ')}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {match.player_count} Players
                    </span>
                  </div>

                  {/* Player Scores Grid */}
                  <div className="bg-stone-50 rounded-xl p-2.5 flex flex-col gap-1.5 border border-stone-100">
                    {(match.match_players || []).map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-md font-mono font-bold text-[10px] flex items-center justify-center ${
                              p.rank === 1
                                ? 'bg-amber-300 text-stone-900'
                                : 'bg-stone-200 text-stone-600'
                            }`}
                          >
                            {p.rank}
                          </span>
                          <span className="font-semibold text-stone-800">
                            {p.player_name}
                          </span>
                        </div>
                        <span className="font-mono font-black text-stone-900">
                          {p.final_score} <span className="text-[9px] text-stone-400 font-sans">pts</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

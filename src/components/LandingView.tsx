import React, { useState } from 'react';
import { Users, Play, ArrowRight, UserCheck, History, Radio } from 'lucide-react';

interface LandingViewProps {
  theme?: 'felt' | 'chalk';
  onStartMatch: (names: string[]) => void;
  onJoinRoom: (code: string) => void;
  onOpenHistory: () => void;
}

const DEFAULT_PRESET_NAMES = [
  'Player 1',
  'Player 2',
  'Player 3',
  'Player 4',
  'Player 5',
  'Player 6',
];

export const LandingView: React.FC<LandingViewProps> = ({
  theme = 'felt',
  onStartMatch,
  onJoinRoom,
  onOpenHistory,
}) => {
  const isFelt = theme === 'felt';

  const [playerCount, setPlayerCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('snooker_saved_player_names');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          return Math.min(6, Math.max(2, parsed.length));
        }
      }
    } catch {}
    return 2;
  });

  const [names, setNames] = useState<string[]>(() => {
    let savedNames: string[] | null = null;
    try {
      const stored = localStorage.getItem('snooker_saved_player_names');
      if (stored) savedNames = JSON.parse(stored);
    } catch {}

    const source = savedNames && savedNames.length >= 2 ? savedNames : ['Player 1', 'Player 2'];
    const arr = [...DEFAULT_PRESET_NAMES];
    source.forEach((n, i) => {
      if (i < 6 && n) arr[i] = n;
    });
    return arr;
  });

  const [joinCode, setJoinCode] = useState('');

  const handleNameChange = (index: number, val: string) => {
    const updated = [...names];
    updated[index] = val;
    setNames(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNames = names.slice(0, playerCount).map((n, i) => n.trim() || `Player ${i + 1}`);
    try {
      localStorage.setItem('snooker_saved_player_names', JSON.stringify(finalNames));
    } catch {}
    onStartMatch(finalNames);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      onJoinRoom(joinCode.trim());
    }
  };

  const playerColors = [
    'bg-emerald-600',
    'bg-blue-600',
    'bg-amber-600',
    'bg-rose-600',
    'bg-purple-600',
    'bg-cyan-600',
  ];

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 py-3 sm:py-6 animate-fade-in">
      {/* Welcome Card */}
      <div
        className={`rounded-3xl p-5 sm:p-6 shadow-2xl border flex flex-col items-center text-center ${
          isFelt
            ? 'bg-gradient-to-b from-[#0a231b] via-[#071d16] to-[#04120e] border-emerald-500/30 text-white'
            : 'bg-[#FAF8F5] border-stone-300 text-stone-900'
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30 shadow-inner mb-3">
          <span className="text-3xl">🎱</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Snook Scoreboard
        </h1>
        <p className="text-xs text-stone-400 max-w-xs mt-1">
          Realtime multi-phone snooker scoring. Set player names to get an active table assigned.
        </p>

        {/* Start Game Form */}
        <form onSubmit={handleSubmit} className="w-full mt-5 flex flex-col gap-4 text-left">
          {/* 1. Player Count Selection (2 to 6) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 opacity-90">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Number of Players</span>
              </label>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-900/60 text-emerald-200 border border-emerald-600/50">
                {playerCount} Players
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[2, 3, 4, 5, 6].map((count) => {
                const isSelected = playerCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setPlayerCount(count)}
                    className={`py-2.5 sm:py-3 rounded-2xl font-black text-sm transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400 scale-[1.03]'
                        : isFelt
                        ? 'bg-stone-900/80 text-stone-300 border border-emerald-900/60 hover:bg-stone-850'
                        : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    <span className="text-base">{count}</span>
                    <span className="text-[9px] font-semibold opacity-80">Players</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Player Names */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 mb-2 opacity-90">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Player Names</span>
            </label>

            <div className="flex flex-col gap-2">
              {Array.from({ length: playerCount }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span
                    className={`w-9 h-9 rounded-xl text-white font-mono font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm ${
                      playerColors[idx] || 'bg-stone-700'
                    }`}
                  >
                    P{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={names[idx] || ''}
                    onChange={(e) => handleNameChange(idx, e.target.value)}
                    placeholder={`Player ${idx + 1} Name`}
                    maxLength={20}
                    className={`flex-1 px-3.5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isFelt
                        ? 'bg-stone-950/80 border border-emerald-900/80 text-stone-100 placeholder:text-stone-500'
                        : 'bg-white border border-stone-300 text-stone-900'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 3. Primary Button */}
          <button
            type="submit"
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-500 hover:to-teal-700 active:scale-[0.98] text-white font-black text-base shadow-xl border-2 border-emerald-400/40 flex items-center justify-center gap-2 cursor-pointer transition mt-2"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>CREATE TABLE & START MATCH</span>
          </button>
        </form>

        {/* Join existing table */}
        <div className="w-full border-t border-emerald-900/50 pt-4 mt-5">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-2 text-left flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Or Join an Existing Table</span>
          </span>
          <form onSubmit={handleJoinSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter 3-digit Table # (e.g. 482)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              maxLength={10}
              className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isFelt
                  ? 'bg-stone-950/80 border border-emerald-900/80 text-stone-100 placeholder:text-stone-600'
                  : 'bg-white border border-stone-300 text-stone-900'
              }`}
            />
            <button
              type="submit"
              className="py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <span>Join</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* History link */}
        <button
          type="button"
          onClick={onOpenHistory}
          className="mt-4 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1.5 cursor-pointer opacity-85"
        >
          <History className="w-3.5 h-3.5" />
          <span>View Past Completed Match History</span>
        </button>
      </div>
    </div>
  );
};

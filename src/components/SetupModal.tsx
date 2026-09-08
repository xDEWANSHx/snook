import React, { useState, useEffect } from 'react';
import { Users, Play, X, UserCheck } from 'lucide-react';

interface SetupModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onStartGame: (names: string[]) => void;
  initialPlayerNames?: string[];
  isMandatory?: boolean;
}

const DEFAULT_PRESET_NAMES = [
  'Player 1',
  'Player 2',
  'Player 3',
  'Player 4',
  'Player 5',
  'Player 6',
];

export const SetupModal: React.FC<SetupModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
  initialPlayerNames = ['Player 1', 'Player 2'],
  isMandatory = false,
}) => {
  const [playerCount, setPlayerCount] = useState<number>(() => {
    let savedNames: string[] | null = null;
    try {
      const stored = localStorage.getItem('snooker_saved_player_names');
      if (stored) savedNames = JSON.parse(stored);
    } catch {}

    const source =
      initialPlayerNames && initialPlayerNames.length >= 2
        ? initialPlayerNames
        : savedNames && savedNames.length >= 2
        ? savedNames
        : ['Player 1', 'Player 2'];

    return Math.min(6, Math.max(2, source.length));
  });

  const [names, setNames] = useState<string[]>(() => {
    let savedNames: string[] | null = null;
    try {
      const stored = localStorage.getItem('snooker_saved_player_names');
      if (stored) savedNames = JSON.parse(stored);
    } catch {}

    const source =
      initialPlayerNames && initialPlayerNames.length >= 2
        ? initialPlayerNames
        : savedNames && savedNames.length >= 2
        ? savedNames
        : ['Player 1', 'Player 2'];

    const arr = [...DEFAULT_PRESET_NAMES];
    source.forEach((n, i) => {
      if (i < 6 && n) arr[i] = n;
    });
    return arr;
  });

  // Only re-sync when modal opens (flips from closed to open)
  // This prevents background timers / parent re-renders from wiping user's inputs while typing
  useEffect(() => {
    if (isOpen) {
      let savedNames: string[] | null = null;
      try {
        const stored = localStorage.getItem('snooker_saved_player_names');
        if (stored) savedNames = JSON.parse(stored);
      } catch {}

      const source =
        initialPlayerNames && initialPlayerNames.length >= 2
          ? initialPlayerNames
          : savedNames && savedNames.length >= 2
          ? savedNames
          : ['Player 1', 'Player 2'];

      const count = Math.min(6, Math.max(2, source.length));
      setPlayerCount(count);
      setNames(() => {
        const arr = [...DEFAULT_PRESET_NAMES];
        source.forEach((n, i) => {
          if (i < 6 && n) arr[i] = n;
        });
        return arr;
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (index: number, val: string) => {
    const updated = [...names];
    updated[index] = val;
    setNames(updated);
  };

  const handleCountSelect = (count: number) => {
    setPlayerCount(count);
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNames = names.slice(0, playerCount).map((n, i) => n.trim() || `Player ${i + 1}`);
    try {
      localStorage.setItem('snooker_saved_player_names', JSON.stringify(finalNames));
    } catch {}
    onStartGame(finalNames);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-[#FAF8F5] border border-stone-300 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-stone-900 to-emerald-950 text-white p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎱</span>
            <div>
              <h2 className="text-lg font-black tracking-tight">Configure Snooker Match</h2>
              <p className="text-xs text-emerald-300">Set player count (2 to 6) & names</p>
            </div>
          </div>
          {onClose && !isMandatory && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleStart} className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
          {/* 1. Player Count Selection (2, 3, 4, 5, 6) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-700" />
                <span>Select Number of Players</span>
              </label>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
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
                    onClick={() => handleCountSelect(count)}
                    className={`py-3 rounded-2xl font-black text-sm transition-all flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-lg ring-2 ring-emerald-500 scale-[1.03]'
                        : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    <span className="text-base">{count}</span>
                    <span className="text-[10px] font-semibold opacity-80">Players</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Custom Player Names (2 to 6) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                <span>Player Names</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setNames([...DEFAULT_PRESET_NAMES]);
                }}
                className="text-[11px] font-bold text-emerald-800 hover:underline"
              >
                Reset Default Names
              </button>
            </div>

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
                    value={names[idx]}
                    onChange={(e) => handleNameChange(idx, e.target.value)}
                    placeholder={`Player ${idx + 1} Name`}
                    maxLength={20}
                    className="flex-1 px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition shadow-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 3. Start Frame Button */}
          <button
            type="submit"
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-900 hover:from-emerald-600 hover:to-emerald-800 active:scale-[0.98] text-white font-black text-base shadow-lg transition flex items-center justify-center gap-2 mt-2 cursor-pointer border border-emerald-600/50"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START FRAME ({playerCount} PLAYERS)</span>
          </button>
        </form>
      </div>
    </div>
  );
};

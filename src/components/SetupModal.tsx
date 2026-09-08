import React, { useState } from 'react';
import { Users, Play, X } from 'lucide-react';

interface SetupModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onStartGame: (names: string[]) => void;
  initialPlayerNames?: string[];
}

export const SetupModal: React.FC<SetupModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
  initialPlayerNames = ['Player 1', 'Player 2'],
}) => {
  const [playerCount, setPlayerCount] = useState<number>(
    initialPlayerNames.length >= 2 && initialPlayerNames.length <= 4
      ? initialPlayerNames.length
      : 2
  );

  const [names, setNames] = useState<string[]>([
    initialPlayerNames[0] || 'Player 1',
    initialPlayerNames[1] || 'Player 2',
    initialPlayerNames[2] || 'Player 3',
    initialPlayerNames[3] || 'Player 4',
  ]);

  if (!isOpen) return null;

  const handleNameChange = (index: number, val: string) => {
    const updated = [...names];
    updated[index] = val;
    setNames(updated);
  };

  const handlePresetReset = (count: number) => {
    setPlayerCount(count);
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNames = names.slice(0, playerCount).map((n, i) => n.trim() || `Player ${i + 1}`);
    onStartGame(finalNames);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF8F5] border border-stone-300 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-stone-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎱</span>
            <div>
              <h2 className="text-lg font-black tracking-tight">New Snooker Match</h2>
              <p className="text-xs text-emerald-200">Configure players and table settings</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleStart} className="p-5 sm:p-6 flex flex-col gap-5">
          {/* 1. Player Count Selection (2, 3, 4) */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-2">
              Number of Players
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => handlePresetReset(count)}
                  className={`py-3 rounded-xl font-black text-sm flex items-center justify-center gap-1.5 transition-all ${
                    playerCount === count
                      ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-600 ring-offset-1 scale-[1.02]'
                      : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>{count} Players</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Custom Player Names */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Player Names
              </label>
              <button
                type="button"
                onClick={() => {
                  setNames(['Player 1', 'Player 2', 'Player 3', 'Player 4']);
                }}
                className="text-[11px] font-semibold text-emerald-700 hover:underline"
              >
                Reset Default Names
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {Array.from({ length: playerCount }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    P{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={names[idx]}
                    onChange={(e) => handleNameChange(idx, e.target.value)}
                    placeholder={`Player ${idx + 1}`}
                    maxLength={20}
                    className="flex-1 px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition shadow-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 3. Start Game Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-black text-base shadow-lg transition flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START FRAME</span>
          </button>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { SNOOKER_BALLS } from '../types';
import type { Ball, NextBallType } from '../types';
import { UserCheck, AlertTriangle, Zap, Check } from 'lucide-react';

interface BallControlsProps {
  onAddPoints: (points: number, ballName: string) => void;
  onApplyFoul: (points: number, reason?: string) => void;
  onNextPlayer: () => void;
  nextPlayerName: string;
  doubleTapMode: boolean;
  onToggleDoubleTap: () => void;
  redsRemaining: number;
  nextBallType: NextBallType;
  colorSequenceIndex: number;
  theme?: 'felt' | 'chalk';
}

const COLOR_SEQUENCE_NAMES = ['Yellow', 'Green', 'Brown', 'Blue', 'Pink', 'Black'];

const FOUL_LIST = [
  { points: -4, label: '-4', subtitle: 'Brown / Min' },
  { points: -5, label: '-5', subtitle: 'Blue' },
  { points: -6, label: '-6', subtitle: 'Pink' },
  { points: -7, label: '-7', subtitle: 'Black' },
  { points: -2, label: '-2', subtitle: 'Yellow' },
  { points: -3, label: '-3', subtitle: 'Green' },
];

export const BallControls: React.FC<BallControlsProps> = ({
  onAddPoints,
  onApplyFoul,
  onNextPlayer,
  nextPlayerName,
  doubleTapMode,
  onToggleDoubleTap,
  redsRemaining = 15,
  nextBallType = 'RED',
  colorSequenceIndex = 0,
  theme = 'felt',
}) => {
  const isFelt = theme === 'felt';
  // Pending ball for double-tap confirmation
  const [pendingBall, setPendingBall] = useState<number | null>(null);
  const [pendingFoul, setPendingFoul] = useState<number | null>(null);
  const [pendingCuePot, setPendingCuePot] = useState<boolean>(false);
  const [committedBallAnim, setCommittedBallAnim] = useState<number | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const foulTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLockRef = useRef<boolean>(false);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (foulTimerRef.current) clearTimeout(foulTimerRef.current);
      if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    };
  }, []);

  const triggerCommitAnim = (points: number) => {
    setCommittedBallAnim(points);
    setTimeout(() => setCommittedBallAnim(null), 300);
  };

  /**
   * Determine if a ball is legally enabled based on snooker rules:
   * 1. Red is on: ONLY Red is unlocked, all 6 colors are locked.
   * 2. After potting Red: Red locks, and ALL 6 colors unlock!
   * 3. After potting a color: Colors lock, and Red unlocks!
   * 4. When all 15 reds are over: 1 bonus color shot, then strict sequence (Yellow -> Black).
   */
  const isBallActive = (ball: Ball): boolean => {
    // While reds remain on table (> 0):
    if (redsRemaining > 0) {
      if (nextBallType === 'RED') {
        return ball.name === 'Red';
      }
      if (nextBallType === 'COLOR') {
        return ball.name !== 'Red';
      }
    }

    // Reds are 0 (all 15 reds potted)
    if (ball.name === 'Red') {
      return false;
    }

    // 1 bonus color shot after the 15th red
    if (nextBallType === 'COLOR') {
      return true;
    }

    // Strict clearance sequence
    if (nextBallType === 'COLOR_SEQUENCE') {
      const activeColor = COLOR_SEQUENCE_NAMES[colorSequenceIndex];
      return ball.name === activeColor;
    }

    return false;
  };

  /**
   * Dedicated Cue Pot / In-Off (-4 Pts) Press
   */
  const handleCuePotPress = () => {
    if (isLockRef.current) return;

    const points = -4;
    const reason = 'Cue Ball Potted / In-Off (-4)';

    if (!doubleTapMode) {
      isLockRef.current = true;
      onApplyFoul(points, reason);
      setTimeout(() => {
        isLockRef.current = false;
      }, 250);
      return;
    }

    if (pendingCuePot) {
      isLockRef.current = true;
      if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
      setPendingCuePot(false);
      onApplyFoul(points, reason);
      setTimeout(() => {
        isLockRef.current = false;
      }, 300);
    } else {
      if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
      setPendingCuePot(true);
      actionTimerRef.current = setTimeout(() => {
        setPendingCuePot(false);
      }, 850);
    }
  };

  /**
   * Pot Ball Press
   */
  const handleBallPress = (ball: Ball) => {
    if (isLockRef.current) return;
    if (!isBallActive(ball)) return;

    if (!doubleTapMode) {
      isLockRef.current = true;
      triggerCommitAnim(ball.points);
      onAddPoints(ball.points, ball.name);
      setTimeout(() => {
        isLockRef.current = false;
      }, 250);
      return;
    }

    if (pendingBall === ball.points) {
      isLockRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      setPendingBall(null);
      triggerCommitAnim(ball.points);
      onAddPoints(ball.points, ball.name);
      setTimeout(() => {
        isLockRef.current = false;
      }, 300);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPendingBall(ball.points);
      timerRef.current = setTimeout(() => {
        setPendingBall(null);
      }, 850);
    }
  };

  /**
   * Foul Press
   */
  const handleFoulPress = (points: number, label: string) => {
    if (isLockRef.current) return;

    const reason = `Foul (${label})`;

    if (!doubleTapMode) {
      isLockRef.current = true;
      onApplyFoul(points, reason);
      setTimeout(() => {
        isLockRef.current = false;
      }, 250);
      return;
    }

    if (pendingFoul === points) {
      isLockRef.current = true;
      if (foulTimerRef.current) clearTimeout(foulTimerRef.current);
      setPendingFoul(null);
      onApplyFoul(points, reason);
      setTimeout(() => {
        isLockRef.current = false;
      }, 300);
    } else {
      if (foulTimerRef.current) clearTimeout(foulTimerRef.current);
      setPendingFoul(points);
      foulTimerRef.current = setTimeout(() => {
        setPendingFoul(null);
      }, 850);
    }
  };

  // Status subtitle for snooker table progression
  const getPhaseDescription = () => {
    if (redsRemaining > 0) {
      if (nextBallType === 'RED') return '🔴 Legal: Red (+1)';
      return '🌈 Legal: Any Color (+2 to +7)';
    }
    if (nextBallType === 'COLOR') return '🌈 Final Color after 15th Red';
    const target = COLOR_SEQUENCE_NAMES[colorSequenceIndex] || 'Frame Complete';
    return `🎯 Sequence: ${target} (+${colorSequenceIndex + 2})`;
  };

  return (
    <div className="w-full flex flex-col gap-2 sm:gap-2.5">
      {/* 1. Dedicated Cue Pot / In-Off Foul Action Bar (Shot Missed removed per user request) */}
      <button
        type="button"
        onClick={handleCuePotPress}
        className={`w-full py-2.5 px-3.5 rounded-2xl font-black text-xs flex items-center justify-between transition-all duration-150 border-2 shadow-sm touch-manipulation cursor-pointer ${
          pendingCuePot
            ? 'bg-amber-400 text-stone-950 border-amber-500 ring-4 ring-amber-300 animate-pulse scale-[1.01]'
            : isFelt
            ? 'bg-gradient-to-r from-[#2c1218] via-[#1d0d11] to-[#12080a] hover:from-[#3a1820] text-rose-200 border-rose-700/60 active:scale-[0.99]'
            : 'bg-gradient-to-r from-rose-950 via-rose-900 to-stone-900 hover:from-rose-900 text-rose-200 border-rose-800/80 active:scale-[0.99]'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">⚪🕳️</span>
          <span className="truncate font-black tracking-wide text-xs sm:text-sm">
            {pendingCuePot ? 'Tap again to confirm In-Off penalty!' : 'Cue Pot / In-Off Foul Penalty'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-rose-300/80 hidden xs:inline">Foul Deduct</span>
          <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-rose-900 text-white border border-rose-500 shadow-xs">
            -4 pts
          </span>
        </div>
      </button>

      {/* 2. Pot Balls Grid with 15-Reds Counter & Sequence Progression */}
      <div className={`backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border shadow-xl relative ${
        isFelt
          ? 'bg-[#0c261e]/95 border-emerald-700/50 text-stone-100'
          : 'bg-white/95 border-stone-300/80 text-stone-900'
      }`}>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            {/* 15 Reds Remaining Badge */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-black border shadow-xs ${
              isFelt
                ? 'bg-rose-950/90 text-rose-200 border-rose-700/70'
                : 'bg-rose-100 text-rose-900 border-rose-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${redsRemaining > 0 ? 'bg-rose-500 animate-pulse' : 'bg-stone-500'}`} />
              <span>{redsRemaining} / 15 Reds</span>
            </span>

            {/* Current Legal Ball Hint */}
            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-md border hidden xs:inline ${
              isFelt
                ? 'text-emerald-200 bg-[#061b14] border-emerald-700/60'
                : 'text-stone-700 bg-stone-100 border-stone-200'
            }`}>
              {getPhaseDescription()}
            </span>
          </div>

          {/* Mode Switch Toggle */}
          <button
            onClick={onToggleDoubleTap}
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border transition ${
              isFelt
                ? 'text-emerald-200 hover:text-white bg-[#061b14] hover:bg-emerald-950 border-emerald-700/60'
                : 'text-stone-600 hover:text-stone-900 bg-stone-100 border-stone-300'
            }`}
            title="Switch between Double-Tap safety or Instant Single-Tap"
          >
            <Zap className={`w-3 h-3 ${doubleTapMode ? isFelt ? 'text-emerald-400' : 'text-stone-400' : 'text-amber-400 fill-amber-400'}`} />
            <span>{doubleTapMode ? 'Double-Tap' : 'Single-Tap'}</span>
          </button>
        </div>

        {/* Snooker 7 Balls Layout: Top Row (Red, Yellow, Green, Brown), Bottom Row (Blue, Pink, Black) */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3 mb-2.5">
          {SNOOKER_BALLS.slice(0, 4).map((ball) => {
            const isPending = pendingBall === ball.points;
            const isCommitted = committedBallAnim === ball.points;
            const isActive = isBallActive(ball);

            return (
              <button
                key={ball.name}
                type="button"
                disabled={!isActive}
                onClick={() => handleBallPress(ball)}
                className={`flex flex-col items-center group relative focus:outline-none touch-manipulation transition-all duration-150 ${
                  isActive
                    ? 'cursor-pointer opacity-100 hover:scale-[1.03]'
                    : 'cursor-not-allowed opacity-25 grayscale-[0.6] pointer-events-none scale-95'
                }`}
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 snooker-ball ${ball.colorClass} ${
                    isPending ? 'ring-4 ring-amber-400 ring-offset-2 scale-105 shadow-xl' : ''
                  } ${isCommitted ? 'animate-commit ring-4 ring-emerald-500' : ''}`}
                >
                  <span className="text-xl sm:text-2xl font-black">{ball.label}</span>
                </div>
                <span className={`text-[11px] font-bold mt-1 flex items-center gap-1 ${
                  isFelt ? 'text-emerald-100' : 'text-stone-800'
                }`}>
                  {ball.name}
                  {ball.name === 'Red' && (
                    <span className={`text-[10px] font-mono font-bold ${isFelt ? 'text-rose-400' : 'text-rose-600'}`}>
                      ({redsRemaining})
                    </span>
                  )}
                </span>
                {isPending && (
                  <span className="absolute -top-2 right-1 bg-amber-500 text-white rounded-full p-0.5 shadow">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-[85%] mx-auto">
          {SNOOKER_BALLS.slice(4).map((ball) => {
            const isPending = pendingBall === ball.points;
            const isCommitted = committedBallAnim === ball.points;
            const isActive = isBallActive(ball);

            return (
              <button
                key={ball.name}
                type="button"
                disabled={!isActive}
                onClick={() => handleBallPress(ball)}
                className={`flex flex-col items-center group relative focus:outline-none touch-manipulation transition-all duration-150 ${
                  isActive
                    ? 'cursor-pointer opacity-100 hover:scale-[1.03]'
                    : 'cursor-not-allowed opacity-25 grayscale-[0.6] pointer-events-none scale-95'
                }`}
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 snooker-ball ${ball.colorClass} ${
                    isPending ? 'ring-4 ring-amber-400 ring-offset-2 scale-105 shadow-xl' : ''
                  } ${isCommitted ? 'animate-commit ring-4 ring-emerald-500' : ''}`}
                >
                  <span className="text-xl sm:text-2xl font-black">{ball.label}</span>
                </div>
                <span className={`text-[11px] font-bold mt-1 ${isFelt ? 'text-emerald-100' : 'text-stone-800'}`}>
                  {ball.name}
                </span>
                {isPending && (
                  <span className="absolute -top-2 right-1 bg-amber-500 text-white rounded-full p-0.5 shadow">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Fouls Penalty Section (Big & Thumb-Friendly) */}
      <div className={`rounded-2xl p-2.5 sm:p-3 border shadow-md ${
        isFelt
          ? 'bg-gradient-to-b from-[#071d15] to-[#04100c] text-stone-100 border-emerald-900/60'
          : 'bg-gradient-to-b from-stone-900 to-stone-950 text-stone-100 border-stone-800'
      }`}>
        <div className="flex items-center justify-between mb-1.5 px-1">
          <div className="flex items-center gap-1.5 text-rose-400 font-black text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Foul Penalties (Direct Deduction)</span>
          </div>
          {pendingFoul !== null && (
            <span className="text-[10px] font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-600/70 animate-pulse">
              Tap again to confirm foul!
            </span>
          )}
        </div>

        {/* Generously sized, thumb-friendly foul buttons */}
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {FOUL_LIST.map((foul) => {
            const isPending = pendingFoul === foul.points;
            const isBrownFour = foul.points === -4;

            return (
              <button
                key={foul.label}
                type="button"
                onClick={() => handleFoulPress(foul.points, foul.subtitle)}
                className={`py-3 sm:py-3.5 px-1 rounded-xl flex flex-col items-center justify-center font-mono transition-all touch-manipulation cursor-pointer shadow-sm ${
                  isPending
                    ? 'bg-amber-400 text-stone-950 ring-4 ring-white scale-105 shadow-xl font-black'
                    : isBrownFour
                    ? 'bg-gradient-to-b from-[#3a1b08] via-[#261205] to-[#140802] hover:from-[#48220a] text-amber-200 border-2 border-amber-500/90 active:scale-95'
                    : 'bg-gradient-to-b from-rose-950/80 to-stone-900 hover:from-rose-900 hover:to-stone-850 text-rose-200 border border-rose-800/50 active:scale-95'
                }`}
                title={`Deduct ${foul.points} points (${foul.subtitle})`}
              >
                <span className="text-base sm:text-lg font-black tracking-tight leading-none">
                  {foul.label}
                </span>
                <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-stone-300 mt-1">
                  {foul.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Big Prominent "Turn Over / Next Player" Primary Thumb Button */}
      <button
        type="button"
        onClick={onNextPlayer}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 hover:from-emerald-500 hover:to-teal-700 active:scale-[0.98] text-white font-black text-base sm:text-lg shadow-xl border-2 border-emerald-400/40 flex items-center justify-center gap-3 transition-all duration-150 touch-manipulation cursor-pointer"
      >
        <UserCheck className="w-5 h-5 text-emerald-300" />
        <span>TURN OVER</span>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-black/30 text-emerald-200 border border-emerald-400/30">
          Next: {nextPlayerName} →
        </span>
      </button>
    </div>
  );
};

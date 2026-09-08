import React, { useState, useRef, useEffect } from 'react';
import { SNOOKER_BALLS } from '../types';
import type { Ball } from '../types';
import { UserCheck, AlertTriangle, Zap, Check } from 'lucide-react';

interface BallControlsProps {
  onAddPoints: (points: number, ballName: string) => void;
  onApplyFoul: (points: number) => void;
  onNextPlayer: () => void;
  nextPlayerName: string;
  doubleTapMode: boolean;
  onToggleDoubleTap: () => void;
}

const FOUL_LIST = [
  { points: -4, label: '-4', subtitle: 'Standard' },
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
}) => {
  // Pending ball for double-tap confirmation
  const [pendingBall, setPendingBall] = useState<number | null>(null);
  const [pendingFoul, setPendingFoul] = useState<number | null>(null);
  const [isPendingMiss, setIsPendingMiss] = useState<boolean>(false);
  const [committedBallAnim, setCommittedBallAnim] = useState<number | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const foulTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLockRef = useRef<boolean>(false);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (foulTimerRef.current) clearTimeout(foulTimerRef.current);
      if (missTimerRef.current) clearTimeout(missTimerRef.current);
    };
  }, []);

  const triggerCommitAnim = (points: number) => {
    setCommittedBallAnim(points);
    setTimeout(() => setCommittedBallAnim(null), 300);
  };

  /**
   * Big Horizontal Miss Button Press
   */
  const handleMissPress = () => {
    if (isLockRef.current) return;

    if (!doubleTapMode) {
      isLockRef.current = true;
      onApplyFoul(0);
      setTimeout(() => {
        isLockRef.current = false;
      }, 250);
      return;
    }

    if (isPendingMiss) {
      // 2nd tap! Commit miss 0
      isLockRef.current = true;
      if (missTimerRef.current) clearTimeout(missTimerRef.current);
      setIsPendingMiss(false);
      onApplyFoul(0);
      setTimeout(() => {
        isLockRef.current = false;
      }, 300);
    } else {
      // 1st tap
      if (missTimerRef.current) clearTimeout(missTimerRef.current);
      setIsPendingMiss(true);
      missTimerRef.current = setTimeout(() => {
        setIsPendingMiss(false);
      }, 850);
    }
  };

  /**
   * Pot Ball Press
   */
  const handleBallPress = (ball: Ball) => {
    if (isLockRef.current) return;

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
  const handleFoulPress = (points: number) => {
    if (isLockRef.current) return;

    if (!doubleTapMode) {
      isLockRef.current = true;
      onApplyFoul(points);
      setTimeout(() => {
        isLockRef.current = false;
      }, 250);
      return;
    }

    if (pendingFoul === points) {
      isLockRef.current = true;
      if (foulTimerRef.current) clearTimeout(foulTimerRef.current);
      setPendingFoul(null);
      onApplyFoul(points);
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

  return (
    <div className="w-full flex flex-col gap-2.5 sm:gap-3">
      {/* 1. Big Horizontal "Shot Missed (0 Pts)" Button (Above Pot Balls) */}
      <button
        type="button"
        onClick={handleMissPress}
        className={`w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-between transition-all duration-150 border-2 shadow-md touch-manipulation cursor-pointer relative overflow-hidden ${
          isPendingMiss
            ? 'bg-amber-400 text-stone-950 border-amber-500 ring-4 ring-amber-300 animate-pulse scale-[1.01]'
            : 'bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 hover:from-stone-800 hover:to-stone-800 text-white border-stone-700/90 active:scale-[0.98]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {/* 3D Realistic Pure White Cue Ball */}
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white via-stone-100 to-stone-300 shadow-md flex items-center justify-center border border-stone-200 flex-shrink-0 relative">
            <div className="w-2 h-1.5 rounded-full bg-white opacity-90 absolute top-1 left-1.5" />
          </div>
          
          <div className="text-left">
            <span className="block text-xs sm:text-sm font-black tracking-tight leading-none">
              {isPendingMiss ? '⚠️ TAP AGAIN TO CONFIRM MISS (0 PTS)' : 'SHOT MISSED / NO POT'}
            </span>
            <span className="text-[10px] font-medium text-stone-400 block mt-0.5">
              {isPendingMiss ? 'Break will reset to 0' : 'End current break without penalty (0 pts)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Taom Blue Chalk Cube Icon */}
          <div
            title="Snooker Tip Chalk"
            className="w-5 h-5 rounded-md bg-sky-500 border border-sky-300 shadow-xs flex items-center justify-center text-[10px] font-black text-white"
          >
            C
          </div>
          <span className="text-[11px] font-black font-mono px-2 py-0.5 rounded-lg bg-black/40 text-stone-200 border border-white/10">
            0 PTS
          </span>
        </div>
      </button>

      {/* 2. Pot Balls Grid */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-2.5 sm:p-3.5 border border-stone-300/80 shadow-sm relative">
        {/* Brass corner table rivets */}
        <span className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-300 border border-amber-600/60 shadow-xs opacity-60 pointer-events-none" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-300 border border-amber-600/60 shadow-xs opacity-60 pointer-events-none" />

        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-1">
              <span>🎱</span>
              <span>POT BALLS</span>
            </span>
            {pendingBall !== null && (
              <span className="text-[10px] font-extrabold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full animate-bounce border border-amber-300">
                Tap again to commit!
              </span>
            )}
          </div>

          {/* Mode Switch Toggle */}
          <button
            onClick={onToggleDoubleTap}
            className="flex items-center gap-1 text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-300 transition"
            title="Switch between Double-Tap safety or Instant Single-Tap"
          >
            <Zap className={`w-3 h-3 ${doubleTapMode ? 'text-stone-400' : 'text-amber-500 fill-amber-500'}`} />
            <span>{doubleTapMode ? 'Double-Tap: ON' : 'Single-Tap'}</span>
          </button>
        </div>

        {/* Snooker 7 Balls Layout: Top Row (Red, Yellow, Green, Brown), Bottom Row (Blue, Pink, Black) */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3 mb-2.5">
          {SNOOKER_BALLS.slice(0, 4).map((ball) => {
            const isPending = pendingBall === ball.points;
            const isCommitted = committedBallAnim === ball.points;

            return (
              <button
                key={ball.name}
                type="button"
                onClick={() => handleBallPress(ball)}
                className="flex flex-col items-center group relative focus:outline-none touch-manipulation cursor-pointer"
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 snooker-ball ${ball.colorClass} ${
                    isPending ? 'ring-4 ring-amber-400 ring-offset-2 scale-105 shadow-xl' : ''
                  } ${isCommitted ? 'animate-commit ring-4 ring-emerald-500' : ''}`}
                >
                  <span className="text-xl sm:text-2xl font-black">{ball.label}</span>
                </div>
                <span className="text-[11px] font-bold text-stone-700 mt-1">
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

        <div className="grid grid-cols-3 gap-3 max-w-[85%] mx-auto">
          {SNOOKER_BALLS.slice(4).map((ball) => {
            const isPending = pendingBall === ball.points;
            const isCommitted = committedBallAnim === ball.points;

            return (
              <button
                key={ball.name}
                type="button"
                onClick={() => handleBallPress(ball)}
                className="flex flex-col items-center group relative focus:outline-none touch-manipulation cursor-pointer"
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 snooker-ball ${ball.colorClass} ${
                    isPending ? 'ring-4 ring-amber-400 ring-offset-2 scale-105 shadow-xl' : ''
                  } ${isCommitted ? 'animate-commit ring-4 ring-emerald-500' : ''}`}
                >
                  <span className="text-xl sm:text-2xl font-black">{ball.label}</span>
                </div>
                <span className="text-[11px] font-bold text-stone-700 mt-1">
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

      {/* 3. Significantly Enlarged Fouls Penalty Section */}
      <div className="bg-gradient-to-b from-stone-900 to-stone-950 text-stone-100 rounded-2xl p-2.5 sm:p-3 border border-stone-800 shadow-md relative">
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
            const isStandardFour = foul.points === -4;

            return (
              <button
                key={foul.label}
                type="button"
                onClick={() => handleFoulPress(foul.points)}
                className={`py-3 sm:py-3.5 px-1 rounded-xl flex flex-col items-center justify-center font-mono transition-all touch-manipulation cursor-pointer shadow-sm ${
                  isPending
                    ? 'bg-amber-400 text-stone-950 ring-4 ring-white scale-105 shadow-xl font-black'
                    : isStandardFour
                    ? 'bg-gradient-to-b from-rose-700 to-rose-900 hover:from-rose-600 hover:to-rose-800 text-white border-2 border-rose-400/80 active:scale-95'
                    : 'bg-gradient-to-b from-rose-950/80 to-stone-900 hover:from-rose-900 hover:to-stone-850 text-rose-200 border border-rose-800/50 active:scale-95'
                }`}
                title={`Deduct ${foul.points} points (${foul.subtitle})`}
              >
                <span className="text-base sm:text-lg font-black tracking-tight leading-none">
                  {foul.label}
                </span>
                <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-rose-300/80 mt-1">
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
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 hover:from-emerald-600 hover:to-teal-800 active:scale-[0.98] text-white font-black text-base sm:text-lg shadow-xl border-2 border-emerald-500/40 flex items-center justify-center gap-3 transition-all duration-150 touch-manipulation cursor-pointer"
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

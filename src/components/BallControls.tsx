import React, { useState, useRef, useEffect } from 'react';
import { SNOOKER_BALLS, FOUL_OPTIONS } from '../types';
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
  const [committedBallAnim, setCommittedBallAnim] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const foulTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (foulTimerRef.current) clearTimeout(foulTimerRef.current);
    };
  }, []);

  const handleBallPress = (ball: Ball) => {
    if (!doubleTapMode) {
      // Single-tap mode: Commit immediately
      triggerCommitAnim(ball.points);
      onAddPoints(ball.points, ball.name);
      return;
    }

    // Double-tap mode
    if (pendingBall === ball.points) {
      // Second tap within window! Commit points!
      if (timerRef.current) clearTimeout(timerRef.current);
      setPendingBall(null);
      triggerCommitAnim(ball.points);
      onAddPoints(ball.points, ball.name);
    } else {
      // First tap: set pending and start 800ms window
      if (timerRef.current) clearTimeout(timerRef.current);
      setPendingBall(ball.points);
      timerRef.current = setTimeout(() => {
        setPendingBall(null);
      }, 850);
    }
  };

  const handleFoulPress = (points: number) => {
    if (!doubleTapMode) {
      onApplyFoul(points);
      return;
    }

    if (pendingFoul === points) {
      if (foulTimerRef.current) clearTimeout(foulTimerRef.current);
      setPendingFoul(null);
      onApplyFoul(points);
    } else {
      if (foulTimerRef.current) clearTimeout(foulTimerRef.current);
      setPendingFoul(points);
      foulTimerRef.current = setTimeout(() => {
        setPendingFoul(null);
      }, 850);
    }
  };

  const triggerCommitAnim = (points: number) => {
    setCommittedBallAnim(points);
    setTimeout(() => setCommittedBallAnim(null), 300);
  };

  return (
    <div className="w-full flex flex-col gap-2.5 sm:gap-3">
      {/* 1. Balls Grid (Primary Scoring Zone) */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-2.5 sm:p-3.5 border border-stone-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-stone-700">
              Pot Balls
            </span>
            {pendingBall !== null && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-bounce">
                Tap again to commit!
              </span>
            )}
          </div>

          {/* Mode Switch Toggle (Double-Tap vs Single-Tap) */}
          <button
            onClick={onToggleDoubleTap}
            className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-stone-800 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200 transition"
            title="Switch between Double-Tap safety or Instant Single-Tap"
          >
            <Zap className={`w-3 h-3 ${doubleTapMode ? 'text-stone-400' : 'text-amber-500 fill-amber-500'}`} />
            <span>{doubleTapMode ? 'Double-Tap: ON' : 'Single-Tap (Express)'}</span>
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
                onDoubleClick={() => {
                  // Desktop double-click safety fallback
                  if (doubleTapMode) {
                    triggerCommitAnim(ball.points);
                    onAddPoints(ball.points, ball.name);
                    setPendingBall(null);
                  }
                }}
                className="flex flex-col items-center group relative focus:outline-none"
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 snooker-ball ${ball.colorClass} ${
                    isPending ? 'ring-4 ring-amber-400 ring-offset-2 scale-105 shadow-xl' : ''
                  } ${isCommitted ? 'animate-commit ring-4 ring-emerald-500' : ''}`}
                >
                  <span className="text-xl sm:text-2xl font-black">{ball.label}</span>
                </div>
                <span className="text-[11px] font-bold text-stone-600 mt-1">
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
                onDoubleClick={() => {
                  if (doubleTapMode) {
                    triggerCommitAnim(ball.points);
                    onAddPoints(ball.points, ball.name);
                    setPendingBall(null);
                  }
                }}
                className="flex flex-col items-center group relative focus:outline-none"
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 snooker-ball ${ball.colorClass} ${
                    isPending ? 'ring-4 ring-amber-400 ring-offset-2 scale-105 shadow-xl' : ''
                  } ${isCommitted ? 'animate-commit ring-4 ring-emerald-500' : ''}`}
                >
                  <span className="text-xl sm:text-2xl font-black">{ball.label}</span>
                </div>
                <span className="text-[11px] font-bold text-stone-600 mt-1">
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

      {/* 2. Distinct Foul Section (0, -2, -3, -4, -5, -6, -7) */}
      <div className="bg-stone-900/95 text-stone-100 rounded-2xl p-2.5 sm:p-3 border border-stone-800 shadow-sm">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <div className="flex items-center gap-1.5 text-rose-400 font-extrabold text-[11px] uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Fouls & Misses (Direct Deduction)</span>
          </div>
          {pendingFoul !== null && (
            <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/50">
              Tap again to confirm foul!
            </span>
          )}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {FOUL_OPTIONS.map((foul) => {
            const isPending = pendingFoul === foul.points;
            return (
              <button
                key={foul.label}
                type="button"
                onClick={() => handleFoulPress(foul.points)}
                className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center font-mono font-bold transition-all ${
                  isPending
                    ? 'bg-amber-500 text-stone-950 ring-2 ring-white scale-105 shadow-lg'
                    : foul.points === 0
                    ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 active:scale-95'
                    : 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-900/50 active:scale-95'
                }`}
                title={`Deduct ${foul.points} points`}
              >
                <span className="text-sm font-black">{foul.label.replace('Miss ', '')}</span>
                <span className="text-[9px] font-sans font-medium text-stone-400">
                  {foul.points === 0 ? 'Miss' : 'Foul'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Big Prominent "Turn Over / Next Player" Primary Thumb Button */}
      <button
        type="button"
        onClick={onNextPlayer}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 hover:from-emerald-600 hover:to-teal-800 active:scale-[0.98] text-white font-extrabold text-lg sm:text-xl shadow-lg border-2 border-emerald-500/40 flex items-center justify-center gap-3 transition-all duration-150 touch-manipulation cursor-pointer"
      >
        <UserCheck className="w-6 h-6 text-emerald-300" />
        <span>TURN OVER</span>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-black/30 text-emerald-200 border border-emerald-400/30">
          Next: {nextPlayerName} →
        </span>
      </button>
    </div>
  );
};

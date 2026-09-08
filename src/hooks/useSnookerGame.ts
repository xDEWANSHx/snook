import { useState, useCallback, useEffect } from 'react';
import type { GameState, Player, ActionHistoryEntry } from '../types';
import { playBallClackSound, playFoulSound, playTurnSwitchSound } from '../utils/audio';

const STORAGE_GAME_KEY = 'snooker_current_game_state';

const DEFAULT_INITIAL_STATE: GameState = {
  players: [
    { id: 'p1', name: 'Player 1', score: 0, currentBreak: 0 },
    { id: 'p2', name: 'Player 2', score: 0, currentBreak: 0 },
  ],
  activePlayerIndex: 0,
  turnCount: 1,
  matchStartTime: Date.now(),
  isGameOver: false,
  doubleTapMode: true,
};

export function useSnookerGame() {
  const [state, setState] = useState<GameState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_GAME_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.players) && parsed.players.length >= 2) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Error reading stored game:', e);
      }
    }
    return DEFAULT_INITIAL_STATE;
  });

  const [undoStack, setUndoStack] = useState<ActionHistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<ActionHistoryEntry[]>([]);

  // Keep state saved to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_GAME_KEY, JSON.stringify(state));
    }
  }, [state]);

  // Deep clone helper
  const cloneState = useCallback((s: GameState): GameState => {
    return {
      players: s.players.map(p => ({ ...p })),
      activePlayerIndex: s.activePlayerIndex,
      turnCount: s.turnCount,
      matchStartTime: s.matchStartTime,
      isGameOver: s.isGameOver,
      doubleTapMode: s.doubleTapMode,
    };
  }, []);

  // Save snapshot to undo stack
  const recordAction = useCallback(
    (actionDescription: string) => {
      setUndoStack(prev => [
        ...prev,
        {
          state: cloneState(state),
          actionDescription,
          timestamp: Date.now(),
        },
      ]);
      setRedoStack([]);
    },
    [cloneState, state]
  );

  /**
   * Commit positive ball points to the active player
   */
  const addPoints = useCallback(
    (points: number, ballName: string) => {
      recordAction(`Potted ${ballName} (+${points})`);
      playBallClackSound(0.85 + points * 0.05);

      setState(prev => {
        const updatedPlayers = prev.players.map((p, idx) => {
          if (idx === prev.activePlayerIndex) {
            return {
              ...p,
              score: p.score + points,
              currentBreak: p.currentBreak + points,
            };
          }
          return p;
        });

        return {
          ...prev,
          players: updatedPlayers,
        };
      });
    },
    [recordAction]
  );

  /**
   * Apply foul points (directly deducts negative value or registers miss 0)
   */
  const applyFoul = useCallback(
    (foulPoints: number) => {
      const desc = foulPoints === 0 ? 'Miss (0)' : `Foul (${foulPoints})`;
      recordAction(desc);
      playFoulSound();

      setState(prev => {
        const updatedPlayers = prev.players.map((p, idx) => {
          if (idx === prev.activePlayerIndex) {
            return {
              ...p,
              score: p.score + foulPoints, // foulPoints is <= 0
              currentBreak: 0, // break ends on foul
            };
          }
          return p;
        });

        return {
          ...prev,
          players: updatedPlayers,
        };
      });
    },
    [recordAction]
  );

  /**
   * Turn Over / Next Player
   * Passes turn to (currentIndex + 1) % totalPlayers and resets active player's break to 0
   */
  const nextPlayer = useCallback(() => {
    const currentName = state.players[state.activePlayerIndex]?.name || 'Player';
    recordAction(`Turn Over for ${currentName}`);
    playTurnSwitchSound();

    setState(prev => {
      const nextIndex = (prev.activePlayerIndex + 1) % prev.players.length;
      const updatedPlayers = prev.players.map((p, idx) => {
        if (idx === prev.activePlayerIndex) {
          return {
            ...p,
            currentBreak: 0,
          };
        }
        return p;
      });

      return {
        ...prev,
        players: updatedPlayers,
        activePlayerIndex: nextIndex,
        turnCount: prev.turnCount + 1,
      };
    });
  }, [state.players, state.activePlayerIndex, recordAction]);

  /**
   * Revert to previous action state
   */
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;

    const lastEntry = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));

    setRedoStack(prev => [
      ...prev,
      {
        state: cloneState(state),
        actionDescription: 'Current State',
        timestamp: Date.now(),
      },
    ]);

    setState(lastEntry.state);
    playTurnSwitchSound();
  }, [undoStack, cloneState, state]);

  /**
   * Redo action state
   */
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const nextEntry = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));

    setUndoStack(prev => [
      ...prev,
      {
        state: cloneState(state),
        actionDescription: 'Pre-Redo State',
        timestamp: Date.now(),
      },
    ]);

    setState(nextEntry.state);
    playTurnSwitchSound();
  }, [redoStack, cloneState, state]);

  /**
   * Initialize a new match session with custom player names
   */
  const startNewGame = useCallback((playerNames: string[]) => {
    const names = playerNames.length >= 2 ? playerNames : ['Player 1', 'Player 2'];
    const newPlayers: Player[] = names.map((name, index) => ({
      id: `player_${Date.now()}_${index}`,
      name: name.trim() || `Player ${index + 1}`,
      score: 0,
      currentBreak: 0,
    }));

    const newState: GameState = {
      players: newPlayers,
      activePlayerIndex: 0,
      turnCount: 1,
      matchStartTime: Date.now(),
      isGameOver: false,
      doubleTapMode: state.doubleTapMode,
    };

    setState(newState);
    setUndoStack([]);
    setRedoStack([]);
  }, [state.doubleTapMode]);

  /**
   * Toggle Double-Tap Commit vs Instant Single-Tap
   */
  const toggleDoubleTapMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      doubleTapMode: !prev.doubleTapMode,
    }));
  }, []);

  /**
   * Set Game Over status
   */
  const setGameOver = useCallback((isOver: boolean) => {
    setState(prev => ({
      ...prev,
      isGameOver: isOver,
    }));
  }, []);

  return {
    state,
    activePlayer: state.players[state.activePlayerIndex],
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoStackCount: undoStack.length,
    addPoints,
    applyFoul,
    nextPlayer,
    undo,
    redo,
    startNewGame,
    toggleDoubleTapMode,
    setGameOver,
  };
}

import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState, Player, ActionHistoryEntry } from '../types';
import { playBallClackSound, playFoulSound, playTurnSwitchSound } from '../utils/audio';
import {
  getOrCreateLiveMatch,
  persistLiveMatchState,
  subscribeToRoom,
} from '../services/realtimeService';

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

// Generate random friendly room code (e.g., TABLE-42 or SNOOK-88)
function getInitialRoomCode(): string {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) return roomParam.toUpperCase().trim();

    const stored = localStorage.getItem('snooker_active_room');
    if (stored) return stored.toUpperCase().trim();
  }
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `TABLE-${randomNum}`;
}

export function useSnookerGame() {
  const [roomCode, setRoomCodeState] = useState<string>(getInitialRoomCode);
  const [realtimeStatus, setRealtimeStatus] = useState<'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED'>('CONNECTING');
  const [state, setState] = useState<GameState>(DEFAULT_INITIAL_STATE);
  const [undoStack, setUndoStack] = useState<ActionHistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<ActionHistoryEntry[]>([]);

  // Ref to hold the broadcast function from realtime channel
  const broadcastRef = useRef<((s: GameState) => void) | null>(null);
  const debouncePersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdateRef = useRef(false);

  // Sync room code to URL query params and localStorage
  const setRoomCode = useCallback((newRoom: string) => {
    const clean = newRoom.toUpperCase().trim() || 'TABLE-1';
    setRoomCodeState(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem('snooker_active_room', clean);
      const url = new URL(window.location.href);
      url.searchParams.set('room', clean);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Update URL on first mount if room wasn't in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room') !== roomCode) {
        const url = new URL(window.location.href);
        url.searchParams.set('room', roomCode);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [roomCode]);

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

  // 1. Initial Load of Room State from Supabase / Local
  useEffect(() => {
    let isCancelled = false;

    getOrCreateLiveMatch(roomCode, DEFAULT_INITIAL_STATE).then(res => {
      if (!isCancelled && res.state) {
        setState(res.state);
      }
    });

    // 2. Setup Realtime Channel (Broadcast + Postgres Changes)
    const { broadcastState, unsubscribe } = subscribeToRoom(
      roomCode,
      (remoteState) => {
        // Received remote update from another player's phone!
        isRemoteUpdateRef.current = true;
        setState(remoteState);
        playTurnSwitchSound();
      },
      (status) => {
        setRealtimeStatus(status);
      }
    );

    broadcastRef.current = broadcastState;

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [roomCode]);

  // Helper to commit state changes locally, broadcast to other phones, and persist
  const dispatchStateChange = useCallback(
    (newState: GameState) => {
      setState(newState);

      // Broadcast immediately to all connected phones via WebSockets
      if (broadcastRef.current) {
        broadcastRef.current(newState);
      }

      // Persist to Supabase live_matches table (debounced 150ms)
      if (debouncePersistTimer.current) {
        clearTimeout(debouncePersistTimer.current);
      }
      debouncePersistTimer.current = setTimeout(() => {
        persistLiveMatchState(roomCode, newState);
      }, 150);
    },
    [roomCode]
  );

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

      const updatedPlayers = state.players.map((p, idx) => {
        if (idx === state.activePlayerIndex) {
          return {
            ...p,
            score: p.score + points,
            currentBreak: p.currentBreak + points,
          };
        }
        return p;
      });

      const next = {
        ...state,
        players: updatedPlayers,
      };

      dispatchStateChange(next);
    },
    [recordAction, state, dispatchStateChange]
  );

  /**
   * Apply foul points (directly deducts negative value or registers miss 0)
   */
  const applyFoul = useCallback(
    (foulPoints: number) => {
      const desc = foulPoints === 0 ? 'Miss (0)' : `Foul (${foulPoints})`;
      recordAction(desc);
      playFoulSound();

      const updatedPlayers = state.players.map((p, idx) => {
        if (idx === state.activePlayerIndex) {
          return {
            ...p,
            score: p.score + foulPoints,
            currentBreak: 0,
          };
        }
        return p;
      });

      const next = {
        ...state,
        players: updatedPlayers,
      };

      dispatchStateChange(next);
    },
    [recordAction, state, dispatchStateChange]
  );

  /**
   * Turn Over / Next Player
   */
  const nextPlayer = useCallback(() => {
    const currentName = state.players[state.activePlayerIndex]?.name || 'Player';
    recordAction(`Turn Over for ${currentName}`);
    playTurnSwitchSound();

    const nextIndex = (state.activePlayerIndex + 1) % state.players.length;
    const updatedPlayers = state.players.map((p, idx) => {
      if (idx === state.activePlayerIndex) {
        return {
          ...p,
          currentBreak: 0,
        };
      }
      return p;
    });

    const next = {
      ...state,
      players: updatedPlayers,
      activePlayerIndex: nextIndex,
      turnCount: state.turnCount + 1,
    };

    dispatchStateChange(next);
  }, [state, recordAction, dispatchStateChange]);

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

    playTurnSwitchSound();
    dispatchStateChange(lastEntry.state);
  }, [undoStack, cloneState, state, dispatchStateChange]);

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

    playTurnSwitchSound();
    dispatchStateChange(nextEntry.state);
  }, [redoStack, cloneState, state, dispatchStateChange]);

  /**
   * Initialize a new match session with custom player names
   */
  const startNewGame = useCallback(
    (playerNames: string[]) => {
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

      setUndoStack([]);
      setRedoStack([]);
      dispatchStateChange(newState);
    },
    [state.doubleTapMode, dispatchStateChange]
  );

  /**
   * Toggle Double-Tap Commit vs Instant Single-Tap
   */
  const toggleDoubleTapMode = useCallback(() => {
    const next = {
      ...state,
      doubleTapMode: !state.doubleTapMode,
    };
    dispatchStateChange(next);
  }, [state, dispatchStateChange]);

  /**
   * Set Game Over status
   */
  const setGameOver = useCallback(
    (isOver: boolean) => {
      const next = {
        ...state,
        isGameOver: isOver,
      };
      dispatchStateChange(next);
    },
    [state, dispatchStateChange]
  );

  return {
    state,
    roomCode,
    realtimeStatus,
    setRoomCode,
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

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
  redsRemaining: 15,
  nextBallType: 'RED',
  colorSequenceIndex: 0,
};

// Generate a clean random 3-digit table number (100 to 999)
export function generateRandomTableCode(): string {
  return String(Math.floor(100 + Math.random() * 900));
}

function getInitialRoomCode(): string {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) return roomParam.toUpperCase().trim();

    const stored = localStorage.getItem('snooker_active_room');
    if (stored) return stored.toUpperCase().trim();
  }
  return generateRandomTableCode();
}

export function useSnookerGame() {
  const [roomCode, setRoomCodeState] = useState<string>(getInitialRoomCode);
  const [realtimeStatus, setRealtimeStatus] = useState<'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED'>('CONNECTING');
  const [state, setState] = useState<GameState>(DEFAULT_INITIAL_STATE);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const lastLocalActionTimeRef = useRef<number>(0);

  const [undoStack, setUndoStack] = useState<ActionHistoryEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(`snooker_undo_${roomCode}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const [redoStack, setRedoStack] = useState<ActionHistoryEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(`snooker_redo_${roomCode}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  // Sync undoStack & redoStack to sessionStorage for seamless page reloads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`snooker_undo_${roomCode}`, JSON.stringify(undoStack));
    }
  }, [undoStack, roomCode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`snooker_redo_${roomCode}`, JSON.stringify(redoStack));
    }
  }, [redoStack, roomCode]);

  // Ref to hold the broadcast function from realtime channel
  const broadcastRef = useRef<((s: GameState) => void) | null>(null);
  const debouncePersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdateRef = useRef(false);

  // Sync room code to URL query params and localStorage
  const setRoomCode = useCallback((newRoom: string) => {
    const clean = newRoom.toUpperCase().trim() || generateRandomTableCode();
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
      redsRemaining: s.redsRemaining !== undefined ? s.redsRemaining : 15,
      nextBallType: s.nextBallType || 'RED',
      colorSequenceIndex: s.colorSequenceIndex !== undefined ? s.colorSequenceIndex : 0,
    };
  }, []);

  // 1. Initial Load of Room State from Supabase / Local
  useEffect(() => {
    let isCancelled = false;

    getOrCreateLiveMatch(roomCode, DEFAULT_INITIAL_STATE).then(res => {
      if (!isCancelled && res.state) {
        setState({
          ...DEFAULT_INITIAL_STATE,
          ...res.state,
          redsRemaining: res.state.redsRemaining !== undefined ? res.state.redsRemaining : 15,
          nextBallType: res.state.nextBallType || 'RED',
          colorSequenceIndex: res.state.colorSequenceIndex !== undefined ? res.state.colorSequenceIndex : 0,
        });
      }
    });

    // 2. Setup Realtime Channel (Broadcast + Postgres Changes)
    const { broadcastState, unsubscribe } = subscribeToRoom(
      roomCode,
      (remoteState) => {
        // Prevent delayed Postgres echo from stomping over fresh local actions or undo within 1200ms
        if (Date.now() - lastLocalActionTimeRef.current < 1200) {
          return;
        }
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
      lastLocalActionTimeRef.current = Date.now();
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
      const snapshot = cloneState(stateRef.current);
      setUndoStack(prev => [
        ...prev,
        {
          state: snapshot,
          actionDescription,
          timestamp: Date.now(),
        },
      ]);
      setRedoStack([]);
    },
    [cloneState]
  );

  /**
   * Commit positive ball points to the active player with 15-red and color sequence progression
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

      let nextReds = state.redsRemaining !== undefined ? state.redsRemaining : 15;
      let nextType = state.nextBallType || 'RED';
      let nextSeqIndex = state.colorSequenceIndex || 0;

      if (ballName === 'Red') {
        // Red potted! Decrement overall reds count
        nextReds = Math.max(0, nextReds - 1);
        // Player now gets a shot at any color
        nextType = 'COLOR';
      } else {
        // A Color ball was potted (+2 to +7)
        if (nextReds > 0) {
          // If reds remain on the table, next ball is back to RED
          nextType = 'RED';
        } else {
          // All 15 reds have been potted!
          if (nextType === 'COLOR') {
            // This was the color after the 15th red!
            // Now start the official Colors Sequence (Yellow -> Green -> Brown -> Blue -> Pink -> Black)
            nextType = 'COLOR_SEQUENCE';
            nextSeqIndex = 0; // Yellow
          } else if (nextType === 'COLOR_SEQUENCE') {
            // Advance sequence
            nextSeqIndex = nextSeqIndex + 1;
          }
        }
      }

      const next: GameState = {
        ...state,
        players: updatedPlayers,
        redsRemaining: nextReds,
        nextBallType: nextType,
        colorSequenceIndex: nextSeqIndex,
      };

      dispatchStateChange(next);
    },
    [recordAction, state, dispatchStateChange]
  );

  /**
   * Apply foul points (directly deducts negative value or registers miss 0)
   */
  const applyFoul = useCallback(
    (foulPoints: number, reason?: string) => {
      const desc = reason || (foulPoints === 0 ? 'Miss (0)' : `Foul (${foulPoints})`);
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

      let nextType = state.nextBallType || 'RED';
      let nextSeqIndex = state.colorSequenceIndex || 0;
      const reds = state.redsRemaining !== undefined ? state.redsRemaining : 15;

      if (reds > 0) {
        nextType = 'RED';
      } else {
        nextType = 'COLOR_SEQUENCE';
        if (state.nextBallType === 'COLOR') {
          nextSeqIndex = 0; // Miss/foul on bonus color -> start colors sequence at Yellow
        }
      }

      const next: GameState = {
        ...state,
        players: updatedPlayers,
        nextBallType: nextType,
        colorSequenceIndex: nextSeqIndex,
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

    let nextType = state.nextBallType || 'RED';
    let nextSeqIndex = state.colorSequenceIndex || 0;
    const reds = state.redsRemaining !== undefined ? state.redsRemaining : 15;

    if (reds > 0) {
      nextType = 'RED';
    } else {
      nextType = 'COLOR_SEQUENCE';
      if (state.nextBallType === 'COLOR') {
        nextSeqIndex = 0; // Turn over on bonus color -> start colors sequence at Yellow
      }
    }

    const next: GameState = {
      ...state,
      players: updatedPlayers,
      activePlayerIndex: nextIndex,
      turnCount: state.turnCount + 1,
      nextBallType: nextType,
      colorSequenceIndex: nextSeqIndex,
    };

    dispatchStateChange(next);
  }, [state, recordAction, dispatchStateChange]);

  /**
   * Revert to previous action state
   */
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;

    lastLocalActionTimeRef.current = Date.now();
    const lastEntry = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));

    setRedoStack(prev => [
      ...prev,
      {
        state: cloneState(stateRef.current),
        actionDescription: 'Current State',
        timestamp: Date.now(),
      },
    ]);

    playTurnSwitchSound();
    dispatchStateChange(lastEntry.state);
  }, [undoStack, cloneState, dispatchStateChange]);

  /**
   * Redo action state
   */
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    lastLocalActionTimeRef.current = Date.now();
    const nextEntry = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));

    setUndoStack(prev => [
      ...prev,
      {
        state: cloneState(stateRef.current),
        actionDescription: 'Pre-Redo State',
        timestamp: Date.now(),
      },
    ]);

    playTurnSwitchSound();
    dispatchStateChange(nextEntry.state);
  }, [redoStack, cloneState, dispatchStateChange]);

  /**
   * Initialize a new match session with custom player names and fresh 3-digit table number
   */
  const startNewGame = useCallback(
    (playerNames: string[]) => {
      const validNames = playerNames.slice(0, 6);
      const names = validNames.length >= 2 ? validNames : ['Player 1', 'Player 2'];
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
        redsRemaining: 15,
        nextBallType: 'RED',
        colorSequenceIndex: 0,
      };

      // Regenerate fresh random 3-digit table number for new match
      const newTableCode = generateRandomTableCode();
      setRoomCode(newTableCode);

      setUndoStack([]);
      setRedoStack([]);
      dispatchStateChange(newState);
    },
    [state.doubleTapMode, setRoomCode, dispatchStateChange]
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
    lastUndoDescription: undoStack[undoStack.length - 1]?.actionDescription || '',
    lastRedoDescription: redoStack[redoStack.length - 1]?.actionDescription || '',
    startNewGame,
    toggleDoubleTapMode,
    setGameOver,
  };
}

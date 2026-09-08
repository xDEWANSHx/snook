import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState, Player, ActionHistoryEntry } from '../types';
import { playBallClackSound, playFoulSound, playTurnSwitchSound } from '../utils/audio';
import {
  getOrCreateLiveMatch,
  persistLiveMatchState,
  subscribeToRoom,
  fetchLiveMatchState,
  normalizeRoomCode,
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
    if (roomParam) return normalizeRoomCode(roomParam);
  }
  return '';
}

function getInitialGameState(room: string): GameState {
  if (room && typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`snooker_room_${room}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.players) && parsed.players.length >= 2) {
          return {
            ...DEFAULT_INITIAL_STATE,
            ...parsed,
            redsRemaining: parsed.redsRemaining !== undefined ? parsed.redsRemaining : 15,
            nextBallType: parsed.nextBallType || 'RED',
            colorSequenceIndex: parsed.colorSequenceIndex !== undefined ? parsed.colorSequenceIndex : 0,
          };
        }
      }
    } catch {}
  }
  return DEFAULT_INITIAL_STATE;
}

export function useSnookerGame() {
  const initialRoom = getInitialRoomCode();
  const [roomCode, setRoomCodeState] = useState<string>(initialRoom);
  const [realtimeStatus, setRealtimeStatus] = useState<'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED'>(
    initialRoom ? 'CONNECTING' : 'DISCONNECTED'
  );
  const [state, setState] = useState<GameState>(() => getInitialGameState(initialRoom));
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const roomCodeRef = useRef(roomCode);
  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  const lastLocalActionTimeRef = useRef<number>(0);
  const pendingInitialStateRef = useRef<{ roomCode: string; state: GameState } | null>(null);

  const [undoStack, setUndoStack] = useState<ActionHistoryEntry[]>(() => {
    if (initialRoom && typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(`snooker_undo_${initialRoom}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const [redoStack, setRedoStack] = useState<ActionHistoryEntry[]>(() => {
    if (initialRoom && typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(`snooker_redo_${initialRoom}`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  // Sync undoStack & redoStack to sessionStorage
  useEffect(() => {
    if (roomCode && typeof window !== 'undefined') {
      sessionStorage.setItem(`snooker_undo_${roomCode}`, JSON.stringify(undoStack));
    }
  }, [undoStack, roomCode]);

  useEffect(() => {
    if (roomCode && typeof window !== 'undefined') {
      sessionStorage.setItem(`snooker_redo_${roomCode}`, JSON.stringify(redoStack));
    }
  }, [redoStack, roomCode]);

  const broadcastRef = useRef<((s: GameState) => void) | null>(null);
  const requestPeerStateRef = useRef<(() => void) | null>(null);
  const debouncePersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Switch or set room code
  const setRoomCode = useCallback((newRoom: string) => {
    const clean = normalizeRoomCode(newRoom);
    if (!clean) return;
    roomCodeRef.current = clean;
    setRoomCodeState(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem('snooker_active_room', clean);
      const url = new URL(window.location.href);
      url.searchParams.set('room', clean);
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Exit back to landing screen
  const exitToLanding = useCallback(() => {
    roomCodeRef.current = '';
    setRoomCodeState('');
    setUndoStack([]);
    setRedoStack([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('snooker_active_room');
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

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

  // 1. Initial Load of Room State from Supabase / Local and Realtime Subscription
  useEffect(() => {
    if (!roomCode) {
      setRealtimeStatus('DISCONNECTED');
      return;
    }

    let isCancelled = false;

    // Determine initial state candidate
    let initialToUse = DEFAULT_INITIAL_STATE;
    const pending = pendingInitialStateRef.current;
    if (pending && pending.roomCode === roomCode) {
      initialToUse = pending.state;
      pendingInitialStateRef.current = null;
    } else if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(`snooker_room_${roomCode}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.players) && parsed.players.length >= 2) {
            initialToUse = {
              ...DEFAULT_INITIAL_STATE,
              ...parsed,
              redsRemaining: parsed.redsRemaining !== undefined ? parsed.redsRemaining : 15,
              nextBallType: parsed.nextBallType || 'RED',
              colorSequenceIndex: parsed.colorSequenceIndex !== undefined ? parsed.colorSequenceIndex : 0,
            };
          }
        } catch {}
      }
    }

    // Fetch existing live match
    getOrCreateLiveMatch(roomCode, initialToUse).then(res => {
      if (!isCancelled && res.state) {
        setState({
          ...initialToUse,
          ...res.state,
          redsRemaining: res.state.redsRemaining !== undefined ? res.state.redsRemaining : 15,
          nextBallType: res.state.nextBallType || 'RED',
          colorSequenceIndex: res.state.colorSequenceIndex !== undefined ? res.state.colorSequenceIndex : 0,
        });
      }
    });

    // 2. Setup Realtime Channel with Peer Handshake
    const { broadcastState, requestPeerState, unsubscribe } = subscribeToRoom({
      roomCode,
      getCurrentState: () => stateRef.current,
      onRemoteState: (remoteState) => {
        // Prevent stale echo from overwriting immediate local interaction within 1200ms
        if (Date.now() - lastLocalActionTimeRef.current < 1200) {
          return;
        }
        setState(remoteState);
        playTurnSwitchSound();
      },
      onStatusChange: (status) => {
        setRealtimeStatus(status);
      },
    });

    broadcastRef.current = broadcastState;
    requestPeerStateRef.current = requestPeerState;

    // Immediately request current score from any peers in room
    requestPeerState();

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [roomCode]);

  // 3. Auto-re-sync when tab regains focus or phone screen wakes up
  useEffect(() => {
    if (!roomCode) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchLiveMatchState(roomCode).then(freshState => {
          if (freshState && Date.now() - lastLocalActionTimeRef.current > 1200) {
            setState(freshState);
          }
        });
        requestPeerStateRef.current?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [roomCode]);

  // Helper to commit state changes locally, broadcast to other phones, and persist
  const dispatchStateChange = useCallback((newState: GameState) => {
    lastLocalActionTimeRef.current = Date.now();
    setState(newState);

    // Broadcast immediately via WebSockets & BroadcastChannel
    if (broadcastRef.current) {
      broadcastRef.current(newState);
    }

    // Persist to Supabase live_matches table & local storage
    if (debouncePersistTimer.current) {
      clearTimeout(debouncePersistTimer.current);
    }
    const targetRoom = roomCodeRef.current;
    if (targetRoom) {
      debouncePersistTimer.current = setTimeout(() => {
        persistLiveMatchState(targetRoom, newState);
      }, 150);
    }
  }, []);

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
      if (state.isGameOver) return;

      let nextReds = state.redsRemaining !== undefined ? state.redsRemaining : 15;
      let nextType = state.nextBallType || 'RED';
      let nextSeqIndex = state.colorSequenceIndex || 0;

      if (ballName === 'Red') {
        nextReds = Math.max(0, nextReds - 1);
        nextType = 'COLOR';
      } else {
        if (nextReds > 0) {
          nextType = 'RED';
        } else {
          if (nextType === 'COLOR') {
            nextType = 'COLOR_SEQUENCE';
            nextSeqIndex = 0;
          } else if (nextType === 'COLOR_SEQUENCE') {
            nextSeqIndex = nextSeqIndex + 1;
          }
        }
      }

      const isFrameCleared = (state.nextBallType === 'COLOR_SEQUENCE' && ballName === 'Black') || nextSeqIndex >= 6;

      if (isFrameCleared) {
        recordAction(`Potted ${ballName} (+${points}) — All Balls Cleared! 🏆`);
      } else {
        recordAction(`Potted ${ballName} (+${points})`);
      }
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

      const next: GameState = {
        ...state,
        players: updatedPlayers,
        redsRemaining: nextReds,
        nextBallType: nextType,
        colorSequenceIndex: nextSeqIndex,
        isGameOver: isFrameCleared ? true : state.isGameOver,
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
      if (state.isGameOver) return;

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
          nextSeqIndex = 0;
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
   * Turn Over / Next Player (Rotates turn strictly in sequence)
   */
  const nextPlayer = useCallback(() => {
    if (state.isGameOver) return;

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
        nextSeqIndex = 0;
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
    if (undoStack.length === 0 || state.isGameOver) return;

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
  }, [undoStack, state.isGameOver, cloneState, dispatchStateChange]);

  /**
   * Redo action state
   */
  const redo = useCallback(() => {
    if (redoStack.length === 0 || state.isGameOver) return;

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
  }, [redoStack, state.isGameOver, cloneState, dispatchStateChange]);

  /**
   * Initialize a new match session with custom player names and assign fresh 3-digit table number
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
        doubleTapMode: stateRef.current.doubleTapMode,
        redsRemaining: 15,
        nextBallType: 'RED',
        colorSequenceIndex: 0,
      };

      // Assign fresh random 3-digit table number
      const newTableCode = generateRandomTableCode();

      lastLocalActionTimeRef.current = Date.now();
      pendingInitialStateRef.current = {
        roomCode: newTableCode,
        state: newState,
      };

      setUndoStack([]);
      setRedoStack([]);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`snooker_undo_${newTableCode}`);
        sessionStorage.removeItem(`snooker_redo_${newTableCode}`);
        localStorage.setItem(`snooker_room_${newTableCode}`, JSON.stringify(newState));
      }

      // Persist immediately to Supabase
      persistLiveMatchState(newTableCode, newState);

      // Set room code, update URL, state and refs
      roomCodeRef.current = newTableCode;
      setRoomCode(newTableCode);
      setState(newState);
      stateRef.current = newState;
    },
    [setRoomCode]
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
   * Set Game Over status (locks down frame across all connected devices)
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
    hasActiveMatch: Boolean(roomCode),
    realtimeStatus,
    setRoomCode,
    exitToLanding,
    activePlayer: state.players[state.activePlayerIndex],
    canUndo: undoStack.length > 0 && !state.isGameOver,
    canRedo: redoStack.length > 0 && !state.isGameOver,
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

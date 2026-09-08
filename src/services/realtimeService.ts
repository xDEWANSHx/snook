import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import type { GameState } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveRoomResponse {
  state: GameState;
  source: 'supabase' | 'local';
}

/**
 * Clean and normalize room codes so "TABLE-482", "Table 482", and "482" match identically
 */
export function normalizeRoomCode(roomCode: string): string {
  if (!roomCode) return '';
  return roomCode
    .toUpperCase()
    .replace(/^TABLE[-_\s]*/i, '')
    .trim();
}

/**
 * Fetch existing room state from Supabase or localStorage
 */
export async function fetchLiveMatchState(roomCode: string): Promise<GameState | null> {
  const normalized = normalizeRoomCode(roomCode);
  if (!normalized) return null;

  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('live_matches')
        .select('state')
        .eq('room_code', normalized)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data && data.state) {
        return data.state as GameState;
      }
    } catch (e) {
      console.warn('Error fetching live match state from Supabase:', e);
    }
  }

  // Fallback to local storage
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(`snooker_room_${normalized}`);
      if (local) {
        return JSON.parse(local) as GameState;
      }
    } catch {}
  }

  return null;
}

/**
 * Fetch existing room state or create one in Supabase
 */
export async function getOrCreateLiveMatch(
  roomCode: string,
  initialState: GameState
): Promise<LiveRoomResponse> {
  const normalizedRoom = normalizeRoomCode(roomCode);
  const supabase = getSupabaseClient();

  if (!supabase || !isSupabaseConfigured()) {
    // Fallback to local storage for testing when offline
    const local = localStorage.getItem(`snooker_room_${normalizedRoom}`);
    if (local) {
      try {
        return { state: JSON.parse(local), source: 'local' };
      } catch {
        // ignore
      }
    }
    localStorage.setItem(`snooker_room_${normalizedRoom}`, JSON.stringify(initialState));
    return { state: initialState, source: 'local' };
  }

  try {
    // 1. Check if room exists
    const { data, error } = await supabase
      .from('live_matches')
      .select('state')
      .eq('room_code', normalizedRoom)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('Error fetching live match:', error);
    }

    if (data && data.state) {
      return { state: data.state as GameState, source: 'supabase' };
    }

    // 2. Create new live match row
    const { error: insertError } = await supabase
      .from('live_matches')
      .upsert(
        {
          room_code: normalizedRoom,
          state: initialState,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'room_code' }
      );

    if (insertError) {
      console.warn('Error creating/upserting live match row:', insertError);
    }

    return { state: initialState, source: 'supabase' };
  } catch (err) {
    console.warn('Supabase live match exception:', err);
    return { state: initialState, source: 'local' };
  }
}

/**
 * Save state update to Supabase live_matches table and local storage
 */
export async function persistLiveMatchState(roomCode: string, state: GameState) {
  const normalizedRoom = normalizeRoomCode(roomCode);
  if (!normalizedRoom) return;

  // Save to local storage cache
  if (typeof window !== 'undefined') {
    localStorage.setItem(`snooker_room_${normalizedRoom}`, JSON.stringify(state));
  }

  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return;

  try {
    const { error } = await supabase
      .from('live_matches')
      .upsert(
        {
          room_code: normalizedRoom,
          state,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'room_code' }
      );

    if (error) {
      console.warn('Failed to upsert live match state:', error);
    }
  } catch (err) {
    console.warn('Failed to persist live match state:', err);
  }
}

export interface RoomSubscriptionOptions {
  roomCode: string;
  onRemoteState: (state: GameState) => void;
  getCurrentState?: () => GameState;
  onStatusChange?: (status: 'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED') => void;
}

/**
 * Realtime multi-phone subscription with dual WebSockets, BroadcastChannel, and peer catch-up
 */
export function subscribeToRoom({
  roomCode,
  onRemoteState,
  getCurrentState,
  onStatusChange,
}: RoomSubscriptionOptions): {
  broadcastState: (state: GameState) => void;
  requestPeerState: () => void;
  unsubscribe: () => void;
} {
  const normalizedRoom = normalizeRoomCode(roomCode);
  const supabase = getSupabaseClient();

  // 1. Setup local browser multi-tab BroadcastChannel for zero-latency same-device sync
  let localChannel: BroadcastChannel | null = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      localChannel = new BroadcastChannel(`snooker_bc_${normalizedRoom}`);
      localChannel.onmessage = (event) => {
        if (event.data?.type === 'STATE_CHANGE' && event.data?.state) {
          onRemoteState(event.data.state as GameState);
        } else if (event.data?.type === 'REQUEST_STATE') {
          const current = getCurrentState?.();
          if (current) {
            localChannel?.postMessage({
              type: 'STATE_CHANGE',
              state: current,
            });
          }
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }

  if (!supabase || !isSupabaseConfigured()) {
    onStatusChange?.('DISCONNECTED');
    return {
      broadcastState: (state: GameState) => {
        localChannel?.postMessage({ type: 'STATE_CHANGE', state });
      },
      requestPeerState: () => {
        localChannel?.postMessage({ type: 'REQUEST_STATE' });
      },
      unsubscribe: () => {
        localChannel?.close();
      },
    };
  }

  onStatusChange?.('CONNECTING');

  const channel: RealtimeChannel = supabase.channel(`snook_room:${normalizedRoom}`, {
    config: {
      broadcast: { self: false },
    },
  });

  // Handle incoming broadcasts from other phones
  channel.on('broadcast', { event: 'STATE_CHANGE' }, (payload) => {
    if (payload?.payload?.state) {
      onRemoteState(payload.payload.state as GameState);
    }
  });

  // Peer Handshake: A new device just joined and is asking for current cumulative score
  channel.on('broadcast', { event: 'REQUEST_STATE' }, () => {
    const currentState = getCurrentState?.();
    if (currentState) {
      try {
        channel.send({
          type: 'broadcast',
          event: 'SYNC_STATE',
          payload: { state: currentState },
        });
      } catch {}
    }
  });

  // Receive live state from existing peer in room
  channel.on('broadcast', { event: 'SYNC_STATE' }, (payload) => {
    if (payload?.payload?.state) {
      onRemoteState(payload.payload.state as GameState);
    }
  });

  // Postgres change listener as backup persistence sync (INSERT or UPDATE)
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'live_matches',
      filter: `room_code=eq.${normalizedRoom}`,
    },
    (payload) => {
      if (payload?.new && (payload.new as { state?: GameState }).state) {
        onRemoteState((payload.new as { state: GameState }).state);
      }
    }
  );

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      onStatusChange?.('SUBSCRIBED');
      // Immediately request state from any active peers in the room
      try {
        channel.send({
          type: 'broadcast',
          event: 'REQUEST_STATE',
          payload: {},
        });
      } catch {}
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      onStatusChange?.('DISCONNECTED');
    }
  });

  const broadcastState = (state: GameState) => {
    // 1. Post to local browser tabs
    localChannel?.postMessage({ type: 'STATE_CHANGE', state });

    // 2. Send over Supabase WebSocket to other phones
    try {
      channel.send({
        type: 'broadcast',
        event: 'STATE_CHANGE',
        payload: { state },
      });
    } catch (e) {
      console.warn('Broadcast send error:', e);
    }
  };

  const requestPeerState = () => {
    localChannel?.postMessage({ type: 'REQUEST_STATE' });
    try {
      channel.send({
        type: 'broadcast',
        event: 'REQUEST_STATE',
        payload: {},
      });
    } catch {}
  };

  const unsubscribe = () => {
    localChannel?.close();
    supabase.removeChannel(channel);
  };

  return {
    broadcastState,
    requestPeerState,
    unsubscribe,
  };
}

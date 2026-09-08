import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import type { GameState } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveRoomResponse {
  state: GameState;
  source: 'supabase' | 'local';
}

/**
 * Fetch existing room state or create one in Supabase
 */
export async function getOrCreateLiveMatch(
  roomCode: string,
  initialState: GameState
): Promise<LiveRoomResponse> {
  const supabase = getSupabaseClient();
  const normalizedRoom = roomCode.toUpperCase().trim();

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
      .insert({
        room_code: normalizedRoom,
        state: initialState,
      });

    if (insertError) {
      console.warn('Error creating live match row:', insertError);
    }

    return { state: initialState, source: 'supabase' };
  } catch (err) {
    console.warn('Supabase live match exception:', err);
    return { state: initialState, source: 'local' };
  }
}

/**
 * Save state update to Supabase live_matches table
 */
export async function persistLiveMatchState(roomCode: string, state: GameState) {
  const normalizedRoom = roomCode.toUpperCase().trim();

  // Save to local storage cache
  if (typeof window !== 'undefined') {
    localStorage.setItem(`snooker_room_${normalizedRoom}`, JSON.stringify(state));
  }

  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) return;

  try {
    await supabase
      .from('live_matches')
      .upsert(
        {
          room_code: normalizedRoom,
          state,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'room_code' }
      );
  } catch (err) {
    console.warn('Failed to persist live match state:', err);
  }
}

/**
 * Realtime subscription with dual Broadcast (<30ms) & Postgres Changes
 */
export function subscribeToRoom(
  roomCode: string,
  onRemoteState: (state: GameState) => void,
  onStatusChange?: (status: 'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED') => void
): {
  broadcastState: (state: GameState) => void;
  unsubscribe: () => void;
} {
  const supabase = getSupabaseClient();
  const normalizedRoom = roomCode.toUpperCase().trim();

  if (!supabase || !isSupabaseConfigured()) {
    onStatusChange?.('DISCONNECTED');
    return {
      broadcastState: () => {},
      unsubscribe: () => {},
    };
  }

  onStatusChange?.('CONNECTING');

  const channel: RealtimeChannel = supabase.channel(`room:${normalizedRoom}`, {
    config: {
      broadcast: { self: false }, // don't receive our own broadcast back
    },
  });

  // 1. Ultra-low latency WebSocket broadcast (~20ms)
  channel.on('broadcast', { event: 'STATE_CHANGE' }, (payload) => {
    if (payload?.payload?.state) {
      onRemoteState(payload.payload.state as GameState);
    }
  });

  // 2. Postgres change listener as backup synchronization
  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
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
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      onStatusChange?.('DISCONNECTED');
    }
  });

  const broadcastState = (state: GameState) => {
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

  const unsubscribe = () => {
    supabase.removeChannel(channel);
  };

  return {
    broadcastState,
    unsubscribe,
  };
}

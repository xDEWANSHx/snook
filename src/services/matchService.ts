import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import type { MatchRecord, MatchPlayerRecord } from '../types';

const LOCAL_STORAGE_KEY = 'snooker_local_match_history';

export interface SaveMatchPayload {
  player_count: number;
  winner_names: string[];
  duration_seconds: number;
  players: {
    player_name: string;
    final_score: number;
    rank: number;
  }[];
}

/**
 * Retrieve local match history from localStorage
 */
function getLocalMatches(): MatchRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error loading local match history:', e);
    return [];
  }
}

/**
 * Save match to local storage cache
 */
function saveLocalMatch(record: MatchRecord) {
  if (typeof window === 'undefined') return;
  try {
    const matches = getLocalMatches();
    const filtered = matches.filter(m => m.id !== record.id);
    const updated = [record, ...filtered];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving match locally:', e);
  }
}

/**
 * Save match and player records in Supabase (or fallback locally if offline)
 */
export async function saveMatch(
  payload: SaveMatchPayload
): Promise<{ success: boolean; matchId: string; source: 'supabase' | 'local'; error?: string }> {
  const matchId = crypto.randomUUID ? crypto.randomUUID() : `match_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const createdAt = new Date().toISOString();

  // Local record representation
  const localRecord: MatchRecord = {
    id: matchId,
    created_at: createdAt,
    player_count: payload.player_count,
    winner_names: payload.winner_names,
    duration_seconds: payload.duration_seconds,
    match_players: payload.players.map(p => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `mp_${Math.random().toString(36).substring(2, 9)}`,
      match_id: matchId,
      player_name: p.player_name,
      final_score: p.final_score,
      rank: p.rank,
    })),
  };

  // Always save locally for instant UI responsiveness and offline safety
  saveLocalMatch(localRecord);

  const supabase = getSupabaseClient();
  if (!supabase || !isSupabaseConfigured()) {
    return {
      success: true,
      matchId,
      source: 'local',
    };
  }

  try {
    // 1. Insert into matches table
    const { data: matchRow, error: matchError } = await supabase
      .from('matches')
      .insert({
        id: matchId,
        created_at: createdAt,
        player_count: payload.player_count,
        winner_names: payload.winner_names,
        duration_seconds: payload.duration_seconds,
      })
      .select()
      .single();

    if (matchError) {
      console.warn('Supabase match insert error:', matchError);
      return {
        success: true,
        matchId,
        source: 'local',
        error: matchError.message,
      };
    }

    const insertedMatchId = matchRow?.id || matchId;

    // 2. Batch insert into match_players table
    const playersToInsert = payload.players.map(p => ({
      match_id: insertedMatchId,
      player_name: p.player_name,
      final_score: p.final_score,
      rank: p.rank,
    }));

    const { error: playersError } = await supabase
      .from('match_players')
      .insert(playersToInsert);

    if (playersError) {
      console.warn('Supabase match_players insert error:', playersError);
      return {
        success: true,
        matchId: insertedMatchId,
        source: 'local',
        error: playersError.message,
      };
    }

    return {
      success: true,
      matchId: insertedMatchId,
      source: 'supabase',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('Exception during Supabase sync:', errorMsg);
    return {
      success: true,
      matchId,
      source: 'local',
      error: errorMsg,
    };
  }
}

/**
 * Fetch past match records ordered by date descending with players joined
 */
export async function getMatchHistory(): Promise<{ matches: MatchRecord[]; source: 'supabase' | 'local' }> {
  const supabase = getSupabaseClient();

  if (!supabase || !isSupabaseConfigured()) {
    return {
      matches: getLocalMatches(),
      source: 'local',
    };
  }

  try {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        id,
        created_at,
        player_count,
        winner_names,
        duration_seconds,
        match_players (
          id,
          match_id,
          player_name,
          final_score,
          rank
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error querying Supabase matches:', error);
      return {
        matches: getLocalMatches(),
        source: 'local',
      };
    }

    if (data && Array.isArray(data)) {
      const records: MatchRecord[] = data.map((item: {
        id: string;
        created_at: string;
        player_count: number;
        winner_names: string[];
        duration_seconds?: number;
        match_players?: MatchPlayerRecord[];
      }) => ({
        id: item.id,
        created_at: item.created_at,
        player_count: item.player_count,
        winner_names: item.winner_names,
        duration_seconds: item.duration_seconds || 0,
        match_players: (item.match_players || []).sort((a, b) => a.rank - b.rank),
      }));

      // Cache fresh remote records locally
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
      }

      return {
        matches: records,
        source: 'supabase',
      };
    }

    return {
      matches: getLocalMatches(),
      source: 'local',
    };
  } catch (e) {
    console.warn('Failed to fetch from Supabase, returning local store:', e);
    return {
      matches: getLocalMatches(),
      source: 'local',
    };
  }
}

/**
 * Delete a match record
 */
export async function deleteMatch(matchId: string): Promise<boolean> {
  // 1. Remove from local store
  if (typeof window !== 'undefined') {
    const matches = getLocalMatches();
    const updated = matches.filter(m => m.id !== matchId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }

  // 2. Remove from Supabase if connected
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.from('matches').delete().eq('id', matchId);
    } catch (e) {
      console.warn('Error deleting match in Supabase:', e);
    }
  }

  return true;
}

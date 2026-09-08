-- ==============================================================================
-- SNOOKER SCOREBOARD DATABASE SCHEMA FOR SUPABASE (ONLINE-FIRST + REALTIME)
-- ==============================================================================

-- 1. Live Matches Table (For Realtime Multi-Device Sync across phones)
CREATE TABLE IF NOT EXISTS live_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT UNIQUE NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Matches Table (Archived / Finalized Frames)
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    player_count INT NOT NULL CHECK (player_count BETWEEN 2 AND 6),
    winner_names TEXT[] NOT NULL,
    duration_seconds INT DEFAULT 0
);

-- 3. Match Players Table (Child table with CASCADE delete)
CREATE TABLE IF NOT EXISTS match_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    final_score INT NOT NULL,
    rank INT NOT NULL
);

-- 4. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_live_matches_room_code ON live_matches(room_code);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON match_players(match_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE live_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;

-- 6. Open Public Access Policies (Safe for public scoreboard rooms)
CREATE POLICY "Allow public all live_matches" 
    ON live_matches FOR ALL 
    USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read matches" 
    ON matches FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert matches" 
    ON matches FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public read match_players" 
    ON match_players FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert match_players" 
    ON match_players FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public delete matches" 
    ON matches FOR DELETE 
    USING (true);

-- 7. Enable Supabase Realtime for live_matches
ALTER PUBLICATION supabase_realtime ADD TABLE live_matches;

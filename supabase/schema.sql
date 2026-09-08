-- ==============================================================================
-- SNOOKER SCOREBOARD DATABASE SCHEMA FOR SUPABASE
-- ==============================================================================

-- 1. Matches Table
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    player_count INT NOT NULL CHECK (player_count BETWEEN 2 AND 4),
    winner_names TEXT[] NOT NULL,
    duration_seconds INT DEFAULT 0
);

-- 2. Match Players Table (Child table with CASCADE delete)
CREATE TABLE IF NOT EXISTS match_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    final_score INT NOT NULL,
    rank INT NOT NULL
);

-- 3. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON match_players(match_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;

-- 5. Open Public Access Policies (Safe for client scoreboard logging)
-- Allow anyone to read matches and match_players
CREATE POLICY "Allow public read matches" 
    ON matches FOR SELECT 
    USING (true);

CREATE POLICY "Allow public read match_players" 
    ON match_players FOR SELECT 
    USING (true);

-- Allow anyone to insert matches and match_players
CREATE POLICY "Allow public insert matches" 
    ON matches FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow public insert match_players" 
    ON match_players FOR INSERT 
    WITH CHECK (true);

-- Allow deleting match records (cascades to match_players)
CREATE POLICY "Allow public delete matches" 
    ON matches FOR DELETE 
    USING (true);

-- ==============================================================================
-- Sample verification query:
-- SELECT m.*, json_agg(mp.*) as players
-- FROM matches m
-- LEFT JOIN match_players mp ON m.id = mp.match_id
-- GROUP BY m.id
-- ORDER BY m.created_at DESC;
-- ==============================================================================

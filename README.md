# Snook 🎱 | Mobile-First Snooker Scoreboard & Match Tracker

A super-fast, responsive, mobile-first Snooker Scoreboard and Match History web application designed specifically for quick one-handed / thumb operation beside the pool table, with seamless Supabase cloud persistence and offline fallback.

![Snook App Banner](https://raw.githubusercontent.com/xDEWANSHx/snook/main/public/preview.png)

## ✨ Key Features

- **📡 Realtime Multi-Device Sync**: Any number of players beside the pool table can open the match link on their mobile phones and control/view the live scoreboard simultaneously with sub-50ms Supabase Realtime synchronization!
- **📱 Mobile-First Thumb Ergonomics**: Designed for single-handed table-side operation with `touch-action: manipulation` for zero-delay taps.
- **🎱 Authentic Tactile Aesthetics**: Warm vintage chalk white (`#FAF8F5`) canvas with subtle noise grain overlay, realistic 3D radial sphere snooker balls with specular shine highlights.
- **⚡ Dual Commit Interaction**: Double-tap points commit mode to prevent accidental brushes, with an instant toggle for express single-tap scoring.
- **⚠️ Dedicated Foul Penalty Panel**: Hazard-styled panel for quick penalties (`0 (Miss)`, `-2`, `-3`, `-4`, `-5`, `-6`, `-7`) that directly deduct points from the active player's score and reset their break.
- **🔄 Full Action Stack (Undo & Redo)**: Deep immutable state snapshots for every ball potted, foul committed, or turn rotated.
- **🏆 Tie-Safe Ranking & Podium**: Automated standard competition rankings with joint-tie support (`Joint 1st Rank`, `Joint 2nd Rank`) and victory fanfare.
- **🔊 Procedural Sound & Haptics**: Procedural Web Audio API ball clack synthesis, foul buzzer, turn chime, victory fanfare, and `navigator.vibrate` haptic triggers — 100% offline capable with zero audio asset downloads needed.
- **☁️ Supabase Cloud Sync & Local-First**: Dual-layer persistence to Supabase Postgres database with automatic local storage fallback.
- **📜 Match History Drawer**: Filter and search completed matches by player name or winner with duration, timestamps, and full breakdown.

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/xDEWANSHx/snook.git
cd snook
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory (or set in Vercel):

```env
VITE_SUPABASE_URL=https://uptveukykfswvkhtxnar.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` on your mobile browser or desktop. Share the room link (`?room=TABLE-XX`) so everyone at the table can join the live frame!

---

## 🗄️ Supabase Database Schema

Run the following SQL script in your Supabase project's **SQL Editor**:

```sql
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
    player_count INT NOT NULL CHECK (player_count BETWEEN 2 AND 4),
    winner_names TEXT[] NOT NULL,
    duration_seconds INT DEFAULT 0
);

-- 3. Match Players Table
CREATE TABLE IF NOT EXISTS match_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    final_score INT NOT NULL,
    rank INT NOT NULL
);

-- 4. Indexes & Row Level Security
CREATE INDEX IF NOT EXISTS idx_live_matches_room_code ON live_matches(room_code);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON match_players(match_id);

ALTER TABLE live_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all live_matches" ON live_matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow public insert matches" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read match_players" ON match_players FOR SELECT USING (true);
CREATE POLICY "Allow public insert match_players" ON match_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete matches" ON matches FOR DELETE USING (true);

-- 5. Enable Supabase Realtime for live_matches
ALTER PUBLICATION supabase_realtime ADD TABLE live_matches;
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Custom 3D CSS Spheres, Noise Texture Filter
- **Icons**: Lucide React
- **Backend & Database**: Supabase (@supabase/supabase-js)
- **Audio & Haptics**: Procedural Web Audio API & Vibration API
- **Celebration**: Canvas Confetti

---

## 📄 License

MIT License © 2026 DEWANSH

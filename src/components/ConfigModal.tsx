import React, { useState } from 'react';
import { getSupabaseCredentials, saveCustomSupabaseCredentials, isSupabaseConfigured, getSupabaseClient } from '../lib/supabase';
import { X, Database, Check, Copy, AlertCircle, ShieldCheck } from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

const SQL_SCHEMA_SNIPPET = `-- 1. Live Matches (Realtime Multi-Phone Sync)
CREATE TABLE IF NOT EXISTS live_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT UNIQUE NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Matches Table (Archived)
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    player_count INT NOT NULL CHECK (player_count BETWEEN 2 AND 6),
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

-- 4. RLS & Realtime
ALTER TABLE live_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all live_matches" ON live_matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow public insert matches" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read match_players" ON match_players FOR SELECT USING (true);
CREATE POLICY "Allow public insert match_players" ON match_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete matches" ON matches FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE live_matches;`;

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, onConfigSaved }) => {
  const currentCreds = getSupabaseCredentials();
  const [url, setUrl] = useState(currentCreds.url);
  const [key, setKey] = useState(currentCreds.key);
  const [copiedSql, setCopiedSql] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomSupabaseCredentials(url, key);
    onConfigSaved();
    setTestStatus('Settings saved successfully!');
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_SNIPPET);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleTestConnection = async () => {
    setTestStatus('Testing connection...');
    saveCustomSupabaseCredentials(url, key);
    const client = getSupabaseClient();
    if (!client) {
      setTestStatus('❌ Please enter a valid URL and Anon Key');
      return;
    }

    try {
      const { error } = await client.from('matches').select('id').limit(1);
      if (error) {
        setTestStatus(`⚠️ Connected to Supabase, but: ${error.message} (Did you run the SQL schema?)`);
      } else {
        setTestStatus('✅ Connection successful! Supabase tables detected.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestStatus(`❌ Connection failed: ${msg}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF8F5] border border-stone-300 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-900 to-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-black">Supabase Cloud Sync</h2>
              <p className="text-xs text-stone-300">Database connection & SQL schema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-5">
          {/* Connection Status Banner */}
          <div
            className={`p-3 rounded-2xl flex items-center gap-3 border text-xs font-semibold ${
              isConfigured
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}
          >
            {isConfigured ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            )}
            <div>
              <p className="font-bold">
                {isConfigured ? 'Supabase Credentials Configured' : 'Running in Offline Local-First Mode'}
              </p>
              <p className="font-normal text-[11px] opacity-90">
                {isConfigured
                  ? 'Matches are automatically persisted to Supabase and synced across devices.'
                  : 'Scores are saved in browser storage. Enter credentials below or in .env to enable cloud sync.'}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                placeholder="https://your-project.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block mb-1">
                Supabase Anon / Public API Key
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {testStatus && (
              <div className="p-2.5 rounded-xl bg-stone-100 text-stone-800 text-xs font-medium border border-stone-200">
                {testStatus}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition border border-stone-300"
              >
                Test Connection
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition shadow-sm"
              >
                Save Credentials
              </button>
            </div>
          </form>

          {/* SQL Schema helper */}
          <div className="border-t border-stone-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Supabase SQL Schema
              </span>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:underline"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
              </button>
            </div>

            <pre className="p-3 rounded-xl bg-stone-900 text-stone-200 text-[11px] font-mono overflow-x-auto max-h-36 leading-relaxed border border-stone-800">
              {SQL_SCHEMA_SNIPPET}
            </pre>
            <p className="text-[11px] text-stone-500 mt-1.5">
              Paste this in your Supabase dashboard SQL Editor to create tables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

-- Adjust column names/types to match your existing D1 roster.

CREATE TABLE IF NOT EXISTS rostered_players (
  id TEXT PRIMARY KEY,
  pin TEXT NOT NULL UNIQUE,
  grade TEXT,
  name TEXT NOT NULL,
  team TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rostered_players_pin
  ON rostered_players(pin);

CREATE INDEX IF NOT EXISTS idx_rostered_players_team
  ON rostered_players(team);

-- One row per submitted vote.
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voter_player_id TEXT NOT NULL UNIQUE,
  voted_for_player_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_votes_target
  ON votes(voted_for_player_id);

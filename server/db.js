'use strict';
// SQLite through node:sqlite (built into Node 22), so the server has no
// dependencies to install. Migrations run in order on start and are recorded,
// so an existing database is only ever moved forward.
const fs = require('node:fs');
const path = require('node:path');

// node:sqlite prints an ExperimentalWarning on load. The API is stable for what
// we use; the warning only clutters the log, so it is filtered out here.
const origEmit = process.emitWarning;
process.emitWarning = function (warning, ...rest) {
  const text = typeof warning === 'string' ? warning : warning && warning.message;
  if (text && /SQLite is an experimental feature/.test(text)) return;
  return origEmit.call(this, warning, ...rest);
};
const { DatabaseSync } = require('node:sqlite');

const MIGRATIONS = [
  // 1: accounts, sessions, encrypted state, community, companies, config, reports
  `
  CREATE TABLE users (
    id            INTEGER PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
    created_at    INTEGER NOT NULL,
    last_login_at INTEGER
  );

  CREATE TABLE sessions (
    id         TEXT PRIMARY KEY,               -- sha256 of the cookie token
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX sessions_user ON sessions(user_id);

  -- Questionnaire answers, figures and balances, encrypted (AES-256-GCM).
  CREATE TABLE user_state (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    payload    BLOB NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE community_profiles (
    user_id      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    headline     TEXT NOT NULL DEFAULT '',
    linkedin     TEXT NOT NULL DEFAULT '',
    listed       INTEGER NOT NULL DEFAULT 1,
    updated_at   INTEGER NOT NULL
  );

  CREATE TABLE posts (
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag        TEXT NOT NULL DEFAULT 'Update',
    body       TEXT NOT NULL,
    link       TEXT NOT NULL DEFAULT '',
    hidden     INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX posts_created ON posts(created_at DESC);

  CREATE TABLE post_likes (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, user_id)
  );

  CREATE TABLE replies (
    id         INTEGER PRIMARY KEY,
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    hidden     INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX replies_post ON replies(post_id, created_at);

  CREATE TABLE connections (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, target_id)
  );

  -- Member reports on posts and replies, plus client-side error reports.
  CREATE TABLE reports (
    id          INTEGER PRIMARY KEY,
    kind        TEXT NOT NULL CHECK (kind IN ('post','reply','error')),
    target_id   INTEGER,
    reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reason      TEXT NOT NULL DEFAULT '',
    detail      TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
    created_at  INTEGER NOT NULL,
    resolved_at INTEGER
  );
  CREATE INDEX reports_status ON reports(status, created_at DESC);

  -- Company name -> domain -> logo, resolved once and cached.
  CREATE TABLE companies (
    key        TEXT PRIMARY KEY,               -- normalised name
    name       TEXT NOT NULL,
    domain     TEXT,
    source     TEXT NOT NULL DEFAULT 'auto',
    status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('found','missing','pending')),
    logo       BLOB,
    logo_type  TEXT,
    locked     INTEGER NOT NULL DEFAULT 0,     -- set by an admin; never overwritten
    checked_at INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE app_config (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE audit_log (
    id       INTEGER PRIMARY KEY,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action   TEXT NOT NULL,
    target   TEXT NOT NULL DEFAULT '',
    at       INTEGER NOT NULL
  );
  `,
  // 2: one-time password reset links, issued by an admin
  `
  CREATE TABLE password_resets (
    id         TEXT PRIMARY KEY,                -- sha256 of the token in the link
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at    INTEGER
  );
  `,
];

function open(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);');
  const done = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version));
  MIGRATIONS.forEach((sql, i) => {
    const version = i + 1;
    if (done.has(version)) return;
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(version, Date.now());
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  });
  return db;
}

module.exports = { open, MIGRATIONS };

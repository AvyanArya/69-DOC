'use strict';
// Consistent snapshot of the Lumera database while the server keeps running.
//
//   node scripts/backup.js                 # DATA_DIR/backups/lumera-<time>.db, keeps the newest 14
//   node scripts/backup.js /mnt/elsewhere  # write somewhere else
//   KEEP=30 node scripts/backup.js
//
// VACUUM INTO writes a complete, compacted copy in one transaction, so it is
// safe with WAL and concurrent writes. The copy is still encrypted the same
// way: restoring it needs the same DATA_ENCRYPTION_KEY, which is NOT in the
// file. Back the key up separately (a password manager or the host's secrets).
//
// Restore: stop the server, replace DATA_DIR/lumera.db with the backup
// (delete lumera.db-wal and lumera.db-shm), start the server.
const fs = require('node:fs');
const path = require('node:path');
const config = require('../server/config');
const { open } = require('../server/db');

const dest = path.resolve(process.argv[2] || path.join(config.DATA_DIR, 'backups'));
const keep = Math.max(1, Number(process.env.KEEP || 14));
const src = path.join(config.DATA_DIR, 'lumera.db');
if (!fs.existsSync(src)) { console.error(`No database at ${src}`); process.exit(1); }

fs.mkdirSync(dest, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 23);
const out = path.join(dest, `lumera-${stamp}.db`);
const db = open(src);
db.prepare('VACUUM INTO ?').run(out);
const check = open(out);
const ok = check.prepare('PRAGMA integrity_check').get();
const users = check.prepare('SELECT COUNT(*) AS n FROM users').get().n;
check.close();
db.close();
if (!ok || Object.values(ok)[0] !== 'ok') { console.error('Backup failed its integrity check: ' + JSON.stringify(ok)); process.exit(1); }
console.log(`Backed up ${users} accounts to ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);

const old = fs.readdirSync(dest).filter((f) => /^lumera-.*\.db$/.test(f)).sort().reverse().slice(keep);
for (const f of old) { fs.rmSync(path.join(dest, f)); console.log('Removed old backup ' + f); }

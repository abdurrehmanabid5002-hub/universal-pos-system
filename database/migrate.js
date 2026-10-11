const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://pos_user@localhost:5433/universal_pos';
  console.log(`[Migrate] Connecting to database...`);
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const appliedRes = await client.query('SELECT name FROM _migrations');
    const appliedSet = new Set(appliedRes.rows.map(r => r.name));

    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log(`[Migrate] Migrations directory not found: ${migrationsDir}`);
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[Migrate] Skipping already applied: ${file}`);
        continue;
      }

      console.log(`[Migrate] Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[Migrate] Successfully applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Migrate] Error executing ${file}:`, err);
        throw err;
      }
    }

    console.log('[Migrate] All migrations successfully applied!');
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runMigrations().catch(err => {
    console.error('[Migrate] Failed:', err);
    process.exit(1);
  });
}

module.exports = { runMigrations };

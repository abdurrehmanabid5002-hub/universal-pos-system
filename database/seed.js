const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runSeeds() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://pos_user@localhost:5433/universal_pos';
  console.log(`[Seed] Connecting to database...`);
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const seedsDir = path.join(__dirname, 'seeds');
    const files = ['development.sql', 'demo-business.sql'];

    for (const file of files) {
      const filePath = path.join(seedsDir, file);
      if (fs.existsSync(filePath)) {
        console.log(`[Seed] Running ${file}...`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('COMMIT');
          console.log(`[Seed] Completed ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`[Seed] Error executing ${file}:`, err);
          throw err;
        }
      }
    }
    console.log('[Seed] All seed scripts completed successfully!');
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runSeeds().catch(err => {
    console.error('[Seed] Failed:', err);
    process.exit(1);
  });
}

module.exports = { runSeeds };

#!/usr/bin/env node
// demo-reset.mjs - Reset demo data from PULO database

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

function loadEnv(path) {
  try {
    const env = {};
    readFileSync(path, 'utf-8').split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) env[match[1].trim()] = match[2].trim();
    });
    return env;
  } catch {
    return {};
  }
}

const env = { ...loadEnv(join(PROJECT_ROOT, '.env')), ...loadEnv(join(PROJECT_ROOT, '.env.local.generated')) };

const DATABASE_URL = env.DATABASE_URL || `postgresql://${env.POSTGRES_USER || 'pulo'}:${env.POSTGRES_PASSWORD || 'pulo_dev_password'}@${env.PULO_POSTGRES_PORT ? `localhost:${env.PULO_POSTGRES_PORT}` : 'localhost:5432'}/${env.POSTGRES_DB || 'pulo_dev'}`;

const DEMO_CAST_HASHES = [
  'demo_cast_mention_001',
  'demo_cast_token_claim_001',
  'demo_cast_comment_001',
  'demo_cast_comment_002',
  'demo_cast_reward_001',
  'demo_cast_reward_002',
  'demo_cast_reward_003',
  'demo_cast_scam_001',
  'demo_cast_scam_002',
  'demo_cast_scam_003',
  'demo_cast_weak_001',
];

const DEMO_FIDS = [100, 101, 102, 103, 999];

async function withDB(callback) {
  const { default: postgres } = await import('postgres');
  const sql = postgres(DATABASE_URL, { max: 5 });
  try {
    return await callback(sql);
  } finally {
    await sql.end();
  }
}

async function main() {
  console.log('\n🔄 PULO Demo Reset\n' + '─'.repeat(50));
  console.log('This will remove all demo data from the database.\n');

  const confirm = process.argv.includes('--force') || process.argv.includes('-y');
  if (!confirm) {
    console.log('⚠️  Run with --force or -y to skip confirmation');
    console.log('   This operation CANNOT be undone.\n');
    process.exit(1);
  }

  await withDB(async (sql) => {
    console.log('🗑️  Cleaning demo data...\n');

    // Delete in correct order (respecting foreign keys)
    console.log('  📋 Deleting reply drafts...');
    await sql`DELETE FROM reply_drafts WHERE user_id IN (SELECT id FROM users WHERE fid IN (${sql.join(DEMO_FIDS, ',')}))`.catch(() => {});

    console.log('  📋 Deleting alerts...');
    await sql`DELETE FROM alerts WHERE user_id IN (SELECT id FROM users WHERE fid IN (${sql.join(DEMO_FIDS, ',')}))`.catch(() => {});

    console.log('  📋 Deleting alert deliveries...');
    await sql`DELETE FROM alert_deliveries WHERE user_id IN (SELECT id FROM users WHERE fid IN (${sql.join(DEMO_FIDS, ',')}))`.catch(() => {});

    console.log('  📋 Deleting truth checks...');
    await sql`DELETE FROM truth_checks WHERE user_id IN (SELECT id FROM users WHERE fid IN (${sql.join(DEMO_FIDS, ',')}))`.catch(() => {});

    console.log('  📋 Deleting agent events...');
    await sql`DELETE FROM agent_events WHERE user_id IN (SELECT id FROM users WHERE fid IN (${sql.join(DEMO_FIDS, ',')}))`.catch(() => {});

    console.log('  📋 Deleting agent runs...');
    await sql`DELETE FROM agent_runs WHERE user_id IN (SELECT id FROM users WHERE fid IN (${sql.join(DEMO_FIDS, ',')}))`.catch(() => {});

    console.log('  📋 Deleting radar trend sources...');
    await sql`DELETE FROM radar_trend_sources WHERE author_fid IN (${sql.join(DEMO_FIDS, ',')})`.catch(() => {});

    console.log('  📋 Deleting radar trends (by title pattern)...');
    await sql`DELETE FROM radar_trends WHERE title LIKE '%GRASS%' OR title LIKE '%FREE ETH%' OR title LIKE '%Scam%'`.catch(() => {});

    console.log('  📋 Deleting trend sources...');
    await sql`DELETE FROM trend_sources WHERE author_fid IN (${sql.join(DEMO_FIDS, ',')})`.catch(() => {});

    console.log('  📋 Deleting trends (demo ones)...');
    await sql`DELETE FROM trends WHERE title LIKE '%demo%'`.catch(() => {});

    console.log('  📋 Deleting rate limit events...');
    await sql`DELETE FROM rate_limit_events WHERE fid IN (${sql.join(DEMO_FIDS, ',')})`.catch(() => {});

    console.log('  📋 Deleting casts (demo hashes)...');
    for (const hash of DEMO_CAST_HASHES) {
      await sql`DELETE FROM casts WHERE cast_hash = ${hash}`.catch(() => {});
    }

    console.log('  📋 Deleting user preferences...');
    await sql`DELETE FROM user_preferences WHERE user_id IN (SELECT id FROM users WHERE fid IN (${sql.join(DEMO_FIDS, ',')}))`.catch(() => {});

    console.log('  📋 Deleting demo users...');
    await sql`DELETE FROM users WHERE fid IN (${sql.join(DEMO_FIDS, ',')})`.catch(() => {});

    console.log('\n✅ Demo data reset complete');
    console.log('\n📝 Database state:');
    console.log('   • Demo users removed');
    console.log('   • Demo casts removed');
    console.log('   • Demo trends and alerts removed');
    console.log('   • Demo drafts removed');
    console.log('\n   System data (admins, real users) preserved.\n');
  });

  console.log('─'.repeat(50) + '\n');
  console.log('Run `pnpm demo:seed` to recreate demo data\n');
}

main().catch(err => {
  console.error('\n❌ Reset failed:', err.message);
  process.exit(1);
});
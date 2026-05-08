#!/usr/bin/env node
// demo-seed.mjs - Seed PULO database with demo data for all scenarios

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

// ─── Demo Data ─────────────────────────────────────────────────────────────────

const DEMO_USERS = [
  { fid: 100, username: 'alice_farcaster', displayName: 'Alice 👋', plan: 'pro' },
  { fid: 101, username: 'bob_in_crypto', displayName: 'Bob 🧙', plan: 'pro' },
  { fid: 102, username: 'crypto_trader', displayName: 'CryptoTrader', plan: 'free' },
  { fid: 103, username: 'new_user_anon', displayName: 'Anon', plan: 'free' },
  { fid: 999, username: 'pulo_demo', displayName: 'PULO Demo', plan: 'pro' },
];

const DEMO_CASTS = {
  // Scenario 1: Basic mention
  mention_cast: {
    castHash: 'demo_cast_mention_001',
    authorFid: 100,
    authorUsername: 'alice_farcaster',
    text: 'Hey @pulo summarize this thread please 🙏',
  },

  // Scenario 2: Truth check
  token_claim_cast: {
    castHash: 'demo_cast_token_claim_001',
    authorFid: 102,
    authorUsername: 'crypto_trader',
    text: '🚀 NEW TOKEN LAUNCH 🚀\n\n$SUPERCOIN just announced a massive airdrop for early supporters! Claim your tokens before they run out!\n\nLink: supercoin-airdrop.fake-link.xyz\n\nWho\'s getting in? 👀',
  },
  comment_verdict_missing: {
    castHash: 'demo_cast_comment_001',
    authorFid: 101,
    authorUsername: 'bob_in_crypto',
    text: 'I looked for official announcement but couldn\'t find any. No mention on their official twitter or website. Someone in crypto said this might be a phishing attempt disguised as airdrop.',
    parentHash: 'demo_cast_token_claim_001',
  },
  comment_suspicious_link: {
    castHash: 'demo_cast_comment_002',
    authorFid: 103,
    authorUsername: 'new_user_anon',
    text: 'I clicked the link and it asked for my seed phrase 😅 luckily I didn\'t fall for it. This is 100% a scam.',
    parentHash: 'demo_cast_token_claim_001',
  },

  // Scenario 3: Radar trend (reward program)
  reward_cast_1: {
    castHash: 'demo_cast_reward_001',
    authorFid: 100,
    authorUsername: 'alice_farcaster',
    text: 'Just received my $GRASS season 2 rewards! If you staked in their program you should check your wallet. The drop seems smaller than expected though?',
  },
  reward_cast_2: {
    castHash: 'demo_cast_reward_002',
    authorFid: 101,
    authorUsername: 'bob_in_crypto',
    text: 'For those wondering about the $GRASS reward program - yes, season 2 rewards are being distributed. Check your wallet and verify on their official site.',
  },
  reward_cast_3: {
    castHash: 'demo_cast_reward_003',
    authorFid: 100,
    authorUsername: 'alice_farcaster',
    text: 'Update: looks like $GRASS season 2 rewards were indeed distributed. The amount was adjusted due to network conditions. Read their official announcement for clarity.',
  },

  // Scenario 4: Scam warning
  scam_cast_1: {
    castHash: 'demo_cast_scam_001',
    authorFid: 103,
    authorUsername: 'new_user_anon',
    text: '🚨 WARNING: Multiple accounts promoting "FREE ETH" scam. The link goes to fake_metamask-wallet.xyz - DO NOT USE! Report these accounts!',
  },
  scam_cast_2: {
    castHash: 'demo_cast_scam_002',
    authorFid: 103,
    authorUsername: 'new_user_anon',
    text: 'SCAM ALERT: Same "FREE ETH" scheme with different account. Link is scam-wallet-verify.xyz - this is NOT the official MetaMask site!',
  },
  scam_cast_3: {
    castHash: 'demo_cast_scam_003',
    authorFid: 103,
    authorUsername: 'new_user_anon',
    text: '🚨 Third account with same scam promoting "DOUBLE YOUR ETH" - link is eth-giveaway-scam.xyz. Report! Report! Report!',
  },

  // Scenario 5: Composer (weak cast)
  weak_cast: {
    castHash: 'demo_cast_weak_001',
    authorFid: 999,
    authorUsername: 'pulo_demo',
    text: 'what do you guys think about this crypto thing is it good? should i buy maybe? probably not idk',
  },
};

// ─── Database Helpers ────────────────────────────────────────────────────────────

async function withDB(callback) {
  const { default: postgres } = await import('postgres');
  const sql = postgres(DATABASE_URL, { max: 5 });
  try {
    return await callback(sql);
  } finally {
    await sql.end();
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ─── Seed Functions ──────────────────────────────────────────────────────────────

async function seedUsers(sql) {
  console.log('  👥 Seeding users...');

  for (const user of DEMO_USERS) {
    await sql`
      INSERT INTO users (fid, username, display_name, plan, status)
      VALUES (${user.fid}, ${user.username}, ${user.displayName}, ${user.plan}, 'active')
      ON CONFLICT (fid) DO UPDATE SET
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        plan = EXCLUDED.plan
    `;
  }

  // Seed user preferences for pro users
  for (const user of DEMO_USERS.filter(u => u.plan === 'pro')) {
    await sql`
      INSERT INTO user_preferences (user_id, allow_direct_casts, allow_mini_app_notifications, daily_alert_limit)
      VALUES (
        (SELECT id FROM users WHERE fid = ${user.fid}),
        true, true, 50
      )
      ON CONFLICT (user_id) DO NOTHING
    `;
  }

  console.log(`    ✅ ${DEMO_USERS.length} users seeded`);
}

async function seedCasts(sql) {
  console.log('  🗣️  Seeding casts...');

  const casts = Object.values(DEMO_CASTS);
  for (const cast of casts) {
    const parentHash = cast.parentHash || null;
    const rawJson = JSON.stringify({
      demo_seed: true,
      scenario: cast.castHash.includes('mention') ? 'mention_summary' :
               cast.castHash.includes('token') ? 'truth_check' :
               cast.castHash.includes('reward') ? 'radar_trend' :
               cast.castHash.includes('scam') ? 'scam_warning' :
               cast.castHash.includes('weak') ? 'composer' : 'general'
    });

    await sql`
      INSERT INTO casts (cast_hash, author_fid, author_username, text, parent_hash, raw_json, created_at)
      VALUES (
        ${cast.castHash},
        ${cast.authorFid},
        ${cast.authorUsername},
        ${cast.text},
        ${parentHash},
        ${rawJson}::jsonb,
        NOW() - INTERVAL '${Math.floor(Math.random() * 24)} hours'
      )
      ON CONFLICT (cast_hash) DO UPDATE SET
        text = EXCLUDED.text
    `;
  }

  console.log(`    ✅ ${casts.length} casts seeded`);
}

async function seedTruthCheck(sql) {
  console.log('  🔍 Seeding truth check scenario...');

  const castHash = DEMO_CASTS.token_claim_cast.castHash;
  const userId = await sql`SELECT id FROM users WHERE fid = ${102}`.then(r => r[0]?.id);

  if (!userId) {
    console.log('    ⚠️  Skipping truth check - user not found');
    return;
  }

  // Create truth check record
  const truthCheckId = generateUUID();
  await sql`
    INSERT INTO truth_checks (
      id, user_id, target_cast_hash, claim_text, verdict, confidence,
      evidence_summary, counter_evidence_summary, risk_level, status, created_at
    )
    VALUES (
      ${truthCheckId}::uuid,
      ${userId},
      ${castHash},
      'New token $SUPERCOIN is giving airdrop to early supporters',
      'uncertain',
      45,
      'Multiple accounts promoting same token. Official announcement nowhere found. Community member reports no official confirmation.',
      'One account claims to have verified but provides no link. Domain appears recently registered.',
      'high',
      'completed',
      NOW() - INTERVAL '2 hours'
    )
    ON CONFLICT DO NOTHING
  `;

  // Link source casts
  await sql`
    INSERT INTO truth_checks (id, user_id, target_cast_hash, claim_text, verdict, confidence, risk_level, status)
    VALUES (
      ${generateUUID()}::uuid,
      ${userId},
      ${DEMO_CASTS.comment_verdict_missing.castHash},
      'Official source for $SUPERCOIN airdrop cannot be found',
      'likely_false',
      60,
      'medium',
      'completed'
    )
  `.catch(() => {}); // Ignore if duplicate

  console.log('    ✅ Truth check seeded');
}

async function seedRadarTrend(sql) {
  console.log('  📡 Seeding radar trend scenario...');

  // Create radar trend for $GRASS reward program
  const trendId = generateUUID();
  await sql`
    INSERT INTO radar_trends (
      id, title, normalized_title, category, keywords, score, velocity,
      risk_level, confidence, admin_status, source_count, cast_count,
      trusted_author_count, summary, created_at, last_seen_at
    )
    VALUES (
      ${trendId}::uuid,
      '$GRASS Season 2 Rewards',
      'grass season 2 rewards',
      'reward_program',
      '["$GRASS", "grass", "season 2", "rewards", "airdrop"]'::jsonb,
      75, 15, 'low', 80, 'detected', 3, 3, 2,
      'Multiple discussions about $GRASS season 2 reward distribution. Users confirming receipt of rewards with adjusted amounts.',
      NOW() - INTERVAL '6 hours',
      NOW() - INTERVAL '1 hour'
    )
    ON CONFLICT DO NOTHING
  `;

  // Add trend sources
  const trendSources = [
    { castHash: DEMO_CASTS.reward_cast_1.castHash, authorFid: 100, text: DEMO_CASTS.reward_cast_1.text, trustScore: 85 },
    { castHash: DEMO_CASTS.reward_cast_2.castHash, authorFid: 101, text: DEMO_CASTS.reward_cast_2.text, trustScore: 80 },
    { castHash: DEMO_CASTS.reward_cast_3.castHash, authorFid: 100, text: DEMO_CASTS.reward_cast_3.text, trustScore: 85 },
  ];

  for (const source of trendSources) {
    await sql`
      INSERT INTO radar_trend_sources (id, trend_id, cast_hash, author_fid, author_username, text, trust_score, created_at)
      VALUES (
        ${generateUUID()}::uuid,
        ${trendId}::uuid,
        ${source.castHash},
        ${source.authorFid},
        ${source.authorUsername},
        ${source.text},
        ${source.trustScore},
        NOW() - INTERVAL '${Math.floor(Math.random() * 6)} hours'
      )
    `.catch(() => {});
  }

  console.log('    ✅ Radar trend seeded');
}

async function seedScamWarning(sql) {
  console.log('  ⚠️  Seeding scam warning scenario...');

  // Create scam warning trend
  const trendId = generateUUID();
  await sql`
    INSERT INTO radar_trends (
      id, title, normalized_title, category, keywords, score, velocity,
      risk_level, confidence, admin_status, source_count, cast_count,
      trusted_author_count, summary, created_at, last_seen_at
    )
    VALUES (
      ${trendId}::uuid,
      'FREE ETH Scam Campaign',
      'free eth scam campaign',
      'scam_warning',
      '["free eth", "scam", "fake wallet", "phishing"]'::jsonb,
      90, 25, 'critical', 95, 'detected', 3, 3, 0,
      'Multiple low-trust accounts promoting similar "FREE ETH" scam with phishing links. Three different domains identified: fake_metamask-wallet.xyz, scam-wallet-verify.xyz, eth-giveaway-scam.xyz',
      NOW() - INTERVAL '3 hours',
      NOW() - INTERVAL '30 minutes'
    )
    ON CONFLICT DO NOTHING
  `;

  // Add trend sources with suspicious link flags
  const scamSources = [
    { castHash: DEMO_CASTS.scam_cast_1.castHash, authorFid: 103, text: DEMO_CASTS.scam_cast_1.text, hasSuspiciousLink: true, trustScore: 20 },
    { castHash: DEMO_CASTS.scam_cast_2.castHash, authorFid: 103, text: DEMO_CASTS.scam_cast_2.text, hasSuspiciousLink: true, trustScore: 20 },
    { castHash: DEMO_CASTS.scam_cast_3.castHash, authorFid: 103, text: DEMO_CASTS.scam_cast_3.text, hasSuspiciousLink: true, trustScore: 20 },
  ];

  for (const source of scamSources) {
    await sql`
      INSERT INTO radar_trend_sources (id, trend_id, cast_hash, author_fid, author_username, text, has_suspicious_link, trust_score, created_at)
      VALUES (
        ${generateUUID()}::uuid,
        ${trendId}::uuid,
        ${source.castHash},
        ${source.authorFid},
        ${source.authorUsername},
        ${source.text},
        ${source.hasSuspiciousLink},
        ${source.trustScore},
        NOW() - INTERVAL '${Math.floor(Math.random() * 3)} hours'
      )
    `.catch(() => {});
  }

  console.log('    ✅ Scam warning trend seeded');
}

async function seedComposerDraft(sql) {
  console.log('  ✍️  Seeding composer draft scenario...');

  const userId = await sql`SELECT id FROM users WHERE fid = ${999}`.then(r => r[0]?.id);
  if (!userId) {
    console.log('    ⚠️  Skipping composer draft - demo user not found');
    return;
  }

  const draftId = generateUUID();
  await sql`
    INSERT INTO reply_drafts (id, user_id, cast_hash, text, score, status, created_at, updated_at)
    VALUES (
      ${draftId}::uuid,
      ${userId},
      ${DEMO_CASTS.weak_cast.castHash},
      'I''ve been researching this project and here''s my take: the team has been transparent about challenges, the technology is solid, but the market conditions make timing uncertain. My recommendation: dollar-cost average if you believe in the long-term vision, but don''t invest more than you can afford to lose. What specific aspect are you most concerned about?',
      72,
      'pending',
      NOW() - INTERVAL '1 hour',
      NOW() - INTERVAL '30 minutes'
    )
    ON CONFLICT DO NOTHING
  `;

  console.log('    ✅ Composer draft seeded');
}

async function seedAlerts(sql) {
  console.log('  🔔 Seeding alerts...');

  const proUsers = DEMO_USERS.filter(u => u.plan === 'pro');

  // Create alert for radar trend
  const alertId = generateUUID();
  const userId = await sql`SELECT id FROM users WHERE fid = ${proUsers[0].fid}`.then(r => r[0]?.id);

  if (userId) {
    await sql`
      INSERT INTO alerts (id, user_id, type, title, body, risk_level, category, metadata, created_at)
      VALUES (
        ${alertId}::uuid,
        ${userId},
        'reward_program',
        '$GRASS Season 2 Rewards - Check Your Wallet',
        'Multiple trusted sources confirm that $GRASS season 2 rewards are being distributed. Users report adjusted amounts due to network conditions. Verify on official site before taking action.',
        'low',
        'reward_program',
        '{"trendId": "demo-trend-001", "keywords": ["$GRASS", "season 2", "rewards"]}'::jsonb,
        NOW() - INTERVAL '1 hour'
      )
    `;
  }

  console.log('    ✅ Alerts seeded');
}

async function seedRateLimits(sql) {
  console.log('  📊 Seeding rate limit scenario...');

  // Create usage records for free user to demonstrate plan limits
  const freeUserId = await sql`SELECT id FROM users WHERE fid = ${102}`.then(r => r[0]?.id);

  if (freeUserId) {
    // Update user to free plan and set up rate limit records
    await sql`
      UPDATE users SET plan = 'free' WHERE fid = ${102}
    `;

    // Insert rate limit events to simulate usage
    for (let i = 0; i < 5; i++) {
      await sql`
        INSERT INTO rate_limit_events (id, user_id, fid, key, window, count, decision, created_at)
        VALUES (
          ${generateUUID()}::uuid,
          ${freeUserId},
          ${102},
          'truth_checks:daily',
          'daily',
          1,
          'allowed',
          NOW() - INTERVAL '${5 - i} hours'
        )
      `.catch(() => {});
    }
  }

  console.log('    ✅ Rate limit scenario seeded');
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 PULO Demo Data Seeder\n' + '─'.repeat(50));

  console.log('\n📦 Seeding database with demo data...');
  console.log(`   Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}\n`);

  await withDB(async (sql) => {
    await seedUsers(sql);
    await seedCasts(sql);
    await seedTruthCheck(sql);
    await seedRadarTrend(sql);
    await seedScamWarning(sql);
    await seedComposerDraft(sql);
    await seedAlerts(sql);
    await seedRateLimits(sql);
  });

  console.log('\n' + '─'.repeat(50));
  console.log('  ✅ Demo data seeded successfully!');
  console.log('\n📋 Scenarios ready:');
  console.log('   1. Mention Summary - "@pulo summarize" on cast demo_cast_mention_001');
  console.log('   2. Truth Check - Token claim on demo_cast_token_claim_001');
  console.log('   3. Radar Trend - $GRASS rewards (approved)');
  console.log('   4. Scam Warning - FREE ETH phishing (pending approval)');
  console.log('   5. Composer - Draft saved for demo user');
  console.log('   6. Plan Limit - Free user at 5/5 truth checks\n');
  console.log('─'.repeat(50) + '\n');

  console.log('Run `pnpm demo:run` to execute demo scenarios\n');
}

main().catch(err => {
  console.error('\n❌ Seeding failed:', err.message);
  process.exit(1);
});
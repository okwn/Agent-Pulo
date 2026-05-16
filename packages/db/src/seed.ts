/**
 * seed.ts — Demo/development seed data for PULO database
 * Run: PULO_POSTGRES_PORT=5544 DATABASE_URL=... pnpm --filter @pulo/db seed
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const sql = postgres(process.env.DATABASE_URL ?? 'postgresql://postgres:password@localhost:5544/pulo');
const db = drizzle(sql);

async function seed() {
  console.log('Seeding PULO database...');

  // ─── Demo Users ─────────────────────────────────────────────────────────────
  const users = [
    { fid: 1, username: 'alice', displayName: 'Alice Chen', custodyAddress: '0x1234...alice', plan: 'pro' as const, verifiedAddresses: ['0xabcd...alice'] },
    { fid: 2, username: 'bob', displayName: 'Bob Martinez', custodyAddress: '0x5678...bob', plan: 'free' as const },
    { fid: 3, username: 'carol', displayName: 'Carol Johnson', custodyAddress: '0x9abc...carol', plan: 'creator' as const },
    { fid: 1234, username: 'pulo_bot', displayName: 'PULO Agent', custodyAddress: '0xdef0...pulo', plan: 'creator' as const },
  ];

  for (const u of users) {
    await sql`INSERT INTO users (fid, username, display_name, custody_address, plan, verified_addresses)
      VALUES (${u.fid}, ${u.username}, ${u.displayName}, ${u.custodyAddress}, ${u.plan}, ${JSON.stringify(u.verifiedAddresses ?? [])})
      ON CONFLICT (fid) DO NOTHING`;
  }
  console.log(`  ✓ ${users.length} users seeded`);

  // ─── Demo Casts ─────────────────────────────────────────────────────────────
  const casts = [
    { castHash: 'cast-abc123', authorFid: 1, authorUsername: 'alice', text: 'Just claimed my $DEGEN airdrop! 🔥', parentHash: null, rootParentHash: null },
    { castHash: 'cast-def456', authorFid: 2, authorUsername: 'bob', text: 'Is it true that Ethereum is switching to proof-of-stake?', parentHash: 'cast-abc123', rootParentHash: 'cast-abc123' },
    { castHash: 'cast-ghi789', authorFid: 3, authorUsername: 'carol', text: 'The new Lens protocol grant program is now open for proposals', parentHash: null, rootParentHash: null },
    { castHash: 'cast-jkl012', authorFid: 1, authorUsername: 'alice', text: '@pulo is this true? Ethereum merged in September 2022', parentHash: null, rootParentHash: null },
  ];

  for (const c of casts) {
    await sql`INSERT INTO casts (cast_hash, author_fid, author_username, text, parent_hash, root_parent_hash)
      VALUES (${c.castHash}, ${c.authorFid}, ${c.authorUsername}, ${c.text}, ${c.parentHash}, ${c.rootParentHash})
      ON CONFLICT (cast_hash) DO NOTHING`;
  }
  console.log(`  ✓ ${casts.length} casts seeded`);

  // ─── Demo Preferences ────────────────────────────────────────────────────────
  const prefs = [
    { userId: 1, tone: 'balanced', replyStyle: 'helpful', notificationFrequency: 'realtime', allowDirectCasts: true },
    { userId: 2, tone: 'casual', replyStyle: 'brief', notificationFrequency: 'digest', allowDirectCasts: false },
    { userId: 3, tone: 'formal', replyStyle: 'detailed', notificationFrequency: 'realtime', allowDirectCasts: true },
  ];

  for (const p of prefs) {
    await sql`INSERT INTO user_preferences (user_id, tone, reply_style, notification_frequency, allow_direct_casts)
      VALUES (${p.userId}, ${p.tone}, ${p.replyStyle}, ${p.notificationFrequency}, ${p.allowDirectCasts})
      ON CONFLICT (user_id) DO NOTHING`;
  }
  console.log(`  ✓ ${prefs.length} preference records seeded`);

  // ─── Demo Agent Events ───────────────────────────────────────────────────────
  const events = [
    { source: 'webhook' as const, type: 'mention' as const, fid: 1, castHash: 'cast-jkl012', status: 'completed' as const, payload: { mentionText: '@pulo is this true?' } },
    { source: 'scheduler' as const, type: 'trend_detected' as const, fid: null, castHash: 'cast-ghi789', status: 'completed' as const, payload: { category: 'grant', keyword: 'grant program' } },
    { source: 'webhook' as const, type: 'truth_check_request' as const, fid: 2, castHash: 'cast-def456', status: 'pending' as const, payload: { claim: 'Ethereum switching to proof-of-stake' } },
  ];

  for (const e of events) {
    await sql`INSERT INTO agent_events (source, type, fid, cast_hash, status, payload)
      VALUES (${e.source}, ${e.type}, ${e.fid}, ${e.castHash}, ${e.status}, ${JSON.stringify(e.payload)})`;
  }
  console.log(`  ✓ ${events.length} agent events seeded`);

  // ─── Demo Truth Checks ───────────────────────────────────────────────────────
  const truthChecks = [
    {
      userId: 2,
      targetCastHash: 'cast-def456',
      claimText: 'Ethereum is switching to proof-of-stake',
      verdict: 'verified' as const,
      confidence: 95,
      evidenceSummary: 'The Merge completed September 15, 2022. Ethereum officially transitioned to proof-of-stake.',
      riskLevel: 'low' as const,
      status: 'completed',
    },
    {
      userId: 1,
      targetCastHash: 'cast-jkl012',
      claimText: 'Ethereum merged in September 2022',
      verdict: 'verified' as const,
      confidence: 98,
      evidenceSummary: 'Confirmed by on-chain data and official Ethereum Foundation blog.',
      riskLevel: 'low' as const,
      status: 'completed',
    },
  ];

  for (const tc of truthChecks) {
    await sql`INSERT INTO truth_checks (user_id, target_cast_hash, claim_text, verdict, confidence, evidence_summary, risk_level, status)
      VALUES (${tc.userId}, ${tc.targetCastHash}, ${tc.claimText}, ${tc.verdict}, ${tc.confidence}, ${tc.evidenceSummary}, ${tc.riskLevel}, ${tc.status})`;
  }
  console.log(`  ✓ ${truthChecks.length} truth checks seeded`);

  // ─── Demo Trends ─────────────────────────────────────────────────────────────
  const trendsData = [
    {
      title: '$DEGEN Airdrop Claiming',
      category: 'airdrop',
      keywords: ['degen', 'airdrop', 'claim'],
      score: 85,
      velocity: 120,
      riskLevel: 'medium' as const,
      confidence: 72,
      status: 'active' as const,
      castCount: 340,
      sourceCount: 28,
      summary: 'High activity around $DEGEN token airdrop claiming. Multiple user reports of successful claims.',
    },
    {
      title: 'Lens Protocol Grant Program',
      category: 'grant',
      keywords: ['lens', 'grant', 'proposal', 'funding'],
      score: 60,
      velocity: 45,
      riskLevel: 'low' as const,
      confidence: 80,
      status: 'active' as const,
      castCount: 120,
      sourceCount: 15,
      summary: 'Lens Protocol announced open grant program for builders. Multiple calls to action.',
    },
  ];

  for (const t of trendsData) {
    await sql`INSERT INTO trends (title, category, keywords, score, velocity, risk_level, confidence, status, cast_count, source_count, summary)
      VALUES (${t.title}, ${t.category}, ${JSON.stringify(t.keywords)}, ${t.score}, ${t.velocity}, ${t.riskLevel}, ${t.confidence}, ${t.status}, ${t.castCount}, ${t.sourceCount}, ${t.summary})`;
  }
  console.log(`  ✓ ${trendsData.length} trends seeded`);

  // ─── Demo Alerts ───────────────────────────────────────────────────────────────
  const alertIds = [];
  const alertsData = [
    { userId: 1, type: 'trend_detected' as const, title: '$DEGEN Airdrop Alert', body: 'High activity around $DEGEN token airdrop claiming.', riskLevel: 'medium' as const },
    { userId: 3, type: 'grant' as const, title: 'Lens Grant Program', body: 'Lens Protocol grant program is now open.', riskLevel: 'low' as const },
  ];

  for (const a of alertsData) {
    const result = await sql`INSERT INTO alerts (user_id, type, title, body, risk_level)
      VALUES (${a.userId}, ${a.type}, ${a.title}, ${a.body}, ${a.riskLevel})
      RETURNING id`;
    alertIds.push(result[0]!.id);
  }
  console.log(`  ✓ ${alertsData.length} alerts seeded`);

  // ─── Demo Alert Deliveries ───────────────────────────────────────────────────
  const deliveries = [
    { alertId: alertIds[0], userId: 1, channel: 'dm' as const, status: 'sent' as const, idempotencyKey: 'alert-degen-001' },
    { alertId: alertIds[1], userId: 3, channel: 'cast_reply' as const, status: 'pending' as const, idempotencyKey: 'alert-lens-001' },
  ];

  for (const a of deliveries) {
    await sql`INSERT INTO alert_deliveries (alert_id, user_id, channel, status, idempotency_key)
      VALUES (${a.alertId}, ${a.userId}, ${a.channel}, ${a.status}, ${a.idempotencyKey})`;
  }
  console.log(`  ✓ ${deliveries.length} alert deliveries seeded`);

  console.log('\nSeed complete. Run migrations first if tables do not exist.');
  console.log('  PGPASSWORD=password psql -h localhost -p 5544 -U postgres -d pulo -f migrations/0000_init_pulo_schema.sql');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
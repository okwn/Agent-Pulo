#!/usr/bin/env node
// demo-run.mjs - Execute PULO demo scenarios

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
const API_URL = `http://localhost:${env.PULO_API_PORT || 4311}`;

// ─── Scenario Definitions ───────────────────────────────────────────────────────

const SCENARIOS = {
  1: {
    name: 'Basic Mention Summary',
    description: 'User tags @pulo to summarize a thread',
    castHash: 'demo_cast_mention_001',
    userFid: 100,
  },
  2: {
    name: 'Truth Check',
    description: 'Check if token airdrop claim is legitimate',
    castHash: 'demo_cast_token_claim_001',
    userFid: 102,
  },
  3: {
    name: 'Radar Trend Detection',
    description: 'Trend is detected, admin approves, alert sent',
    trendTitle: '$GRASS Season 2 Rewards',
  },
  4: {
    name: 'Scam Warning',
    description: 'High-risk scam detected, warning alert created',
    trendTitle: 'FREE ETH Scam Campaign',
  },
  5: {
    name: 'Composer Draft',
    description: 'PULO improves weak cast and saves draft',
    castHash: 'demo_cast_weak_001',
    userFid: 999,
  },
  6: {
    name: 'Plan Limit',
    description: 'Free user hits daily truth check limit',
    userFid: 102,
  },
};

// ─── API Helpers ────────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Demo Scenarios ─────────────────────────────────────────────────────────────

async function demoMentionSummary() {
  console.log('\n📝 SCENARIO 1: Basic Mention Summary');
  console.log('─'.repeat(50));
  console.log('User tags @pulo to summarize a thread');

  // Simulate receiving a mention event
  const mentionEvent = {
    type: 'mention',
    fid: 100,
    castHash: 'demo_cast_mention_001',
    text: 'Hey @pulo summarize this thread please 🙏',
  };

  console.log('\n📨 Incoming mention event:');
  console.log(JSON.stringify(mentionEvent, null, 2));

  // Process the mention (in real system this would trigger agent)
  console.log('\n🤖 Processing with mention-agent...');

  // Simulate agent response
  const summary = {
    topic: 'New token $SUPERCOIN airdrop announcement',
    participantCount: 3,
    sentiment: 'mixed (excitement + skepticism)',
    keyPoints: [
      'User @crypto_trader announced $SUPERCOIN airdrop',
      'Multiple users expressed skepticism about legitimacy',
      'One user reported phishing attempt via fake link',
      'No official announcement found from project team',
    ],
    conclusion: 'Highly suspicious - potential scam',
  };

  console.log('\n✨ PULO Summary:');
  console.log(JSON.stringify(summary, null, 2));

  console.log('\n✅ Scenario 1 complete');
  return summary;
}

async function demoTruthCheck() {
  console.log('\n🔍 SCENARIO 2: Truth Check');
  console.log('─'.repeat(50));
  console.log('Checking token airdrop claim legitimacy...');

  // Get truth check from database
  const truthCheck = await apiFetch('/api/truth/demo_cast_token_claim_001').catch(() => null);

  if (truthCheck) {
    console.log('\n📋 Truth Check Result:');
    console.log(JSON.stringify(truthCheck, null, 2));
  } else {
    // Simulate if not in API
    const simulatedResult = {
      claim: 'New token $SUPERCOIN is giving airdrop to early supporters',
      verdict: 'uncertain',
      confidence: 45,
      riskLevel: 'high',
      evidenceSummary: 'Multiple accounts promoting same token. Official announcement not found.',
      counterEvidenceSummary: 'One unverified claim of success. Recently registered domain.',
      sourceCount: 2,
      status: 'completed',
    };

    console.log('\n📋 Simulated Truth Check:');
    console.log(JSON.stringify(simulatedResult, null, 2));

    console.log('\n⚠️  VERDICT: UNCERTAIN → HIGH RISK');
    console.log('   Evidence: No official source, suspicious links, community skepticism');
    console.log('   Recommendation: DO NOT CLICK any links, verify via official channels only');
  }

  console.log('\n✅ Scenario 2 complete');
  return truthCheck;
}

async function demoRadarTrend() {
  console.log('\n📡 SCENARIO 3: Radar Trend Detection');
  console.log('─'.repeat(50));
  console.log('Detecting $GRASS season 2 rewards discussion...');

  // Get radar trends
  const trends = await apiFetch('/api/radar/trends?status=detected').catch(() => ({ trends: [] }));

  const grassTrend = {
    id: 'demo-trend-001',
    title: '$GRASS Season 2 Rewards',
    category: 'reward_program',
    score: 75,
    velocity: 15,
    sourceCount: 3,
    trustedAuthorCount: 2,
    riskLevel: 'low',
    adminStatus: 'detected',
    summary: 'Multiple discussions about $GRASS season 2 reward distribution.',
  };

  console.log('\n📊 Detected Trend:');
  console.log(JSON.stringify(grassTrend, null, 2));

  // Simulate admin approval
  console.log('\n👤 Admin action: Approving trend...');
  const approvedTrend = { ...grassTrend, adminStatus: 'approved' };
  console.log('✅ Trend approved');

  // Simulate alert creation
  console.log('\n🔔 Creating alert for matching users...');
  const alert = {
    id: 'demo-alert-001',
    userFid: 100,
    type: 'reward_program',
    title: '$GRASS Season 2 Rewards - Check Your Wallet',
    riskLevel: 'low',
    delivered: true,
  };
  console.log(JSON.stringify(alert, null, 2));

  console.log('\n✅ Scenario 3 complete');
  return { trend: approvedTrend, alert };
}

async function demoScamWarning() {
  console.log('\n⚠️  SCENARIO 4: Scam Warning');
  console.log('─'.repeat(50));
  console.log('Detecting high-risk phishing campaign...');

  const scamTrend = {
    id: 'demo-scam-001',
    title: 'FREE ETH Scam Campaign',
    category: 'scam_warning',
    score: 90,
    velocity: 25,
    sourceCount: 3,
    trustedAuthorCount: 0,
    riskLevel: 'critical',
    adminStatus: 'detected',
    summary: 'Multiple low-trust accounts promoting "FREE ETH" phishing scheme.',
    suspiciousLinks: [
      'fake_metamask-wallet.xyz',
      'scam-wallet-verify.xyz',
      'eth-giveaway-scam.xyz',
    ],
  };

  console.log('\n🚨 Detected Scam Trend:');
  console.log(JSON.stringify(scamTrend, null, 2));

  console.log('\n⚠️  RISK LEVEL: CRITICAL');
  console.log('   • 3 different phishing domains identified');
  console.log('   • All sources from low-trust accounts');
  console.log('   • Pattern matches classic phishing campaign');

  // Simulate alert for opted-in users only
  console.log('\n🔔 Creating scam warning alert (users opted into warnings)...');
  const scamAlert = {
    id: 'demo-scam-alert-001',
    type: 'scam_warning',
    title: '⚠️ Scam Alert: "FREE ETH" Phishing Campaign Detected',
    body: 'Multiple accounts are promoting a "FREE ETH" scam with phishing links. Do NOT click any links or enter your seed phrase. Report suspicious accounts.',
    riskLevel: 'critical',
    channels: ['dm', 'miniapp'],
    onlyOptedIn: true,
  };
  console.log(JSON.stringify(scamAlert, null, 2));

  console.log('\n✅ Scenario 4 complete');
  return { trend: scamTrend, alert: scamAlert };
}

async function demoComposer() {
  console.log('\n✍️  SCENARIO 5: Composer - Improve Weak Cast');
  console.log('─'.repeat(50));
  console.log('Original cast: "what do you guys think about this crypto thing is it good? should i buy maybe? probably not idk"');

  // Call composer rewrite
  const rewriteResult = await apiFetch('/api/composer/rewrite', {
    method: 'POST',
    body: {
      text: 'what do you guys think about this crypto thing is it good? should i buy maybe? probably not idk',
      style: 'founder',
    },
  }).catch(() => null);

  if (rewriteResult) {
    console.log('\n✨ PULO Generated Variations:');
    console.log(JSON.stringify(rewriteResult, null, 2));
  } else {
    // Simulate result
    const simulatedVariants = [
      {
        text: 'Been researching this project for weeks. Here\'s my honest take: the fundamentals are solid, but the timing is uncertain. My approach: dollar-cost average if you believe in the long-term vision. What specific concerns do you have?',
        style: 'founder',
        score: 72,
        reasoning: 'Added structure, addressed uncertainty, invited engagement',
      },
      {
        text: 'Hot take: if you\'re asking "should I buy?" in a public cast, you probably already know the answer. Do more research, define your thesis, and never invest more than you can afford to lose.',
        style: 'sharp',
        score: 68,
        reasoning: 'Direct, provokes thought, aligns with community values',
      },
    ];
    console.log('\n✨ Simulated PULO Variations:');
    console.log(JSON.stringify({ variants: simulatedVariants }, null, 2));
  }

  // Simulate saving draft
  console.log('\n💾 Saving best version as draft...');
  const savedDraft = {
    id: 'demo-draft-001',
    text: 'Been researching this project for weeks. Here\'s my honest take: the fundamentals are solid, but the timing is uncertain. My approach: dollar-cost average if you believe in the long-term vision. What specific concerns do you have?',
    status: 'pending',
    score: 72,
  };
  console.log(JSON.stringify(savedDraft, null, 2));

  console.log('\n✅ Scenario 5 complete');
  return savedDraft;
}

async function demoPlanLimit() {
  console.log('\n🚫 SCENARIO 6: Plan Limit - Free User');
  console.log('─'.repeat(50));

  // Simulate free user making request
  console.log('User FID 102 (free plan) attempts truth check...');

  // Check current usage
  console.log('\n📊 Current Usage:');
  console.log('   Truth Checks: 5/5 (daily limit reached)');
  console.log('   Plan: free');

  // Simulate API response when limit is hit
  console.log('\n🚫 Request denied:');
  const blockResponse = {
    error: 'PLAN_LIMIT_EXCEEDED',
    code: 'TRUTH_CHECK_DAILY_LIMIT',
    message: 'Daily truth check limit reached',
    limit: 5,
    used: 5,
    upgradeUrl: '/billing/upgrade',
    userFacingMessage: "You've reached your daily truth check limit (5/5) on the free plan. Upgrade to Pro for unlimited truth checks.",
  };
  console.log(JSON.stringify(blockResponse, null, 2));

  console.log('\n💡 User sees upgrade CTA:');
  console.log('   "🚀 Unlock unlimited truth checks - upgrade to Pro!"');

  console.log('\n✅ Scenario 6 complete');
  return blockResponse;
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🎬 PULO Demo Runner\n' + '═'.repeat(50));
  console.log('Starting all demo scenarios...\n');

  const scenarioIndex = process.argv.includes('--scenario')
    ? parseInt(process.argv[process.argv.indexOf('--scenario') + 1])
    : null;

  const results = {};

  try {
    if (scenarioIndex === null || scenarioIndex === 1) {
      results.scenario1 = await demoMentionSummary();
    }
    if (scenarioIndex === null || scenarioIndex === 2) {
      results.scenario2 = await demoTruthCheck();
    }
    if (scenarioIndex === null || scenarioIndex === 3) {
      results.scenario3 = await demoRadarTrend();
    }
    if (scenarioIndex === null || scenarioIndex === 4) {
      results.scenario4 = await demoScamWarning();
    }
    if (scenarioIndex === null || scenarioIndex === 5) {
      results.scenario5 = await demoComposer();
    }
    if (scenarioIndex === null || scenarioIndex === 6) {
      results.scenario6 = await demoPlanLimit();
    }
  } catch (err) {
    console.error(`\n⚠️  Scenario error: ${err.message}`);
    console.log('   Continuing with next scenarios...\n');
  }

  console.log('\n' + '═'.repeat(50));
  console.log('🎉 Demo Complete!');
  console.log('═'.repeat(50) + '\n');

  if (scenarioIndex === null) {
    console.log('Scenarios run: 1-6 (use --scenario N to run specific)');
  }

  console.log('View results in admin dashboard: http://localhost:3000/admin/system/demo\n');
}

main().catch(err => {
  console.error('\n❌ Demo run failed:', err.message);
  process.exit(1);
});
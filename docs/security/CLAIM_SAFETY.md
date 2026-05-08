# Claim/Airdrop Safety

How PULO evaluates claims, especially those involving tokens, airdrops, and financial offers.

## Core Principle

**Never say a claim is official unless an official source is detected.**

PULO errs on the side of caution. If there's doubt, the user is warned.

## URL Risk Analysis

### Risk Levels

| Level | Meaning | Action |
|-------|---------|--------|
| `low` | Appears safe | Allow normal processing |
| `medium` | Some warning signs | Display warning |
| `high` | Multiple warning signs | Require user confirmation |
| `critical` | Likely scam/phishing | Block and warn |

### Detection Patterns

#### Suspicious Domain Patterns
- Typosquatting (e.g., `etereum.org`, `metamask-verify.com`)
- Non-standard TLDs (`.xyz`, `.top`, `.club`)
- URL shorteners (bit.ly, tinyurl.com)
- Keywords: `free`, `airdrop`, `claim`, `reward`, `giveaway`

#### Path Risk Indicators
- `/connect/wallet` - Wallet connection request
- `/enter-seed` - Seed phrase entry
- `/verify` with wallet context

#### Domain Impersonation
- Fake MetaMask domains
- Fake wallet sites
- Impersonation of known brands (Uniswap, Coinbase, etc.)

## Claim Analysis

When a user submits a claim for verification:

```typescript
const result = analyzeClaimSafety(claimText, urls);

if (!result.officialSourceDetected && claimText.includes('official')) {
  result.warnings.push('"official" claim without verified source');
}
```

### Analysis Output

```typescript
interface ClaimSafetyResult {
  safe: boolean;                    // Should this be shown?
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  officialSourceDetected: boolean; // Verified official link found
  warnings: string[];              // List of warnings
  recommendations: string[];       // What to tell the user
  linksAnalyzed: URLRiskAnalysis[]; // Per-link analysis
}
```

## Safety Rules

### Never Encourage

- ❌ "Connect your wallet to this link"
- ❌ "Enter your seed phrase to verify"
- ❌ "Sign this message with your wallet"
- ❌ "Click here to claim your airdrop"

### Always Warn About

- ⚠️ Links from unofficial domains
- ⚠️ Urgency tactics ("Act NOW!", "Limited time!")
- ⚠️ Guaranteed returns ("Double your ETH!")
- ⚠️ Requests for wallet access
- ⚠️ Suspicious URL patterns

### Official Source Verification

A link is considered "verified official" only if:

1. Domain matches known official domain (e.g., `ethereum.org`)
2. Not a subdomain of a known brand unless it's an official subdomain
3. No suspicious path indicators

Known official domains:
- `ethereum.org`, `ethereum.foundation`
- `uniswap.org`
- `coinbase.com`
- `farcaster.xyz`, `warpcast.com`
- `neynar.com`, `neynar.io`

## User-Facing Warnings

When a claim is flagged:

```
⚠️ Safety Check Results

Risk Level: HIGH

Warnings:
• "official" claim without verified source
• Link uses non-standard TLD (.xyz)

Recommendation:
NEVER connect your wallet or enter seed phrases
on unfamiliar websites. Verify through official channels.
```

## Implementation

### URL Analyzer

```typescript
// packages/safety/src/url-analyzer.ts
export function analyzeURL(url: string): URLRiskAnalysis {
  // Check domain against known brands
  // Check for suspicious keywords
  // Check path for risky patterns
  // Check for impersonation
}
```

### Claim Safety

```typescript
export function analyzeClaimSafety(claim: string, urls: string[]): ClaimSafetyResult {
  // Analyze each URL
  // Check claim text for red flags
  // Determine overall risk
}
```

## Demo Scenarios

### Scenario 1: Safe Official Claim

**Input**: "Ethereum Foundation announced updates" + ethereum.org
**Result**: `riskLevel: low`, `officialSourceDetected: true`

### Scenario 2: Suspicious Airdrop

**Input**: "FREE ETH AIRDROP! Claim now at free-eth-xyz.xyz"
**Result**: `riskLevel: critical`, `safe: false`

### Scenario 3: Impersonation

**Input**: "Verify your MetaMask at metamask-secure-login.xyz"
**Result**: `riskLevel: critical`, `isImpersonation: true`

## Security Checklist

- [ ] URL analyzer catches suspicious domains
- [ ] URL analyzer catches impersonation
- [ ] Claim without official source is warned
- [ ] Wallet connection requests are blocked
- [ ] Urgency tactics trigger warnings
- [ ] User is never told to connect wallet to unverified site
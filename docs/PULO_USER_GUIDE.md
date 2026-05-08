# PULO User Guide

How to use PULO as a Far caster user.

## Getting Started

PULO is a Far caster bot that helps you:
1. **Understand what's real** — Get truth analysis on claims
2. **Catch trends early** — Discover emerging topics
3. **Stay informed** — Set up alerts for keywords or users

## Interacting with PULO

### Mention the Bot

On Far caster, mention `@pulo` in a cast:

```
@pulo is Ethereum really going to $5,000 this year?
```

PULO will reply with a truth analysis (when in live mode with bot reply enabled).

### Keywords That Work

| Command | Description |
|---------|-------------|
| `@pulo <claim>` | Analyze a claim for truth |
| `@pulo radar` | Get current top trends |
| `@pulo help` | Show help text |

## Understanding Truth Analysis

PULO analyzes claims and returns verdicts:

| Verdict | Meaning |
|---------|---------|
| **TRUE** | Evidence strongly supports the claim |
| **MOSTLY_TRUE** | Evidence mostly supports with minor errors |
| **MIXED** | Evidence is contradictory |
| **MOSTLY_FALSE** | Evidence mostly contradicts |
| **FALSE** | Evidence strongly contradicts |
| **UNVERIFIABLE** | Not enough information to verify |

### Reading an Analysis

Each analysis includes:
- **Claim** — The specific claim being analyzed
- **Verdict** — The truth assessment
- **Evidence** — Supporting or contradicting sources
- **Confidence** — How certain the analysis is
- **Warnings** — Any safety concerns with the source

## Alerts

Set up alerts to be notified of relevant content.

### Alert Types

| Type | How to Set | Notified When |
|------|------------|---------------|
| **Keyword** | DM @pulo or use `/alert keyword ethereum` | A cast contains "ethereum" |
| **User** | DM @pulo or use `/alert user 123` | User 123 posts a cast |
| **Cast Reply** | DM @pulo or use `/alert reply abc123` | Someone replies to cast abc123 |
| **Truth** | DM @pulo or use `/alert truth FALSE` | A FALSE verdict is issued |

### Setting Alerts (via DM)

Send a DM to @pulo:

```
/alert keyword Ethereum
```

### Managing Alerts

View your active alerts:
```
/alerts
```

Delete an alert:
```
/alert delete 1
```

## Subscription Plans

### Free Plan
- 10 truth checks per month
- 10 alerts
- Read-only radar access
- No bot replies to your casts

### Pro Plan
- Unlimited truth checks
- Unlimited alerts
- Bot replies enabled
- Priority processing

### Upgrading

Ask @pulo about upgrading:
```
@pulo upgrade to pro
```

## Safety Features

PULO helps keep you safe:

### URL Safety

Before clicking any link mentioned in a cast, PULO:
- Checks if it's a known scam domain
- Warns about suspicious patterns
- Blocks dangerous links

### Claim Warnings

PULO will warn you if:
- A claim uses urgency tactics ("Act NOW!")
- A link requests wallet access
- A "verified official" isn't actually verified
- Returns are guaranteed without basis

### What PULO Will NEVER Do

- Ask you to connect your wallet
- Ask for seed phrases
- Ask you to "verify" with private keys
- Promise guaranteed returns
- Claim to be an official entity without verification

## Privacy

### What PULO Stores

- Your FID and username
- Your alerts configuration
- Your truth check history
- Usage statistics (monthly resets)

### What PULO Does NOT Store

- Private keys or signer UUIDs
- Wallet addresses
- Direct messages (beyond alert config)
- Any financial information

## Limitations

- Truth analysis is automated and may have errors
- Web search results depend on available sources
- Not all claims can be verified
- Analysis speed depends on server load

## Support

### Getting Help

DM @pulo with:
```
/help
```

### Reporting Issues

If you find a bug or inaccuracy:
1. Note the cast URL or hash
2. DM @pulo with details
3. Thank you for helping improve PULO!

## Demo Mode

If you're testing without real API keys:
- Truth analysis returns simulated results
- Radar shows demo trends
- Alerts are created but delivery is logged only

To access demo:
1. Go to the admin dashboard
2. Log in with demo credentials
3. Use demo controls to seed and run scenarios

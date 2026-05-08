// url-analyzer.ts - URL risk analysis for claim/airdrop safety

export interface URLRiskAnalysis {
  url: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  risks: string[];
  warnings: string[];
  isSuspicious: boolean;
  isShortened: boolean;
  isImpersonation: boolean;
  shouldWarn: boolean;
  verifiedOfficial: boolean;
}

// Suspicious patterns
const SUSPICIOUS_PATTERNS = [
  // Typosquatting / impersonation indicators
  /0x[a-fA-F0-9]{40,}/i, // Raw wallet addresses in URL
  /token|airdrop|claim|reward|free|doubl/i, // Keywords commonly used in scams
  /giveaway|genesis|launch|presale|sale/i,
  /wallet|metamask|trust|ledger|exodus/i, // Wallet-related typosquatting
];

// Known high-risk TLDs
const RISKY_TLDS = [
  '.xyz', '.top', '.club', '.online', '.site', '.work', '.click', '.link',
  '.buzz', '.icu', '.pw', '.tk', '.ml', '.ga', '.cf', '.gq',
];

// Shortener domains
const URL_SHORTENERS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly',
  'shorturl.at', 'rb.gy', 'cutt.ly', 'tiny.cc', 'bl.ink', 'short.link',
];

// Legitimate domains that should be verified
const OFFICIAL_BRAND_DOMAINS: Record<string, string[]> = {
  'ethereum': ['ethereum.org', 'ethereum.foundation'],
  'bitcoin': ['bitcoin.org', 'bitcoin.org'],
  'uniswap': ['uniswap.org'],
  'coinbase': ['coinbase.com'],
  'binance': ['binance.com'],
  'opensea': ['opensea.io'],
  'foundation': ['gitcoin.co', 'gitcoin.foundation'],
  'lens': ['lens.xyz', 'lensprotocol.com'],
  'farcaster': ['farcaster.xyz', 'warpcast.com'],
  'neynar': ['neynar.com', 'neynar.io'],
};

// Suspicious keywords in domain
const SUSPICIOUS_KEYWORDS = [
  'free', 'airdrop', 'claim', 'reward', 'gift', 'bonus',
  'urgent', 'actnow', 'limited', 'exclusive',
  'verify', 'secure', 'wallet', 'metamask', 'trustwallet',
  'suspend', 'verify', 'confirm', 'support',
];

function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isUrlShortener(domain: string): boolean {
  return URL_SHORTENERS.some(s => domain.includes(s));
}

function checkImpersonation(domain: string): boolean {
  const domain_lower = domain.toLowerCase();

  // Check if it looks like a brand but isn't the official domain
  for (const [brand, officialDomains] of Object.entries(OFFICIAL_BRAND_DOMAINS)) {
    const isBrand = domain_lower.includes(brand);
    const isOfficial = officialDomains.some(d => domain_lower === d || domain_lower.endsWith('.' + d));

    if (isBrand && !isOfficial) {
      return true;
    }
  }

  // Check for common impersonation patterns
  const parts = domain_lower.split('.');
  if (parts.length > 2) {
    const subdomain = parts[0];
    // If subdomain looks like a brand name
    const brandLike = ['meta', 'wallet', 'trust', 'safe', 'secure', 'help', 'support'];
    if (subdomain && brandLike.some(b => subdomain.includes(b))) {
      return true;
    }
  }

  return false;
}

function checkRiskTLD(domain: string): boolean {
  return RISKY_TLDS.some(tld => domain.endsWith(tld));
}

function checkSuspiciousKeywords(domain: string): string[] {
  const findings: string[] = [];
  const domain_lower = domain.toLowerCase();

  SUSPICIOUS_KEYWORDS.forEach(keyword => {
    if (domain_lower.includes(keyword)) {
      findings.push(`Contains suspicious keyword: "${keyword}"`);
    }
  });

  return findings;
}

function checkPathSuspicious(path: string): string[] {
  const findings: string[] = [];
  const path_lower = path.toLowerCase();

  if (path_lower.includes('seed') || path_lower.includes('phrase') || path_lower.includes('private')) {
    findings.push('Path requests sensitive authentication info');
  }

  if (path_lower.includes('connect') && path_lower.includes('wallet')) {
    findings.push('Requests wallet connection');
  }

  if (path_lower.includes('sign') && path_lower.includes('message')) {
    findings.push('Requests message signature');
  }

  return findings;
}

function checkForWalletAddress(url: string): boolean {
  const pattern = SUSPICIOUS_PATTERNS[0];
  return pattern ? pattern.test(url) : false;
}

export function analyzeURL(url: string): URLRiskAnalysis {
  const result: URLRiskAnalysis = {
    url,
    riskLevel: 'low',
    risks: [],
    warnings: [],
    isSuspicious: false,
    isShortened: false,
    isImpersonation: false,
    shouldWarn: false,
    verifiedOfficial: false,
  };

  const domain = extractDomain(url);
  if (!domain) {
    result.riskLevel = 'high';
    result.risks.push('Invalid URL format');
    result.isSuspicious = true;
    result.shouldWarn = true;
    return result;
  }

  // Check for URL shorteners
  if (isUrlShortener(domain)) {
    result.isShortened = true;
    result.riskLevel = 'medium';
    result.warnings.push('URL is shortened - cannot verify final destination');
  }

  // Check for impersonation
  if (checkImpersonation(domain)) {
    result.isImpersonation = true;
    result.riskLevel = 'critical';
    result.risks.push('Domain impersonates known brand or service');
    result.isSuspicious = true;
  }

  // Check for risky TLDs
  if (checkRiskTLD(domain)) {
    result.riskLevel = result.riskLevel === 'low' ? 'medium' : result.riskLevel;
    result.warnings.push('Domain uses non-standard TLD often associated with scams');
  }

  // Check for suspicious keywords in domain
  const keywordFindings = checkSuspiciousKeywords(domain);
  if (keywordFindings.length > 0) {
    result.risks.push(...keywordFindings);
    if (keywordFindings.length >= 2) {
      result.riskLevel = 'high';
      result.isSuspicious = true;
    }
  }

  // Check path for suspicious patterns
  try {
    const parsed = new URL(url);
    const pathFindings = checkPathSuspicious(parsed.pathname);
    if (pathFindings.length > 0) {
      result.risks.push(...pathFindings);
      result.riskLevel = 'critical';
      result.isSuspicious = true;
    }
  } catch {
    // Invalid URL, already caught above
  }

  // Check for raw wallet addresses
  if (checkForWalletAddress(url)) {
    result.riskLevel = 'critical';
    result.risks.push('URL contains raw wallet address - potential scam');
    result.isSuspicious = true;
  }

  // Check if domain is official (low risk if verified)
  for (const [, officialDomains] of Object.entries(OFFICIAL_BRAND_DOMAINS)) {
    if (officialDomains.some(d => domain === d || domain.endsWith('.' + d))) {
      result.verifiedOfficial = true;
      // Official domains can still have risky paths
      if (result.riskLevel !== 'critical') {
        result.riskLevel = 'low';
      }
      break;
    }
  }

  // Set shouldWarn based on risk level
  result.shouldWarn = result.riskLevel === 'high' || result.riskLevel === 'critical';

  return result;
}

export function analyzeMultipleURLs(urls: string[]): URLRiskAnalysis[] {
  return urls.map(url => analyzeURL(url));
}

export function getSafetyRecommendation(analysis: URLRiskAnalysis): string {
  if (analysis.verifiedOfficial && analysis.riskLevel === 'low') {
    return 'URL appears to be from an official source.';
  }

  if (analysis.isImpersonation) {
    return '⚠️ This URL appears to impersonate a known brand. DO NOT visit. Official sources are never hosted on similar-looking domains.';
  }

  if (analysis.isShortened) {
    return '⚠️ This URL is shortened - the final destination is hidden. Exercise caution and consider asking the sender for the full URL.';
  }

  if (analysis.risks.includes('Path requests wallet connection') || analysis.risks.includes('Path requests sensitive authentication info')) {
    return '⚠️ This URL asks for wallet access or sensitive info. Never connect your wallet or enter seed phrases on unfamiliar sites.';
  }

  if (analysis.riskLevel === 'critical') {
    return '⚠️ This URL is high-risk. Do not visit or interact with this content.';
  }

  if (analysis.riskLevel === 'high') {
    return '⚠️ This URL has warning signs. Verify the source before proceeding.';
  }

  return 'This URL appears relatively safe but always exercise caution with cryptocurrency-related links.';
}

// ─── Claim Safety Helper ───────────────────────────────────────────────────────

export interface ClaimSafetyResult {
  safe: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  officialSourceDetected: boolean;
  warnings: string[];
  recommendations: string[];
  linksAnalyzed: URLRiskAnalysis[];
}

export function analyzeClaimSafety(claimText: string, urls: string[] = []): ClaimSafetyResult {
  const result: ClaimSafetyResult = {
    safe: true,
    riskLevel: 'low',
    officialSourceDetected: false,
    warnings: [],
    recommendations: [],
    linksAnalyzed: [],
  };

  // Analyze all URLs
  if (urls.length > 0) {
    result.linksAnalyzed = analyzeMultipleURLs(urls);

    const hasSuspicious = result.linksAnalyzed.some(a => a.isSuspicious);
    const hasImpersonation = result.linksAnalyzed.some(a => a.isImpersonation);
    const hasWalletRequest = result.linksAnalyzed.some(a =>
      a.risks.includes('Path requests wallet connection')
    );

    if (hasImpersonation) {
      result.safe = false;
      result.riskLevel = 'critical';
      result.warnings.push('Link appears to impersonate official brand');
      result.recommendations.push('NEVER visit links that impersonate official brands');
    }

    if (hasWalletRequest) {
      result.safe = false;
      result.riskLevel = 'critical';
      result.warnings.push('Link requests wallet access');
      result.recommendations.push('NEVER connect your wallet or enter seed phrases');
    }

    if (hasSuspicious && !hasImpersonation) {
      result.riskLevel = result.riskLevel === 'low' ? 'high' : result.riskLevel;
      result.warnings.push('Link has suspicious characteristics');
    }

    // Check for official sources
    result.officialSourceDetected = result.linksAnalyzed.some(a => a.verifiedOfficial);
  }

  // Check claim text for red flags
  const claim_lower = claimText.toLowerCase();

  // Claims about "official" announcements
  if (claim_lower.includes('official') && !result.officialSourceDetected) {
    result.warnings.push('Claim references "official" source but no verified official link detected');
    result.recommendations.push('Verify any "official" claims on the project\'s official channels');
  }

  // Urgency indicators
  if (/urgent|act now|limited time|don't miss|before it's too late/i.test(claimText)) {
    result.warnings.push('Claim uses urgency tactics common in scams');
    result.recommendations.push('Legitimate projects rarely pressure you to act immediately');
  }

  // Financial claims
  if (/guarantee|double your|100%|risk free/i.test(claimText)) {
    result.warnings.push('Claim contains suspicious financial language');
  }

  // Update safety level
  if (result.warnings.length > 0 && result.riskLevel === 'low') {
    result.riskLevel = 'medium';
  }

  // Generate recommendation
  if (result.riskLevel === 'critical' || result.riskLevel === 'high') {
    result.safe = false;
  }

  if (!result.officialSourceDetected && claim_lower.includes('official')) {
    result.recommendations.push('Always verify through official project channels (official website, verified social media)');
  }

  return result;
}
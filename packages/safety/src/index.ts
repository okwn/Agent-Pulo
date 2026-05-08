// safety/src/index.ts — Public API for @pulo/safety

// Types
export type {
  SafetyResult,
  SafetyBlock,
  SafetyFlag,
  SafetyAction,
  UserPlan,
  PlanLimits,
  ConsentType,
  UserConsents,
  SafetyContext,
  RiskAssessment,
} from './types.js';

export {
  PLAN_LIMITS,
  SCAM_KEYWORDS,
  CAUTION_KEYWORDS,
  FINANCIAL_ADVICE_PATTERNS,
  PRIVATE_DATA_PATTERNS,
  SUSPICIOUS_LINK_PATTERNS,
  blockResult,
  safeResult,
} from './types.js';

// Errors
export { SafetyBlockError, SafetyConfigError } from './errors.js';

// Rate Limiter
export {
  RateLimiter,
  FixedWindowRateLimiter,
  DailyCounter,
  type RateLimiterConfig,
  type FixedWindowConfig,
} from './rate-limiter.js';

// Plan Limits
export {
  checkPlanLimit,
  enforcePlanLimit,
  recordAction,
  getUsageCount,
  getPlanLimitForAction,
} from './plan-limits.js';

// SafetyGate
export { SafetyGate, type SafetyGateConfig } from './safety-gate.js';

// Guards
export {
  // Duplicate
  checkDuplicateReply,
  enforceDuplicateReply,
  markInFlight,
  markProcessed,
  cancelInFlight,
  clearDuplicateState,
  // Cooldown
  checkSameAuthorCooldown,
  enforceSameAuthorCooldown,
  checkSameCastCooldown,
  enforceSameCastCooldown,
  checkChannelCooldown,
  enforceChannelCooldown,
  clearAllCooldowns,
  // Consent
  checkConsent,
  enforceConsent,
  defaultConsents,
  // Scam Risk
  checkScamRisk,
  enforceScamRisk,
  assessScamRisk,
  getClaimResponseGuidance,
  // Financial Advice
  checkFinancialAdvice,
  enforceFinancialAdvice,
  checkPricePrediction,
  // Toxicity
  checkToxicity,
  enforceToxicity,
  getToxicityScore,
  // Political
  checkPoliticalContent,
  enforcePoliticalContent,
  // Private Data
  checkPrivateData,
  enforcePrivateData,
  scrubPrivateData,
  // Link Risk
  checkLinkRisk,
  enforceLinkRisk,
  extractDomain,
  // Auto Publish
  checkAutoPublish,
  enforceAutoPublish,
  type AutoPublishConfig,
} from './guards/index.js';

// safety/src/guards/index.ts — Re-exports all safety guards

export { checkDuplicateReply, enforceDuplicateReply, markInFlight, markProcessed, cancelInFlight, clearDuplicateState } from './duplicate-reply.guard.js';
export { checkSameAuthorCooldown, enforceSameAuthorCooldown, checkSameCastCooldown, enforceSameCastCooldown, checkChannelCooldown, enforceChannelCooldown, clearAllCooldowns } from './cooldown.guard.js';
export { checkConsent, enforceConsent, defaultConsents } from './consent.guard.js';
export { checkScamRisk, enforceScamRisk, assessScamRisk, getClaimResponseGuidance } from './scam-risk.guard.js';
export { checkFinancialAdvice, enforceFinancialAdvice, checkPricePrediction } from './financial-advice.guard.js';
export { checkToxicity, enforceToxicity, getToxicityScore } from './toxicity.guard.js';
export { checkPoliticalContent, enforcePoliticalContent } from './political.guard.js';
export { checkPrivateData, enforcePrivateData, scrubPrivateData } from './private-data.guard.js';
export { checkLinkRisk, enforceLinkRisk, extractDomain } from './link-risk.guard.js';
export { checkAutoPublish, enforceAutoPublish, type AutoPublishConfig } from './auto-publish.guard.js';

// safety/src/guards/consent.guard.ts — Consent verification guards

import type { SafetyContext, SafetyResult, UserConsents } from '../types.js';
import { SafetyBlockError } from '../errors.js';

/**
 * Verifies user has given consent for a specific action type.
 * Returns silently if consent is given, throws SafetyBlockError if not.
 */
export function enforceConsent(
  context: SafetyContext & { action: 'direct_cast' | 'mini_app_notification' | 'auto_publish' },
  consents: UserConsents
): void {
  switch (context.action) {
    case 'direct_cast':
      if (!consents.directCast) {
        throw new SafetyBlockError(
          'CONSENT_REQUIRED',
          'User has not opted in to direct cast alerts',
          'Direct cast alerts require your opt-in. Enable them in settings.',
          1.0
        );
      }
      break;

    case 'mini_app_notification':
      if (!consents.miniAppNotifications) {
        throw new SafetyBlockError(
          'CONSENT_REQUIRED',
          'User has not opted in to mini-app notifications',
          'Notifications are disabled. Enable them in your settings.',
          1.0
        );
      }
      break;

    case 'auto_publish':
      if (!consents.autoPublish) {
        throw new SafetyBlockError(
          'CONSENT_REQUIRED',
          'User has not opted in to auto-publish',
          'Auto-publish requires your explicit opt-in.',
          1.0
        );
      }
      break;
  }
}

export function checkConsent(
  context: SafetyContext & { action: 'direct_cast' | 'mini_app_notification' | 'auto_publish' },
  consents: UserConsents
): SafetyResult {
  switch (context.action) {
    case 'direct_cast':
      if (!consents.directCast) {
        return {
          safe: false,
          reason: 'User has not opted in to direct cast alerts',
          flag: 'CONSENT_REQUIRED',
          confidence: 1.0,
        };
      }
      break;

    case 'mini_app_notification':
      if (!consents.miniAppNotifications) {
        return {
          safe: false,
          reason: 'User has not opted in to mini-app notifications',
          flag: 'CONSENT_REQUIRED',
          confidence: 1.0,
        };
      }
      break;

    case 'auto_publish':
      if (!consents.autoPublish) {
        return {
          safe: false,
          reason: 'User has not opted in to auto-publish',
          flag: 'AUTO_PUBLISH_BLOCKED',
          confidence: 1.0,
        };
      }
      break;
  }

  return { safe: true, confidence: 1.0 };
}

/**
 * Returns the default consents for a new user (all false — explicit opt-in required).
 */
export function defaultConsents(): UserConsents {
  return {
    directCast: false,
    miniAppNotifications: false,
    autoPublish: false,
    trendAlerts: false,
    truthCheckAlerts: false,
  };
}

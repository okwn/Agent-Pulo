// safety/src/guards/duplicate-reply.guard.ts — Prevents duplicate replies to the same cast

import type { SafetyContext, SafetyResult } from '../types.js';
import { SafetyBlockError } from '../errors.js';

const inFlightReplies = new Set<string>();
const processedReplies = new Set<string>();

function replyKey(context: SafetyContext): string {
  return `${context.userId}:${context.castHash ?? 'nocast'}`;
}

export function checkDuplicateReply(context: SafetyContext): SafetyResult {
  if (!context.castHash) return { safe: true, confidence: 1.0 };
  const key = replyKey(context);

  if (inFlightReplies.has(key)) {
    return {
      safe: false,
      reason: `Reply to cast ${context.castHash} is already in-flight for this user`,
      flag: 'DUPLICATE_REPLY',
      confidence: 1.0,
    };
  }

  if (processedReplies.has(key)) {
    return {
      safe: false,
      reason: `Reply to cast ${context.castHash} was already processed for this user`,
      flag: 'DUPLICATE_REPLY',
      confidence: 1.0,
    };
  }

  return { safe: true, confidence: 1.0 };
}

export function enforceDuplicateReply(context: SafetyContext): void {
  if (!context.castHash) return;
  const result = checkDuplicateReply(context);
  if (!result.safe) {
    throw new SafetyBlockError(
      'DUPLICATE_REPLY',
      result.reason!,
      'You already replied to this cast.',
      result.confidence
    );
  }
}

/**
 * Mark a reply as in-flight (being processed). Call markProcessed when done.
 */
export function markInFlight(context: SafetyContext): void {
  if (!context.castHash) return;
  inFlightReplies.add(replyKey(context));
}

/**
 * Mark a reply as successfully processed.
 */
export function markProcessed(context: SafetyContext): void {
  if (!context.castHash) return;
  const key = replyKey(context);
  inFlightReplies.delete(key);
  processedReplies.add(key);
}

/**
 * Cancel an in-flight reply (e.g., on error).
 */
export function cancelInFlight(context: SafetyContext): void {
  if (!context.castHash) return;
  inFlightReplies.delete(replyKey(context));
}

export function hasProcessed(context: SafetyContext): boolean {
  if (!context.castHash) return false;
  return processedReplies.has(replyKey(context));
}

export function hasInFlight(context: SafetyContext): boolean {
  if (!context.castHash) return false;
  return inFlightReplies.has(replyKey(context));
}

export function clearDuplicateState(): void {
  inFlightReplies.clear();
  processedReplies.clear();
}

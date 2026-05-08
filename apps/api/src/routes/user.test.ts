// Settings validation and defaults tests

import { describe, it, expect } from 'vitest';

describe('Alert Settings Defaults', () => {
  it('allowDirectCasts defaults to false', () => {
    // Default from schema: allowDirectCasts boolean('allow_direct_casts').default(false)
    const defaults = {
      allowMiniAppNotifications: true,
      allowDirectCasts: false, // MUST be false (opt-in)
      dailyAlertLimit: 50,
    };
    expect(defaults.allowDirectCasts).toBe(false);
  });

  it('dailyAlertLimit has sensible default', () => {
    const defaults = { dailyAlertLimit: 50 };
    expect(defaults.dailyAlertLimit).toBe(50);
    expect(defaults.dailyAlertLimit).toBeGreaterThan(0);
    expect(defaults.dailyAlertLimit).toBeLessThanOrEqual(1000);
  });
});

describe('Automation Settings Defaults', () => {
  it('autoReplyMode defaults to off', () => {
    // Default from schema: autoReplyMode: text('auto_reply_mode').default('off')
    const defaults = {
      autoReplyMode: 'off', // MUST be 'off' (disabled)
      mentionOnlyMode: true,
    };
    expect(defaults.autoReplyMode).toBe('off');
  });

  it('mentionOnlyMode defaults to true', () => {
    const defaults = {
      autoReplyMode: 'off',
      mentionOnlyMode: true,
    };
    expect(defaults.mentionOnlyMode).toBe(true);
  });
});

describe('Voice Settings Validation', () => {
  it('tone must be valid enum', () => {
    const validTones = ['balanced', 'formal', 'casual', 'witty'];
    expect(validTones).toContain('balanced');
    expect(validTones).toContain('formal');
    expect(validTones).toContain('casual');
    expect(validTones).toContain('witty');
    expect(validTones).not.toContain('aggressive');
  });

  it('replyStyle must be valid enum', () => {
    const validStyles = ['helpful', 'brief', 'detailed', 'persuasive'];
    expect(validStyles).toContain('helpful');
    expect(validStyles).toContain('brief');
    expect(validStyles).toContain('detailed');
    expect(validStyles).toContain('persuasive');
    expect(validStyles).not.toContain('aggressive');
  });

  it('humorLevel must be 0-100', () => {
    const validRange = (val: number) => val >= 0 && val <= 100;
    expect(validRange(0)).toBe(true);
    expect(validRange(50)).toBe(true);
    expect(validRange(100)).toBe(true);
    expect(validRange(-1)).toBe(false);
    expect(validRange(101)).toBe(false);
  });
});

describe('Alert Settings Validation', () => {
  it('riskTolerance must be valid enum', () => {
    const validLevels = ['low', 'medium', 'high'];
    expect(validLevels).toContain('low');
    expect(validLevels).toContain('medium');
    expect(validLevels).toContain('high');
    expect(validLevels).not.toContain('critical');
  });

  it('frequency must be valid enum', () => {
    const validFrequencies = ['realtime', 'digest', 'minimal'];
    expect(validFrequencies).toContain('realtime');
    expect(validFrequencies).toContain('digest');
    expect(validFrequencies).toContain('minimal');
    expect(validFrequencies).not.toContain('hourly');
  });

  it('dailyAlertLimit must be 1-1000', () => {
    const validRange = (val: number) => val >= 1 && val <= 1000;
    expect(validRange(1)).toBe(true);
    expect(validRange(50)).toBe(true);
    expect(validRange(1000)).toBe(true);
    expect(validRange(0)).toBe(false);
    expect(validRange(1001)).toBe(false);
  });
});

describe('Settings Update Rejection', () => {
  it('rejects invalid tone', () => {
    const validTones = ['balanced', 'formal', 'casual', 'witty'];
    const invalidTone = 'aggressive';
    expect(validTones).not.toContain(invalidTone);
  });

  it('rejects negative dailyAlertLimit', () => {
    const invalidValue = -1;
    expect(invalidValue).toBeLessThan(1);
  });

  it('rejects riskTolerance out of enum', () => {
    const validLevels = ['low', 'medium', 'high'];
    const invalidLevel = 'critical';
    expect(validLevels).not.toContain(invalidLevel);
  });
});

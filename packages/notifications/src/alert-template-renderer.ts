// notifications/src/alert-template-renderer.ts — Renders alert templates with context

import { createChildLogger } from '@pulo/observability';
import { ALERT_TEMPLATES, type Alert, type AlertRenderContext, type AlertTemplate } from './types.js';

const log = createChildLogger('alert-template-renderer');

export class AlertTemplateRenderer {
  render(template: AlertTemplate, alert: Alert, ctx: AlertRenderContext): { title: string; body: string } {
    const title = this.interpolate(template.title, ctx);
    const body = this.interpolate(template.body, ctx);
    return { title, body };
  }

  selectTemplate(alert: Alert): AlertTemplate {
    switch (alert.type) {
      case 'claim_detected':
        return alert.riskLevel === 'high' || alert.riskLevel === 'critical'
          ? ALERT_TEMPLATES.CLAIM_HIGH_RISK
          : ALERT_TEMPLATES.CLAIM_MEDIUM_RISK;

      case 'reward_program':
        return ALERT_TEMPLATES.REWARD_PROGRAM;

      case 'token_launch':
        return ALERT_TEMPLATES.TOKEN_LAUNCH;

      case 'grant':
        return ALERT_TEMPLATES.GRANT_HACKATHON;

      case 'scam_warning':
        return ALERT_TEMPLATES.SCAM_WARNING;

      case 'truth_check_ready':
        return ALERT_TEMPLATES.TRUTH_CHECK_COMPLETED;

      case 'trend_detected':
        return alert.category === 'grant' || alert.category === 'hackathon'
          ? ALERT_TEMPLATES.GRANT_HACKATHON
          : ALERT_TEMPLATES.REWARD_PROGRAM;

      default:
        return { templateId: 'default', type: alert.type, title: alert.title, body: alert.body };
    }
  }

  private interpolate(text: string, ctx: AlertRenderContext): string {
    let result = text;
    for (const [key, value] of Object.entries(ctx)) {
      const placeholder = `{${key}}`;
      const rendered = value !== undefined && value !== null ? String(value) : '';
      result = result.split(placeholder).join(rendered);
    }
    return result;
  }
}

export const alertTemplateRenderer = new AlertTemplateRenderer();

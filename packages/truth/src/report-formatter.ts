// truth/src/report-formatter.ts — Formats truth reports for public reply and dashboard

import { createChildLogger } from '@pulo/observability';
import type {
  TruthReport,
  Verdict,
  EvidenceSummary,
  RiskAssessment,
  TruthCheckContext,
} from './types.js';
import { formatVerdictLabel, MAX_PUBLIC_REPLY_LENGTH } from './types.js';

const log = createChildLogger('report-formatter');

export class TruthReportFormatter {
  /**
   * Format a complete TruthReport.
   */
  format(
    report: Omit<TruthReport, 'publicReplyText' | 'recommendedAction'>,
    verdict: Verdict,
    verdictConfidence: number,
    queryLanguage: 'en' | 'tr' | 'unknown' = 'en'
  ): TruthReport {
    const recommendedAction = this.getRecommendedAction(verdict, report.riskAssessment);
    const publicReplyText = this.formatPublicReply(report, verdict, verdictConfidence, recommendedAction, queryLanguage);

    return {
      ...report,
      verdict,
      confidence: verdictConfidence,
      publicReplyText,
      recommendedAction,
    };
  }

  /**
   * Format a short public reply (≤320 chars).
   * When queryLanguage is 'tr', produces Turkish labels and text.
   */
  formatPublicReply(
    report: Omit<TruthReport, 'publicReplyText' | 'recommendedAction'>,
    verdict: Verdict,
    confidence: number,
    recommendedAction: TruthReport['recommendedAction'],
    queryLanguage: 'en' | 'tr' | 'unknown' = 'en'
  ): string {
    const parts: string[] = [];

    // 1. Verdict label (bilingual)
    parts.push(formatVerdictLabel(verdict, queryLanguage));

    // 2. Confidence when available
    if (verdict !== 'insufficient_context' && verdict !== 'unverified') {
      const confLabel = queryLanguage === 'tr' ? '%' : `(`;
      const confSuffix = queryLanguage === 'tr' ? `${Math.round(confidence * 100)}% güven` : ` ${Math.round(confidence * 100)}% confidence)`;
      parts.push(`${Math.round(confidence * 100)}${confLabel}${queryLanguage === 'tr' ? ' güven' : confSuffix}`);
    }

    // 3. Short answer (bilingual)
    parts.push(this.shortAnswerFor(verdict, queryLanguage));

    // 4. Safety warning for scam_risk or high risk
    if (verdict === 'scam_risk' || report.riskAssessment.overallRisk === 'critical') {
      parts.push(queryLanguage === 'tr'
        ? 'Cüzdanınızı bağlamayın veya linklere tıklamayın.'
        : 'Do NOT connect a wallet or click links.');
    }

    // 5. Call to action for unverified
    if (verdict === 'unverified' || verdict === 'insufficient_context') {
      parts.push(queryLanguage === 'tr'
        ? 'Etkileşimden önce resmi kaynaklarla doğrulayın.'
        : 'Verify with official sources before engaging.');
    }

    // 6. Short evidence note (if brief)
    const evidenceNote = this.getEvidenceNote(report.evidence, verdict, queryLanguage);
    if (evidenceNote) {
      parts.push(evidenceNote);
    }

    let reply = parts.join(' ');

    // Truncate to fit within 320 chars
    if (reply.length > MAX_PUBLIC_REPLY_LENGTH) {
      reply = reply.slice(0, MAX_PUBLIC_REPLY_LENGTH - 3) + '...';
    }

    return reply;
  }

  private shortAnswerFor(verdict: Verdict, lang: 'en' | 'tr' | 'unknown'): string {
    if (lang === 'tr') {
      switch (verdict) {
        case 'likely_true': return 'Bu iddia mevcut kanıtlara göre doğru görünüyor.';
        case 'likely_false': return 'Bu iddia mevcut kanıtlara göre yanlış veya yanıltıcı.';
        case 'mixed': return 'Kanıtlar karışık — bazı kaynaklar bu iddiayı destekliyor, diğerleri çelişiyor.';
        case 'unverified': return 'İnsanların tartıştığını buldum ancak henüz resmi kaynaklardan doğrulama yok.';
        case 'scam_risk': return 'Bu içerik dolandırıcılık belirtileri gösteriyor. Etkileşime girmeyin veya paylaşmayın.';
        case 'insufficient_context': return 'Bu iddiayı doğrulamak için yeterli bilgi yok.';
      }
    }
    switch (verdict) {
      case 'likely_true': return 'This claim appears to be accurate based on available evidence.';
      case 'likely_false': return 'This claim appears to be inaccurate or misleading based on available evidence.';
      case 'mixed': return 'Evidence is mixed — some sources support this claim, others contradict it.';
      case 'unverified': return 'I found people discussing this, but there is no clear confirmation from official sources yet.';
      case 'scam_risk': return 'This content shows signs of a scam. Do NOT engage or share.';
      case 'insufficient_context': return 'Not enough information is available to verify this claim.';
    }
  }

  private getRecommendedAction(
    verdict: Verdict,
    riskAssessment: RiskAssessment
  ): TruthReport['recommendedAction'] {
    if (verdict === 'scam_risk' || riskAssessment.overallRisk === 'critical') {
      return 'do_not_share';
    }
    if (riskAssessment.overallRisk === 'high') {
      return 'verify_first';
    }
    if (verdict === 'likely_true' && riskAssessment.overallRisk === 'low') {
      return 'safe_to_share';
    }
    if (verdict === 'unverified' || verdict === 'insufficient_context') {
      return 'cannot_determine';
    }
    if (verdict === 'likely_false') {
      return 'do_not_share';
    }
    return 'verify_first';
  }

  private getEvidenceNote(evidence: EvidenceSummary, verdict: Verdict, lang: 'en' | 'tr' | 'unknown' = 'en'): string {
    const { supporting_casts, contradicting_casts, official_sources } = evidence;

    if (verdict === 'scam_risk' && contradicting_casts.length > 0) {
      return lang === 'tr'
        ? 'Şüpheli linkler veya dolandırıcılık hakkında birkaç yanıt uyarıyor.'
        : 'Several replies warn about suspicious links or scams.';
    }

    if (official_sources.length > 0) {
      return lang === 'tr' ? 'Resmi kaynak bulundu.' : 'Official sources found.';
    }

    if (supporting_casts.length > 3 && verdict === 'likely_true') {
      return lang === 'tr'
        ? `${supporting_casts.length} hesap bunu tartışıyor.`
        : `${supporting_casts.length} accounts discussing it.`;
    }

    if (contradicting_casts.length > 0 && verdict === 'likely_false') {
      return lang === 'tr'
        ? `${contradicting_casts.length} yanıt bu iddiayı çürütüyor.`
        : `${contradicting_casts.length} replies contradict this claim.`;
    }

    if (supporting_casts.length === 0 && contradicting_casts.length === 0) {
      return lang === 'tr' ? 'Güçlü kanıt bulunamadı.' : 'No strong evidence found either way.';
    }

    return '';
  }

  /**
   * Format a dashboard explanation (2-3 sentences).
   */
  formatDashboardExplanation(
    verdict: Verdict,
    confidence: number,
    evidence: EvidenceSummary,
    riskAssessment: RiskAssessment,
    claim: string
  ): string {
    const parts: string[] = [];

    // Claim summary
    parts.push(`The claim "${claim.slice(0, 100)}${claim.length > 100 ? '...' : ''}" was analyzed.`);

    // Evidence summary
    const { supporting_casts, contradicting_casts, official_sources } = evidence;
    if (official_sources.length > 0) {
      parts.push(`${official_sources.length} official source(s) found.`);
    }
    if (supporting_casts.length > 0) {
      parts.push(`${supporting_casts.length} cast(s) supporting.`);
    }
    if (contradicting_casts.length > 0) {
      parts.push(`${contradicting_casts.length} cast(s) contradicting.`);
    }

    // Risk note
    if (riskAssessment.overallRisk !== 'low') {
      parts.push(`Risk level: ${riskAssessment.overallRisk}.`);
    }

    return parts.join(' ');
  }
}

export const truthReportFormatter = new TruthReportFormatter();

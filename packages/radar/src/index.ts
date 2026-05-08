// @pulo/radar — Trend detection for airdrops, grants, rewards, tokens, programs

export * from './types.js';
export * from './channel-watcher.js';
export * from './keyword-watcher.js';
export * from './cast-ingestion-normalizer.js';
export * from './trend-clusterer.js';
export * from './trend-scorer.js';
export * from './velocity-scorer.js';
export * from './trust-weighted-author-scorer.js';
export * from './engagement-scorer.js';
export * from './link-risk-analyzer.js';
export * from './claim-risk-analyzer.js';
export * from './trend-summarizer.js';
export * from './alert-candidate-selector.js';
export { RadarScan, radarScan, type RadarScanOptions, type ScanResult } from './radar-scan.js';
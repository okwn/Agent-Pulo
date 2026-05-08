// llm/src/prompts.ts — Prompt template loader with versioning

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface PromptMetadata {
  version: string;
  runType: string;
  description: string;
  modelTier: 'small' | 'large';
}

export interface PromptTemplate {
  metadata: PromptMetadata;
  content: string;
  render: (vars: Record<string, string>) => string;
}

function parseFrontmatter(content: string): { metadata: PromptMetadata; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { metadata: { version: '1.0.0', runType: 'unknown', description: '', modelTier: 'small' }, body: content };

  const yamlLines = match[1]!.split('\n');
  const metadata: Record<string, string> = {};
  for (const line of yamlLines) {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      metadata[key.trim()] = valueParts.join(':').trim();
    }
  }

  return {
    metadata: {
      version: metadata['version'] ?? '1.0.0',
      runType: metadata['runType'] ?? 'unknown',
      description: metadata['description'] ?? '',
      modelTier: (metadata['modelTier'] as 'small' | 'large') ?? 'small',
    },
    body: match[2] ?? '',
  };
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}`);
}

const PROMPTS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'prompts');

const _cache = new Map<string, PromptTemplate>();

export function loadPrompt(runType: string, version?: string): PromptTemplate {
  const cacheKey = `${runType}:${version ?? 'latest'}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey)!;

  const files = readdirSync(PROMPTS_DIR).filter(f => f.endsWith('.md'));
  const file = files.find(f => f.startsWith(runType));
  if (!file) throw new Error(`Prompt for runType '${runType}' not found in ${PROMPTS_DIR}`);

  const raw = readFileSync(join(PROMPTS_DIR, file), 'utf-8');
  const { metadata, body } = parseFrontmatter(raw);

  if (version && metadata.version !== version) {
    throw new Error(`Prompt ${runType} version ${metadata.version} does not match requested ${version}`);
  }

  const template: PromptTemplate = {
    metadata,
    content: body.trim(),
    render: (vars: Record<string, string>) => renderTemplate(body.trim(), vars),
  };

  _cache.set(cacheKey, template);
  return template;
}

export function listPromptVersions(runType: string): string[] {
  const files = readdirSync(PROMPTS_DIR).filter(f => f.startsWith(runType));
  return files;
}

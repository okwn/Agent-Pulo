// llm/src/prompts.ts — Prompt template loader with full versioning metadata

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

export const PromptFrontmatterSchema = z.object({
  version: z.string(),
  runType: z.string(),
  description: z.string(),
  modelTier: z.enum(['small', 'large']),
  inputSchema: z.string().optional(),
  outputSchema: z.string().optional(),
  safetyNotes: z.string().optional(),
  minConfidence: z.number().optional(),
});

export type PromptFrontmatter = z.infer<typeof PromptFrontmatterSchema>;

export interface PromptMetadata {
  version: string;
  runType: string;
  description: string;
  modelTier: 'small' | 'large';
  inputSchema?: string;
  outputSchema?: string;
  safetyNotes?: string;
  minConfidence?: number;
}

export interface PromptTemplate {
  metadata: PromptMetadata;
  content: string;
  render: (vars: Record<string, string>) => string;
}

function parseFrontmatter(content: string): { metadata: PromptMetadata; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return {
      metadata: { version: '1.0.0', runType: 'unknown', description: '', modelTier: 'small' },
      body: content,
    };
  }

  const yamlLines = match[1]!.split('\n');
  const raw: Record<string, string> = {};
  let i = 0;
  while (i < yamlLines.length) {
    const line = yamlLines[i] ?? '';
    if (!line.trim()) { i++; continue; }

    // Detect multiline scalar: line ends with |
    const pipeMatch = line.match(/^(\w+):\s*\|$/);
    if (pipeMatch) {
      const key = pipeMatch[1]!;
      const lines: string[] = [];
      i++;
      while (i < yamlLines.length) {
        const indented = yamlLines[i] ?? '';
        if (!indented.startsWith('  ') && indented !== '') break;
        lines.push(indented.replace(/^  /, ''));
        i++;
      }
      raw[key] = lines.join('\n');
      continue;
    }

    // Normal key: value line
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      raw[key] = value;
    }
    i++;
  }

  const minConfidence = raw['minConfidence'] ? parseFloat(raw['minConfidence'] ?? '') : undefined;

  return {
    metadata: {
      version: raw['version'] ?? '1.0.0',
      runType: raw['runType'] ?? 'unknown',
      description: raw['description'] ?? '',
      modelTier: (raw['modelTier'] as 'small' | 'large') ?? 'small',
      inputSchema: raw['inputSchema'],
      outputSchema: raw['outputSchema'],
      safetyNotes: raw['safetyNotes'],
      minConfidence: isNaN(minConfidence as number) ? undefined : minConfidence,
    },
    body: match[2] ?? '',
  };
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

const PROMPTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'prompts');

const _cache = new Map<string, PromptTemplate>();

export function loadPrompt(runType: string, version?: string): PromptTemplate {
  const cacheKey = `${runType}:${version ?? 'latest'}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey)!;

  // Compute prompts dir relative to this file at runtime
  const promptsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'prompts');
  const files = readdirSync(promptsDir).filter(f => f.endsWith('.md'));
  const file = files.find(f => f.startsWith(runType));
  if (!file) throw new Error(`Prompt for runType '${runType}' not found in ${promptsDir}`);

  const filePath = join(promptsDir, file);
  const raw = readFileSync(filePath, 'utf-8');
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
  const promptsDir = join(dirname(fileURLToPath(import.meta.url)), 'prompts');
  const files = readdirSync(promptsDir).filter(f => f.startsWith(runType));
  return files;
}

export function getPromptMetadata(runType: string): PromptMetadata {
  const template = loadPrompt(runType);
  return template.metadata;
}
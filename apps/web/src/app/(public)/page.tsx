import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="px-6 py-12 max-w-5xl mx-auto">
      {/* Hero */}
      <section className="mb-16">
        <div className="inline-flex items-center gap-2 bg-[--color-pulo-surface] border border-[--color-pulo-border] rounded-full px-3 py-1 text-xs text-[--color-pulo-muted] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[--color-pulo-success] animate-pulse" />
          Systems operational
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Your Far AI <span className="text-[--color-pulo-accent]">Intelligence</span> Agent
        </h1>
        <p className="text-[--color-pulo-muted] text-lg max-w-xl leading-relaxed">
          PULO responds to your mentions, checks facts, detects trends, and delivers alerts — without compromising your privacy or security.
        </p>
        <div className="flex gap-3 mt-8">
          <Link href="/dashboard" className="px-5 py-2.5 bg-[--color-pulo-accent] hover:bg-[--color-pulo-accent-hover] text-white rounded-lg font-medium text-sm transition-colors inline-flex items-center gap-2">
            Open Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/docs" className="px-5 py-2.5 bg-[--color-pulo-surface] border border-[--color-pulo-border] hover:border-[--color-pulo-muted] text-[--color-pulo-text] rounded-lg font-medium text-sm transition-colors">
            Read Docs
          </Link>
        </div>
      </section>

      {/* Capabilities */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
        {[
          {
            title: 'Truth Analysis',
            desc: 'Claims scored 0–1 with evidence. Paste "!pulo is [claim]" in any cast.',
            icon: '◎',
            tag: 'AUTO ANALYSIS',
          },
          {
            title: 'Trend Radar',
            desc: 'Detects airdrops, grants, rewards, and programs before they go viral.',
            icon: '◉',
            tag: 'ALERTS',
          },
          {
            title: 'Reply Assistant',
            desc: 'Context-aware reply suggestions in real time. Just @pulo your thought.',
            icon: '○',
            tag: 'ASSISTANT',
          },
        ].map(({ title, desc, icon, tag }) => (
          <div key={title} className="bg-[--color-pulo-surface] border border-[--color-pulo-border] rounded-xl p-5 hover:border-[--color-pulo-accent] transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl text-[--color-pulo-accent]">{icon}</span>
              <span className="text-[10px] text-[--color-pulo-muted] bg-[--color-pulo-bg] px-2 py-0.5 rounded border border-[--color-pulo-border]">
                {tag}
              </span>
            </div>
            <h3 className="font-semibold mb-1">{title}</h3>
            <p className="text-sm text-[--color-pulo-muted] leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>

      {/* Stats - MOCK DATA */}
      <section className="bg-[--color-pulo-surface] border border-[--color-pulo-border] rounded-xl p-6 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Casts Processed', value: '0' },
            { label: 'Truth Checks', value: '0' },
            { label: 'Trends Detected', value: '0' },
            { label: 'Active Users', value: '0' },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-[--color-pulo-accent]">{value}</div>
              <div className="text-xs text-[--color-pulo-muted] mt-1">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-[--color-pulo-muted] mt-4 text-center">[MOCK DATA - Awaiting real API]</p>
      </section>

      {/* Getting started */}
      <section className="border border-[--color-pulo-border] rounded-xl p-6">
        <h2 className="font-semibold mb-4">Quick Start</h2>
        <div className="space-y-3">
          {[
            { n: '1', cmd: '@pulo is Ethereum merging to proof-of-stake?' },
            { n: '2', cmd: '@pulo what trends are hot right now?' },
            { n: '3', cmd: '@pulo help me write a reply to this cast' },
          ].map(({ n, cmd }) => (
            <div key={n} className="flex items-center gap-3">
              <span className="text-xs text-[--color-pulo-muted] w-5">{n}</span>
              <code className="flex-1 bg-[--color-pulo-bg] border border-[--color-pulo-border] rounded px-3 py-2 text-sm font-mono text-[--color-pulo-text]">
                {cmd}
              </code>
              <button className="text-xs text-[--color-pulo-accent] hover:underline">copy</button>
            </div>
          ))}
        </div>
        <p className="text-xs text-[--color-pulo-muted] mt-4">
          PULO responds within 5 seconds. Free tier: 50 casts/day. Upgrade for more.
        </p>
      </section>
    </div>
  );
}

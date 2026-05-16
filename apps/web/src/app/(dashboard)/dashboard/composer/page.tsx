'use client';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/input';
import {
  rewriteCast,
  rewriteMultiple,
  buildThread,
  rateCast,
  scoreHook,
  recommendChannels,
  translateText,
  checkPublishSafety,
  createDraft,
  getDrafts,
  updateDraft,
  publishDraft,
  ignoreDraft,
  deleteDraft,
  type Draft,
  type CastStyle,
  type RewriteVariant,
  type Thread,
  type CastRating,
  type HookSuggestion,
  type ChannelRecommendation,
  type PublishCheck,
} from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import { Send, Save, Trash2, RefreshCw, Sparkles, MessageSquare, Languages, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

const STYLE_OPTIONS: { value: CastStyle; label: string }[] = [
  { value: 'sharp', label: 'Make it sharper' },
  { value: 'founder', label: 'Founder style' },
  { value: 'technical', label: 'Technical' },
  { value: 'funny', label: 'Funnier' },
  { value: 'concise', label: 'Shorter' },
  { value: 'thread', label: 'Thread opener' },
];

export default function ComposerPage() {
  const [text, setText] = useState('');
  const [variants, setVariants] = useState<RewriteVariant[]>([]);
  const [thread, setThread] = useState<Thread | null>(null);
  const [rating, setRating] = useState<CastRating | null>(null);
  const [hookSuggestions, setHookSuggestions] = useState<HookSuggestion[]>([]);
  const [channels, setChannels] = useState<ChannelRecommendation[]>([]);
  const [safety, setSafety] = useState<PublishCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'rewrite' | 'thread'>('write');
  const [translating, setTranslating] = useState<'en' | 'tr' | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<RewriteVariant | null>(null);

  // Load drafts
  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      const { drafts } = await getDrafts();
      setDrafts(drafts);
    } catch {
      // Ignore errors in demo mode
    }
  };

  const handleRewrite = async (style: CastStyle) => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { variant } = await rewriteCast(text, style);
      setVariants([variant]);
      setSelectedVariant(variant);
      setActiveTab('rewrite');
    } catch (e) {
      console.error('Rewrite failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRewriteAll = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { variants } = await rewriteMultiple(text, ['sharp', 'founder', 'concise']);
      setVariants(variants);
      setSelectedVariant(variants[0]!);
      setActiveTab('rewrite');
    } catch (e) {
      console.error('Rewrite failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handleThread = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const threadData = await buildThread(text, 5);
      setThread(threadData);
      setActiveTab('thread');
    } catch (e) {
      console.error('Thread build failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const ratingData = await rateCast(text);
      setRating(ratingData);
    } catch (e) {
      console.error('Rating failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handleHookScore = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { score, suggestions } = await scoreHook(text);
      setRating(prev => prev ? {
        ...prev,
        hookScore: score.score,
        riskFlags: score.factors,
      } : null);
      setHookSuggestions(suggestions);
    } catch (e) {
      console.error('Hook scoring failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handleChannelRecommend = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const { recommendations } = await recommendChannels(text);
      setChannels(recommendations);
    } catch (e) {
      console.error('Channel recommendation failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async (targetLang: 'en' | 'tr') => {
    if (!text.trim()) return;
    setTranslating(targetLang);
    try {
      const { translated } = await translateText(text, targetLang);
      setText(translated);
    } catch (e) {
      console.error('Translation failed', e);
    } finally {
      setTranslating(null);
    }
  };

  const handleSafetyCheck = async () => {
    if (!text.trim()) return;
    try {
      const check = await checkPublishSafety(text);
      setSafety(check);
    } catch (e) {
      console.error('Safety check failed', e);
    }
  };

  const handleSaveDraft = async () => {
    if (!text.trim()) return;
    try {
      const draft = await createDraft(text);
      setDrafts([draft, ...drafts]);
      setText('');
    } catch (e) {
      console.error('Save draft failed', e);
    }
  };

  const handlePublish = async (draftText?: string) => {
    const textToPublish = draftText || text;
    if (!textToPublish.trim()) return;

    try {
      const check = await checkPublishSafety(textToPublish);
      if (!check.safe) {
        setSafety(check);
        return;
      }

      // Create and publish in one go
      const draft = await createDraft(textToPublish);
      await publishDraft(draft.id);
      await loadDrafts();
      setText('');
      setSafety(null);
    } catch (e) {
      console.error('Publish failed', e);
    }
  };

  const handleIgnore = async (id: string) => {
    try {
      await ignoreDraft(id);
      await loadDrafts();
    } catch (e) {
      console.error('Ignore failed', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDraft(id);
      await loadDrafts();
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const handleApplyVariant = (variant: RewriteVariant) => {
    setText(variant.text);
    setSelectedVariant(variant);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Composer</h1>
          <p className="text-[--color-pulo-muted] mt-1">Craft and publish your casts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleSaveDraft} disabled={!text.trim()}>
            <Save className="w-4 h-4" />
            Save Draft
          </Button>
          <Button variant="primary" onClick={() => handlePublish()} disabled={!text.trim()}>
            <Send className="w-4 h-4" />
            Publish
          </Button>
        </div>
      </div>

      {/* Safety Alert */}
      {safety && !safety.safe && (
        <Card className="border-[--color-pulo-danger]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[--color-pulo-danger] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-[--color-pulo-danger]">Cannot Publish</p>
                <ul className="text-sm text-[--color-pulo-muted] mt-1 space-y-1">
                  {safety.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {safety && safety.warnings.length > 0 && safety.safe && (
        <Card className="border-[--color-pulo-warning]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[--color-pulo-warning] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-[--color-pulo-text]">Warnings</p>
                <ul className="text-sm text-[--color-pulo-muted] mt-1 space-y-1">
                  {safety.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Mode Tabs */}
          <div className="flex items-center gap-2 border-b border-[--color-pulo-border] pb-2">
            {(['write', 'rewrite', 'thread'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize ${
                  activeTab === tab
                    ? 'bg-[--color-pulo-accent] text-white'
                    : 'text-[--color-pulo-muted] hover:text-[--color-pulo-text]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <Card>
            <CardContent className="p-6">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-48 bg-transparent text-[--color-pulo-text] placeholder:text-[--color-pulo-muted] resize-none focus:outline-none text-lg"
                placeholder="What's on your mind?"
              />
              <div className="flex items-center justify-between pt-4 border-t border-[--color-pulo-border]">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTranslate(text.includes('[TR]') ? 'en' : 'tr')}
                    disabled={!text.trim() || translating !== null}
                  >
                    <Languages className="w-4 h-4" />
                    {translating ? 'Translating...' : text.includes('[TR]') ? 'To English' : 'To Turkish'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSafetyCheck}
                    disabled={!text.trim()}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Check Safety
                  </Button>
                </div>
                <span className="text-xs text-[--color-pulo-muted]">
                  {text.length}/320
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Style Actions */}
          {activeTab === 'write' && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-[--color-pulo-muted]">Enhance:</span>
                  {STYLE_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRewrite(opt.value)}
                      disabled={!text.trim() || loading}
                    >
                      <Sparkles className="w-3 h-3" />
                      {opt.label}
                    </Button>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRewriteAll}
                    disabled={!text.trim() || loading}
                  >
                    <Sparkles className="w-3 h-3" />
                    All Variants
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleThread}
                    disabled={!text.trim() || loading}
                  >
                    <MessageSquare className="w-3 h-3" />
                    Build Thread
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRate}
                    disabled={!text.trim() || loading}
                  >
                    <RefreshCw className="w-3 h-3" />
                    Rate Cast
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHookScore}
                    disabled={!text.trim() || loading}
                  >
                    <Sparkles className="w-3 h-3" />
                    Score Hook
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleChannelRecommend}
                    disabled={!text.trim() || loading}
                  >
                    <MessageSquare className="w-3 h-3" />
                    Recommend Channel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rewrite Variants */}
          {activeTab === 'rewrite' && variants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Rewrite Variants</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2 p-4">
                  {variants.map((variant, i) => (
                    <div
                      key={i}
                      onClick={() => handleApplyVariant(variant)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedVariant === variant
                          ? 'border-[--color-pulo-accent] bg-[--color-pulo-accent]/10'
                          : 'border-[--color-pulo-border] hover:border-[--color-pulo-accent]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="default" size="sm">{variant.style}</Badge>
                        <span className="text-xs text-[--color-pulo-muted]">Score: {variant.score}/10</span>
                      </div>
                      <p className="text-sm text-[--color-pulo-text]">{variant.text}</p>
                      <p className="text-xs text-[--color-pulo-muted] mt-2">{variant.reasoning}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Thread View */}
          {activeTab === 'thread' && thread && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Thread Preview ({thread.posts.length} posts)</CardTitle>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setText(thread.posts.map(p => p.text).join('\n\n'))}
                  >
                    Copy Thread
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-3 p-4">
                  {thread.posts.map((post, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg border ${
                        post.isHook
                          ? 'border-[--color-pulo-accent] bg-[--color-pulo-accent]/5'
                          : 'border-[--color-pulo-border]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={post.isHook ? 'accent' : 'default'} size="sm">
                          {post.isHook ? 'Hook' : `Post ${post.index + 1}`}
                        </Badge>
                        <span className="text-xs text-[--color-pulo-muted]">{post.text.length} chars</span>
                      </div>
                      <p className="text-sm text-[--color-pulo-text]">{post.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rating */}
          {rating && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cast Rating</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[--color-pulo-text]">{rating.score}/10</p>
                    <p className="text-xs text-[--color-pulo-muted]">Overall</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[--color-pulo-text]">{rating.hookScore}/10</p>
                    <p className="text-xs text-[--color-pulo-muted]">Hook</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[--color-pulo-text]">{rating.clarityScore}/10</p>
                    <p className="text-xs text-[--color-pulo-muted]">Clarity</p>
                  </div>
                </div>
                <p className="text-sm text-[--color-pulo-text] mb-3">{rating.critique}</p>
                {rating.suggestions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[--color-pulo-muted]">Suggestions:</p>
                    {rating.suggestions.map((s, i) => (
                      <p key={i} className="text-xs text-[--color-pulo-muted]">• {s}</p>
                    ))}
                  </div>
                )}
                {rating.riskFlags.length > 0 && (
                  <div className="mt-3 p-2 bg-[--color-pulo-danger]/10 rounded">
                    <p className="text-xs text-[--color-pulo-danger]">
                      Risk flags: {rating.riskFlags.join(', ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Hook Suggestions */}
          {hookSuggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Hook Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2 p-4">
                  {hookSuggestions.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => setText(s.hook)}
                      className="p-3 rounded-lg border border-[--color-pulo-border] hover:border-[--color-pulo-accent]/50 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="default" size="sm">{s.type}</Badge>
                        <span className="text-xs text-[--color-pulo-muted]">Score: {s.score}/10</span>
                      </div>
                      <p className="text-sm text-[--color-pulo-text]">{s.hook}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Channel Recommendations */}
          {channels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recommended Channels</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2 p-4">
                  {channels.map((ch, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg border border-[--color-pulo-border]"
                    >
                      <div>
                        <p className="text-sm font-medium text-[--color-pulo-text]">/#{ch.channel}</p>
                        <p className="text-xs text-[--color-pulo-muted]">{ch.reason}</p>
                      </div>
                      {ch.followerCount && (
                        <span className="text-xs text-[--color-pulo-muted]">
                          {(ch.followerCount / 1000).toFixed(0)}K followers
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Drafts Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Draft Queue</CardTitle>
                <Badge variant="default" size="sm">{drafts.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {drafts.length === 0 ? (
                <div className="p-6 text-center text-sm text-[--color-pulo-muted]">
                  No drafts yet
                </div>
              ) : (
                <div className="divide-y divide-[--color-pulo-border] max-h-[600px] overflow-y-auto">
                  {drafts.map((draft) => (
                    <div key={draft.id} className="p-4 hover:bg-[--color-pulo-surface] transition-colors">
                      <p className="text-sm text-[--color-pulo-text] line-clamp-2 mb-2">{draft.text}</p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            draft.status === 'published' ? 'success' :
                            draft.status === 'ignored' ? 'default' : 'warning'
                          }
                          size="sm"
                        >
                          {draft.status}
                        </Badge>
                        <span className="text-xs text-[--color-pulo-muted]">
                          {formatRelativeTime(draft.updatedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {draft.status === 'draft' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setText(draft.text)}
                              className="text-xs h-7 px-2"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePublish(draft.text)}
                              className="text-xs h-7 px-2"
                            >
                              <Send className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleIgnore(draft.id)}
                              className="text-xs h-7 px-2"
                            >
                              <Clock className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(draft.id)}
                          className="text-xs h-7 px-2 text-[--color-pulo-danger]"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin w-8 h-8 border-2 border-[--color-pulo-accent] border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}
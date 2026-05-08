'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, ExternalLink, Smartphone, MessageCircle } from 'lucide-react';

export default function MiniappPage() {
  return (
    <div className="px-6 py-12 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-[--color-pulo-accent] flex items-center justify-center mx-auto mb-6">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-[--color-pulo-text] mb-4">PULO Miniapp</h1>
        <p className="text-[--color-pulo-muted] max-w-xl mx-auto">
          Access PULO directly within Warpcast and other clients. No installation required.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-[--color-pulo-accent-muted]">
                <Smartphone className="w-6 h-6 text-[--color-pulo-accent]" />
              </div>
              <div>
                <h3 className="font-semibold text-[--color-pulo-text] mb-1">Mobile First</h3>
                <p className="text-sm text-[--color-pulo-muted]">
                  Optimized for Warpcast mobile experience. Access truth checks and trends on the go.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-[--color-pulo-accent-muted]">
                <MessageCircle className="w-6 h-6 text-[--color-pulo-accent]" />
              </div>
              <div>
                <h3 className="font-semibold text-[--color-pulo-text] mb-1">In-Context Actions</h3>
                <p className="text-sm text-[--color-pulo-muted]">
                  Reply, analyze, and track trends without leaving your conversation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="text-center">
        <CardContent className="p-8">
          <h3 className="font-semibold text-[--color-pulo-text] mb-2">Coming Soon</h3>
          <p className="text-sm text-[--color-pulo-muted] mb-6">
            The miniapp is currently in development. Join the waitlist to be notified when it launches.
          </p>
          <Button disabled>
            <ExternalLink className="w-4 h-4" />
            Join Waitlist
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

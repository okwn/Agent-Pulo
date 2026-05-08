'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/state';
import { Button } from '@/components/ui/button';
import { mockInboxMessages } from '@/lib/mock-data';
import { formatRelativeTime } from '@/lib/utils';
import { MessageCircle, CheckCircle, Mail, Bell } from 'lucide-react';

export default function InboxPage() {
  const messages = mockInboxMessages;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Inbox</h1>
          <p className="text-[--color-pulo-muted] mt-1">Your mentions and direct messages</p>
        </div>
      </div>

      {messages.length === 0 ? (
        <EmptyState
          icon={<Mail className="w-8 h-8" />}
          title="No messages yet"
          description="When someone mentions you or sends a direct message, it will appear here."
          action={{ label: 'Refresh', onClick: () => {} }}
        />
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => {
            const Icon = msg.type === 'mention' ? MessageCircle : Bell;
            return (
              <Card key={msg.id} hover className="cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-[--color-pulo-accent-muted]">
                      <Icon className="w-5 h-5 text-[--color-pulo-accent]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-[--color-pulo-text]">@{msg.from}</span>
                        {!msg.read && (
                          <span className="w-2 h-2 rounded-full bg-[--color-pulo-accent]" />
                        )}
                        <span className="text-xs text-[--color-pulo-muted] ml-auto">
                          {formatRelativeTime(msg.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-[--color-pulo-muted]">{msg.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

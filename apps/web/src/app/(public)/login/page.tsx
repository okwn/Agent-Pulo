'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { demoLogin } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [fid, setFid] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDemoLogin = async () => {
    setError('');
    const fidNum = parseInt(fid);
    if (isNaN(fidNum) || fidNum <= 0) {
      setError('Please enter a valid FID (positive number)');
      return;
    }
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    try {
      await demoLogin(fidNum, username.trim());
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-xl bg-[--color-pulo-accent] flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-xl">Welcome to PULO</CardTitle>
          <p className="text-sm text-[--color-pulo-muted] mt-1">Sign in to your account</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-[--color-pulo-danger-muted] border border-[--color-pulo-danger]/20 text-sm text-[--color-pulo-danger]">
              {error}
            </div>
          )}

          {/* Demo Login */}
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-[--color-pulo-accent-muted] border border-[--color-pulo-accent]/20">
              <p className="text-xs text-[--color-pulo-accent] font-medium mb-2">[DEMO MODE]</p>
              <p className="text-xs text-[--color-pulo-muted]">Enter your FID and username to sign in.</p>
            </div>
            <div>
              <label className="text-sm text-[--color-pulo-muted] block mb-1">FID (Farcaster ID)</label>
              <Input
                type="number"
                placeholder="12345"
                value={fid}
                onChange={(e) => setFid(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-[--color-pulo-muted] block mb-1">Username</label>
              <Input
                placeholder="yourname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <Button onClick={handleDemoLogin} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Demo Login
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[--color-pulo-border]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-[--color-pulo-surface] text-[--color-pulo-muted]">Future options</span>
            </div>
          </div>

          {/* Placeholder buttons for future SIWF/Neynar */}
          <Button variant="secondary" className="w-full" disabled>
            <Zap className="w-4 h-4" />
            Sign in with Warpcast (Soon)
          </Button>

          <p className="text-center text-xs text-[--color-pulo-muted]">
            PULO uses Sign In with Farcaster for secure authentication.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

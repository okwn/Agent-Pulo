'use client';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UsageLimitMeter } from '@/components/ui/meters';
import { getBillingPlan, getBillingUsage, type PlanTier } from '@/lib/api';
import { Check, Zap, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const PLAN_FEATURES: Record<PlanTier, string[]> = {
  free: ['50 casts/day', '5 truth checks/day', 'Basic radar alerts', 'Community support'],
  pro: ['200 casts/day', '50 truth checks/day', 'Full radar', 'Priority support', 'Voice composer'],
  creator: ['500 casts/day', '200 truth checks/day', 'Advanced radar', 'Direct cast alerts', 'Auto-draft'],
  community: ['250 casts/day', '100 truth checks/day', 'Full radar', 'Channel monitoring', 'Community digest'],
  admin: ['Unlimited casts', 'Unlimited truth checks', 'All features', 'User management', 'System access'],
};

const PLAN_PRICES: Record<PlanTier, number> = {
  free: 0,
  pro: 9,
  creator: 29,
  community: 19,
  admin: 0,
};

export default function BillingPage() {
  const [plan, setPlan] = useState<{
    tier: PlanTier;
    name: string;
    status: string;
    entitlements: Record<string, boolean | number>;
  } | null>(null);
  const [usage, setUsage] = useState<{
    castsUsed: number;
    castsLimit: number;
    truthChecksUsed: number;
    truthChecksLimit: number;
    trendsTracked: number;
    trendsLimit: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [planData, usageData] = await Promise.all([
          getBillingPlan(),
          getBillingUsage(),
        ]);
        setPlan({
          tier: planData.plan.tier,
          name: planData.plan.name,
          status: planData.plan.status,
          entitlements: planData.entitlements,
        });
        setUsage(usageData);
      } catch {
        // Use defaults on error
        setPlan({
          tier: 'free',
          name: 'Free',
          status: 'active',
          entitlements: {},
        });
        setUsage({
          castsUsed: 0,
          castsLimit: 50,
          truthChecksUsed: 0,
          truthChecksLimit: 5,
          trendsTracked: 0,
          trendsLimit: 10,
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[--color-pulo-text]">Billing</h1>
          <p className="text-[--color-pulo-muted] mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  const plans: Array<{ id: PlanTier; name: string; price: number; features: string[] }> = [
    { id: 'free', name: 'Free', price: 0, features: PLAN_FEATURES.free },
    { id: 'pro', name: 'Pro', price: 9, features: PLAN_FEATURES.pro },
    { id: 'creator', name: 'Creator', price: 29, features: PLAN_FEATURES.creator },
    { id: 'community', name: 'Community', price: 19, features: PLAN_FEATURES.community },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[--color-pulo-text]">Billing</h1>
        <p className="text-[--color-pulo-muted] mt-1">Manage your subscription and usage</p>
      </div>

      {/* Current Plan */}
      {plan && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--color-pulo-muted]">Current Plan</p>
                <p className="text-2xl font-bold text-[--color-pulo-text]">{plan.name}</p>
                <Badge variant={plan.status === 'active' ? 'success' : 'warning'} className="mt-1">
                  {plan.status}
                </Badge>
              </div>
              <Link href="/pricing">
                <Button variant="secondary" size="sm">
                  Change Plan
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Usage */}
      {usage && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <UsageLimitMeter
                used={usage.castsUsed}
                limit={usage.castsLimit}
                label="Daily Casts"
                unit="casts"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <UsageLimitMeter
                used={usage.truthChecksUsed}
                limit={usage.truthChecksLimit}
                label="Truth Checks"
                unit="checks"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <UsageLimitMeter
                used={usage.trendsTracked}
                limit={usage.trendsLimit}
                label="Trends Tracked"
                unit="trends"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upgrade Prompt */}
      {plan && plan.tier === 'free' && (
        <Card className="border-[--color-pulo-accent]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[--color-pulo-accent]" />
              <div className="flex-1">
                <p className="font-medium text-[--color-pulo-text]">Upgrade to Pro</p>
                <p className="text-sm text-[--color-pulo-muted]">Get more casts, truth checks, and access to voice composer</p>
              </div>
              <Link href="/pricing">
                <Button variant="primary" size="sm">View Plans</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold text-[--color-pulo-text] mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => (
            <Card
              key={p.id}
              className={p.id === 'pro' ? 'border-[--color-pulo-accent] relative' : ''}
            >
              {p.id === 'pro' && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <Badge variant="accent">Popular</Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[--color-pulo-accent]" />
                  <CardTitle>{p.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-[--color-pulo-text]">
                    ${p.price}
                  </span>
                  {p.price > 0 && (
                    <span className="text-[--color-pulo-muted]">/month</span>
                  )}
                  {p.price === 0 && (
                    <span className="text-[--color-pulo-muted]">/forever</span>
                  )}
                </div>
                <ul className="space-y-2">
                  {p.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[--color-pulo-muted]">
                      <Check className="w-4 h-4 text-[--color-pulo-success]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  variant={p.id === plan?.tier ? 'ghost' : 'primary'}
                  className="w-full"
                  disabled={p.id === plan?.tier}
                >
                  {p.id === plan?.tier ? 'Current Plan' : 'Upgrade'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

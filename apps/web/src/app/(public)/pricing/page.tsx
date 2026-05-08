'use client';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap } from 'lucide-react';
import Link from 'next/link';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      '5 truth checks/day',
      '10 radar alerts',
      'Basic trending',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9,
    popular: true,
    features: [
      '50 truth checks/day',
      '100 radar alerts',
      'Voice composer',
      'Custom alerts',
      'Priority support',
    ],
  },
  {
    id: 'creator',
    name: 'Creator',
    price: 29,
    features: [
      '200 truth checks/day',
      '500 radar alerts',
      'Advanced radar',
      'Direct cast alerts',
      'Auto-draft enabled',
      'Weekly digest',
    ],
  },
  {
    id: 'community',
    name: 'Community',
    price: 19,
    features: [
      '100 truth checks/day',
      '250 radar alerts',
      'Channel monitoring',
      'Community digest',
      'Leaderboard access',
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="px-6 py-12 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-[--color-pulo-text] mb-4">Simple, Transparent Pricing</h1>
        <p className="text-[--color-pulo-muted] max-w-xl mx-auto">
          Choose the plan that fits your needs. All plans include core functionality.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={plan.popular ? 'border-[--color-pulo-accent] relative' : ''}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="accent">Most Popular</Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[--color-pulo-accent]" />
                <CardTitle>{plan.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold text-[--color-pulo-text]">
                  ${plan.price}
                </span>
                {plan.price > 0 && (
                  <span className="text-[--color-pulo-muted]">/month</span>
                )}
                {plan.price === 0 && (
                  <span className="text-[--color-pulo-muted]">forever</span>
                )}
              </div>
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[--color-pulo-muted]">
                    <Check className="w-4 h-4 text-[--color-pulo-success] mt-0.5 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/dashboard/billing" className="w-full">
                <Button
                  variant={plan.popular ? 'primary' : 'secondary'}
                  className="w-full"
                >
                  {plan.price === 0 ? 'Get Started' : 'Subscribe'}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-[--color-pulo-muted]">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </div>
  );
}

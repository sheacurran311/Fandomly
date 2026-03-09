/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Crown,
  Loader2,
  Check,
  ArrowUpRight,
  Zap,
  Users,
  CheckSquare,
  Megaphone,
  Link2,
  Layers,
  Mail,
  CreditCard,
  FileText,
  ExternalLink,
} from 'lucide-react';
import {
  SUBSCRIPTION_TIERS,
  TIER_ORDER,
  isUnlimited,
  type SubscriptionTier,
} from '@shared/subscription-config';

interface SubscriptionDetails {
  tier: SubscriptionTier;
  tierName: string;
  limits: Record<string, number | boolean>;
  usage: {
    tasks: number;
    campaigns: number;
    programs: number;
    socialConnections: number;
    members: number;
  };
  billingInfo: {
    stripeCustomerId?: string;
    subscriptionId?: string;
    nextBillingDate?: string;
    cancelAtPeriodEnd?: boolean;
    cancelAt?: string;
    lastPaymentDate?: string;
    lastPaymentAmount?: string;
  } | null;
}

interface Invoice {
  id: string;
  amount_paid: number;
  currency: string;
  status: string;
  created: number;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
}

function UsageMeter({
  label,
  icon: Icon,
  current,
  max,
  color,
}: {
  label: string;
  icon: typeof Zap;
  current: number;
  max: number;
  color: string;
}) {
  const unlimited = isUnlimited(max);
  const pct = unlimited ? 0 : max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const isNearLimit = !unlimited && pct >= 80;
  const isAtLimit = !unlimited && pct >= 100;

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium text-white">{label}</span>
        </div>
        <span className="text-sm tabular-nums text-gray-400">
          {current} / {unlimited ? 'Unlimited' : max}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-brand-primary'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {unlimited && (
        <div className="h-2 rounded-full bg-brand-primary/20 overflow-hidden">
          <div className="h-full rounded-full bg-brand-primary/40 w-full" />
        </div>
      )}
    </div>
  );
}

export default function CreatorSubscriptions() {
  const { user: _user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'downgrade' | 'cancel';
    tier?: SubscriptionTier;
  }>({ open: false, type: 'cancel' });

  const { data, isLoading } = useQuery<SubscriptionDetails>({
    queryKey: ['/api/subscription-details'],
    queryFn: async () => {
      const response = await fetchApi('/api/subscription-details');
      return response as SubscriptionDetails;
    },
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ['/api/stripe/invoices'],
    queryFn: async () => {
      const res = await fetchApi<{ invoices: Invoice[] }>('/api/stripe/invoices');
      return res.invoices || [];
    },
    enabled: !!data?.billingInfo?.stripeCustomerId,
  });

  // Upgrade: redirect to Stripe Checkout
  const upgradeMutation = useMutation({
    mutationFn: async (tier: SubscriptionTier) => {
      const res = await apiRequest('POST', '/api/stripe/create-checkout-session', { tier });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      toast({
        title: 'Upgrade failed',
        description: err.message || 'Could not create checkout session',
        variant: 'destructive',
      });
    },
  });

  // Downgrade: change subscription via backend
  const downgradeMutation = useMutation({
    mutationFn: async (tier: SubscriptionTier) => {
      const res = await apiRequest('POST', '/api/stripe/change-subscription', { newTier: tier });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Plan change initiated',
        description:
          'Your plan will be updated shortly. Changes are processed via our payment provider.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-details'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Plan change failed',
        description: err.message || 'Could not change subscription',
        variant: 'destructive',
      });
    },
  });

  // Cancel subscription
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/cancel-subscription');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Subscription cancelled',
        description:
          'Your subscription will remain active until the end of the current billing period.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-details'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Cancellation failed',
        description: err.message || 'Could not cancel subscription',
        variant: 'destructive',
      });
    },
  });

  // Manage payment (Stripe Billing Portal)
  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/create-portal-session');
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      toast({
        title: 'Could not open billing portal',
        description: err.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const currentTier = data?.tier || 'free';
  const tierIndex = TIER_ORDER.indexOf(currentTier);
  const isCancelPending = data?.billingInfo?.cancelAtPeriodEnd;

  const handleTierAction = (tierId: SubscriptionTier, isUpgrade: boolean) => {
    if (isUpgrade) {
      // For upgrade from free or new subscription, go to Stripe Checkout
      if (currentTier === 'free' || !data?.billingInfo?.subscriptionId) {
        upgradeMutation.mutate(tierId);
      } else {
        // For upgrade from one paid tier to another, use change-subscription
        downgradeMutation.mutate(tierId);
      }
    } else {
      // Downgrade requires confirmation
      setConfirmDialog({ open: true, type: 'downgrade', tier: tierId });
    }
  };

  const handleConfirm = () => {
    if (confirmDialog.type === 'downgrade' && confirmDialog.tier) {
      if (confirmDialog.tier === 'free') {
        cancelMutation.mutate();
      } else {
        downgradeMutation.mutate(confirmDialog.tier);
      }
    } else if (confirmDialog.type === 'cancel') {
      cancelMutation.mutate();
    }
    setConfirmDialog({ open: false, type: 'cancel' });
  };

  const isActionLoading =
    upgradeMutation.isPending ||
    downgradeMutation.isPending ||
    cancelMutation.isPending ||
    portalMutation.isPending;

  return (
    <DashboardLayout userType="creator">
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Subscription</h1>
          <p className="text-gray-400 mt-1">
            Manage your plan and track usage across your account.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
          </div>
        ) : (
          <>
            {/* Current Plan Card */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-brand-primary/15">
                      <Crown className="h-6 w-6 text-brand-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-white text-xl">
                        {data?.tierName || 'Free'}
                      </CardTitle>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {SUBSCRIPTION_TIERS[currentTier]?.priceLabel || '$0/month'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {isCancelPending && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-0">
                        Cancels{' '}
                        {data?.billingInfo?.cancelAt
                          ? new Date(data.billingInfo.cancelAt).toLocaleDateString()
                          : 'at period end'}
                      </Badge>
                    )}
                    {data?.billingInfo?.nextBillingDate && !isCancelPending && (
                      <p className="text-xs text-gray-500">
                        Next billing:{' '}
                        {new Date(data.billingInfo.nextBillingDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              {/* Billing Actions */}
              {data?.billingInfo?.stripeCustomerId && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-gray-300 hover:bg-white/10"
                      onClick={() => portalMutation.mutate()}
                      disabled={portalMutation.isPending}
                    >
                      {portalMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Manage Payment
                    </Button>
                    {currentTier !== 'free' && !isCancelPending && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => setConfirmDialog({ open: true, type: 'cancel' })}
                        disabled={cancelMutation.isPending}
                      >
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Usage Meters */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Current Usage</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <UsageMeter
                  label="Tasks"
                  icon={CheckSquare}
                  current={data?.usage?.tasks ?? 0}
                  max={Number(data?.limits?.maxTasks ?? 5)}
                  color="bg-indigo-500/15 text-indigo-400"
                />
                <UsageMeter
                  label="Campaigns"
                  icon={Megaphone}
                  current={data?.usage?.campaigns ?? 0}
                  max={Number(data?.limits?.maxCampaigns ?? 0)}
                  color="bg-orange-500/15 text-orange-400"
                />
                <UsageMeter
                  label="Social Connections"
                  icon={Link2}
                  current={data?.usage?.socialConnections ?? 0}
                  max={Number(data?.limits?.maxSocialConnections ?? 3)}
                  color="bg-pink-500/15 text-pink-400"
                />
                <UsageMeter
                  label="Programs"
                  icon={Layers}
                  current={data?.usage?.programs ?? 0}
                  max={Number(data?.limits?.maxPrograms ?? 1)}
                  color="bg-brand-primary/15 text-brand-primary"
                />
                <UsageMeter
                  label="Members"
                  icon={Users}
                  current={data?.usage?.members ?? 0}
                  max={Number(data?.limits?.maxMembers ?? 100)}
                  color="bg-green-500/15 text-green-400"
                />
              </div>
            </div>

            {/* Tier Cards */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Available Plans</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TIER_ORDER.map((tierId, idx) => {
                  const tier = SUBSCRIPTION_TIERS[tierId];
                  const isCurrent = tierId === currentTier;
                  const isUpgrade = idx > tierIndex;
                  const isDowngrade = idx < tierIndex;
                  const isEnterprise = tierId === 'enterprise';

                  return (
                    <Card
                      key={tierId}
                      className={`relative bg-white/5 backdrop-blur-lg border-white/10 ${
                        isCurrent ? 'ring-2 ring-brand-primary/50' : ''
                      } ${tier.recommended ? 'border-brand-primary/30' : ''}`}
                    >
                      {tier.recommended && (
                        <div className="absolute -top-2.5 right-4">
                          <Badge className="bg-brand-primary/90 text-white text-xs px-2.5 py-0.5 border-0">
                            <Zap className="h-3 w-3 mr-1" />
                            Most Popular
                          </Badge>
                        </div>
                      )}

                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-white font-semibold text-lg">{tier.name}</h3>
                            <p className="text-gray-400 text-sm mt-0.5">{tier.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-white">
                              {tier.price === null
                                ? 'Custom'
                                : tier.price === 0
                                  ? 'Free'
                                  : `$${tier.price}`}
                            </p>
                            {tier.price !== null && tier.price > 0 && (
                              <p className="text-xs text-gray-500">per month</p>
                            )}
                          </div>
                        </div>

                        <ul className="space-y-2 mb-5">
                          {tier.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm">
                              <Check className="h-3.5 w-3.5 text-brand-primary shrink-0" />
                              <span className="text-gray-300">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {isCurrent ? (
                          <Button
                            disabled
                            className="w-full bg-white/10 text-gray-400 cursor-default"
                          >
                            Current Plan
                          </Button>
                        ) : isEnterprise ? (
                          <Button
                            variant="outline"
                            className="w-full border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
                            onClick={() =>
                              (window.location.href =
                                'mailto:sales@fandomly.ai?subject=Enterprise%20Plan%20Inquiry')
                            }
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Contact Sales
                          </Button>
                        ) : isUpgrade ? (
                          <Button
                            className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white"
                            onClick={() => handleTierAction(tierId, true)}
                            disabled={isActionLoading}
                          >
                            {upgradeMutation.isPending || downgradeMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 mr-2" />
                            )}
                            Upgrade
                          </Button>
                        ) : isDowngrade ? (
                          <Button
                            variant="outline"
                            className="w-full border-white/20 text-gray-400 hover:text-white hover:border-white/40"
                            onClick={() => handleTierAction(tierId, false)}
                            disabled={isActionLoading}
                          >
                            Downgrade
                          </Button>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Invoice History */}
            {invoices && invoices.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Invoice History</h2>
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardContent className="p-0">
                    <div className="divide-y divide-white/10">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between px-5 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm text-white">
                                {new Date(invoice.created * 1000).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">{invoice.status}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-white tabular-nums">
                              ${(invoice.amount_paid / 100).toFixed(2)}{' '}
                              {invoice.currency.toUpperCase()}
                            </span>
                            {invoice.hosted_invoice_url && (
                              <a
                                href={invoice.hosted_invoice_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-white"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, type: 'cancel' })}
      >
        <AlertDialogContent className="bg-gray-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {confirmDialog.type === 'cancel'
                ? 'Cancel Subscription?'
                : `Downgrade to ${confirmDialog.tier ? SUBSCRIPTION_TIERS[confirmDialog.tier]?.name : ''}?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {confirmDialog.type === 'cancel' ? (
                <>
                  Your subscription will remain active until the end of your current billing period.
                  After that, you will be downgraded to the Free plan and your limits will be
                  adjusted accordingly.
                </>
              ) : (
                <>
                  Your plan will be changed and your limits will be adjusted. Any prorated credits
                  will be applied to your next invoice. Features above the new plan&apos;s limits
                  may become inaccessible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-gray-300 border-white/20 hover:bg-white/20">
              Keep Current Plan
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {confirmDialog.type === 'cancel' ? 'Cancel Subscription' : 'Confirm Downgrade'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from '@tanstack/react-query';
import { CreditCard, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

// Initialize Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Type definitions for API responses
interface SubscriptionStatusResponse {
  status: string;
  subscriptionId?: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  plan?: string;
}

interface PaymentResponse {
  clientSecret?: string;
  subscriptionId?: string;
  status?: string;
  paymentIntentId?: string;
}

// Subscription status component
function SubscriptionStatus() {
  const { data: subscription, isLoading } = useQuery<SubscriptionStatusResponse>({
    queryKey: ['/api/subscription-status'],
    queryFn: () => apiRequest('GET', '/api/subscription-status')
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Subscription Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-300 rounded-full animate-pulse"></div>
            <span className="text-gray-600">Loading subscription status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500/20 text-blue-400"><Clock className="h-3 w-3 mr-1" />Trial</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-500/20 text-yellow-400"><AlertTriangle className="h-3 w-3 mr-1" />Past Due</Badge>;
      case 'canceled':
        return <Badge className="bg-red-500/20 text-red-400"><XCircle className="h-3 w-3 mr-1" />Canceled</Badge>;
      case 'no_subscription':
        return <Badge className="bg-gray-500/20 text-gray-400">No Subscription</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Subscription Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status</span>
            {getStatusBadge(subscription?.status || 'no_subscription')}
          </div>
          
          {subscription?.status !== 'no_subscription' && subscription?.subscriptionId && (
            <>
              <Separator />
              <div className="space-y-2">
                {subscription.plan && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Plan</span>
                    <span className="text-sm font-medium">{subscription.plan}</span>
                  </div>
                )}
                {subscription.currentPeriodEnd && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Next Billing</span>
                    <span className="text-sm font-medium">
                      {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {subscription.cancelAtPeriodEnd && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cancel at Period End</span>
                    <Badge className="bg-yellow-500/20 text-yellow-400">Yes</Badge>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Payment form component for subscriptions (simplified - Elements wrapper handles setup)
function SubscriptionForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Payment System Not Ready",
        description: "Please wait for the payment system to load.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/creator-dashboard/billing`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Subscription Successful",
          description: "Your subscription has been activated!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to process subscription",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscribe to Premium</CardTitle>
        <CardDescription>
          Upgrade your account to access premium features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement />
          
          <Button 
            type="submit" 
            className="w-full bg-brand-primary hover:bg-brand-primary/80"
            disabled={!stripe || !elements || isLoading}
            data-testid="button-subscribe"
          >
            {isLoading ? "Processing..." : "Subscribe"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// One-time payment form component (simplified - Elements wrapper handles setup)
function CheckoutForm({ amount }: { amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Payment System Not Ready",
        description: "Please wait for the payment system to load.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/creator-dashboard/billing`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Successful",
          description: "Thank you for your purchase!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>One-Time Payment</CardTitle>
        <CardDescription>
          Complete your ${amount} payment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentElement />
          
          <Button 
            type="submit" 
            className="w-full bg-brand-primary hover:bg-brand-primary/80"
            disabled={!stripe || !elements || isLoading}
            data-testid="button-pay"
          >
            {isLoading ? "Processing..." : `Pay $${amount}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Subscription wrapper with dynamic Elements setup
function SubscriptionWrapper() {
  const [clientSecret, setClientSecret] = useState<string>("");
  const { toast } = useToast();

  const getSubscriptionSecret = async () => {
    try {
      const response = await apiRequest('POST', '/api/get-or-create-subscription', {});
      const data: PaymentResponse = await response.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      }
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    getSubscriptionSecret();
  }, []);

  if (!clientSecret) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ 
      clientSecret,
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#8B5CF6',
        }
      }
    }}>
      <SubscriptionForm />
    </Elements>
  );
}

// Checkout wrapper with dynamic Elements setup
function CheckoutWrapper({ amount }: { amount: number }) {
  const [clientSecret, setClientSecret] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (amount > 0) {
      const getPaymentSecret = async () => {
        try {
          const response = await apiRequest('POST', '/api/create-payment-intent', { amount });
          const data: PaymentResponse = await response.json();
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          }
        } catch (error: any) {
          toast({
            title: "Payment Setup Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      };
      getPaymentSecret();
    }
  }, [amount, toast]);

  if (!clientSecret && amount > 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ 
      clientSecret,
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#8B5CF6',
        }
      }
    }}>
      <CheckoutForm amount={amount} />
    </Elements>
  );
}

// Main billing page component
export default function BillingPage() {
  const [paymentType, setPaymentType] = useState<'subscription' | 'checkout' | null>(null);
  const [checkoutAmount, setCheckoutAmount] = useState(50);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Billing & Payments</h1>
        <p className="text-gray-400">Manage your subscription and payment methods</p>
      </div>

      <SubscriptionStatus />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plans</CardTitle>
            <CardDescription>
              Recurring monthly or annual plans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setPaymentType('subscription')}
              className="w-full bg-brand-primary hover:bg-brand-primary/80"
              data-testid="button-setup-subscription"
            >
              Manage Subscription
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>One-Time Payments</CardTitle>
            <CardDescription>
              Pay for credits or premium features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium mb-2 text-gray-300">
                Payment Amount ($)
              </label>
              <input
                id="amount"
                type="number"
                min="1"
                max="10000"
                value={checkoutAmount}
                onChange={(e) => setCheckoutAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                data-testid="input-payment-amount"
              />
            </div>
            <Button 
              onClick={() => setPaymentType('checkout')}
              className="w-full bg-brand-secondary hover:bg-brand-secondary/80"
              data-testid="button-setup-checkout"
            >
              Make Payment
            </Button>
          </CardContent>
        </Card>
      </div>

      {paymentType === 'subscription' && <SubscriptionWrapper />}
      {paymentType === 'checkout' && <CheckoutWrapper amount={checkoutAmount} />}
      
      {paymentType && (
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => setPaymentType(null)}
            data-testid="button-cancel-payment"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
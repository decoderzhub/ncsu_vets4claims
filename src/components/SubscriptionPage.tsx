import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Check, Star, CreditCard, LogOut, User } from 'lucide-react';
import { STRIPE_PRODUCTS } from '../stripe-config';
import { supabase } from '../lib/supabase';
import { loadStripe } from '@stripe/stripe-js';
import MobileShell from './layout/MobileShell';
import toast from 'react-hot-toast';

interface Props {
  user: any;
  onLogout: () => void;
  onSubscriptionActive: () => void;
}

interface SubscriptionData {
  subscription_status: string;
  price_id: string | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

const SubscriptionPage: React.FC<Props> = ({ user, onLogout, onSubscriptionActive }) => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      // Check if user has a Stripe customer record first
      const { data: customer, error: customerError } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (customerError) {
        console.error('Error fetching customer:', customerError);
      } else if (customer?.customer_id) {
        // User has paid, redirect to document preview immediately
        console.log('User has paid (customer_id exists), redirecting to document preview');
        onSubscriptionActive();
        return;
      }

      // If no customer record, check subscription status for display
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
      } else {
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string) => {
    setIsCheckingOut(true);
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast.error('Authentication error. Please log in again.');
        return;
      }
      
      if (!session?.access_token) {
        toast.error('Please log in to continue');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/stripe-checkout`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: priceId,
          mode: 'subscription',
          success_url: `${window.location.origin}/success`,
          cancel_url: window.location.href,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Checkout error response:', errorData);
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { sessionId, url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getSubscriptionStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return { text: 'Active', color: 'text-green-600', bg: 'bg-green-100' };
      case 'past_due':
        return { text: 'Past Due', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'canceled':
        return { text: 'Canceled', color: 'text-red-600', bg: 'bg-red-100' };
      case 'trialing':
        return { text: 'Trial', color: 'text-blue-600', bg: 'bg-blue-100' };
      default:
        return { text: 'Inactive', color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const hasActiveSubscription = subscription?.subscription_status === 'active';
  const product = STRIPE_PRODUCTS[0]; // We only have one product

  return (
    <MobileShell
      className="bg-gradient-to-br from-blue-50 via-white to-red-50"
      header={
        <div className="bg-gradient-to-r from-blue-900 to-red-800 text-white p-6 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src="/v4c_icon.png" alt="Vets4Claims" className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">Vets4Claims</h1>
                <p className="text-blue-100">Serving Those Who Served</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-blue-100">Welcome back,</p>
                <p className="font-semibold">{user?.user_metadata?.first_name || user?.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto p-6">
        {/* Current Subscription Status */}
        {subscription && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-lg p-6 mb-8"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Subscription</h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-lg font-semibold text-gray-900">
                    {product.name}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSubscriptionStatusDisplay(subscription.subscription_status).bg} ${getSubscriptionStatusDisplay(subscription.subscription_status).color}`}>
                    {getSubscriptionStatusDisplay(subscription.subscription_status).text}
                  </span>
                </div>
                {subscription.current_period_end && (
                  <p className="text-gray-600">
                    {subscription.cancel_at_period_end ? 'Expires' : 'Renews'} on {formatDate(subscription.current_period_end)}
                  </p>
                )}
                {subscription.payment_method_brand && subscription.payment_method_last4 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Payment method: {subscription.payment_method_brand.toUpperCase()} ending in {subscription.payment_method_last4}
                  </p>
                )}
              </div>
              {hasActiveSubscription && (
                <motion.button
                  onClick={onSubscriptionActive}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-red-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-red-700 transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Access Claims Assistant
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {/* Product Card */}
        {!hasActiveSubscription && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-lg overflow-hidden"
          >
            {/* Product Header */}
            <div className="bg-gradient-to-r from-blue-900 to-red-800 text-white p-6">
              <div className="flex items-center space-x-4">
                <img src="/v4c_icon.png" alt="Vets4Claims" className="h-12 w-12" />
                <div>
                  <h2 className="text-2xl font-bold">{product.name}</h2>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-3xl font-bold">${product.price}</span>
                    <span className="text-blue-100">/{product.interval}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-6 leading-relaxed">
                {product.description}
              </p>

              {/* Value Proposition Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-green-900 mb-4">💰 Exceptional Value for Veterans</h3>
                <div className="space-y-3 text-sm text-green-800">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    <p><strong>Complete in under an hour:</strong> Our streamlined process typically allows veterans to complete their entire claim statement in one sitting, saving weeks of back-and-forth communications.</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    <p><strong>Significant cost savings:</strong> At $50/month, our service costs less than many single consultations or document preparation services that can charge hundreds or even thousands of dollars.</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    <p><strong>More affordable than alternatives:</strong> Compare to nexus letters from doctors (often $500-2000+), legal consultations, or travel costs to meet with VSO representatives multiple times.</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    <p><strong>Convenience from home:</strong> No travel required - complete everything from your computer, saving time and transportation costs.</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    <p><strong>Professional-grade results:</strong> Get comprehensive, well-structured claim statements that follow VA guidelines and best practices.</p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-8">
                {[
                  'AI-powered claims assistance chatbot',
                  'Dedicated guidance throughout VA process',
                  'Help with paperwork and deadlines',
                  'Expert support from veteran advocates',
                  'Priority customer service'
                ].map((feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center space-x-3"
                  >
                    <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </motion.div>
                ))}
              </div>

              {/* Trust Indicators */}
              <div className="border rounded-lg p-4 mb-6 bg-gray-50">
                <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Shield className="h-4 w-4" />
                    <span>Secure Payments</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CreditCard className="h-4 w-4" />
                    <span>Cancel Anytime</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>Veteran-Trusted</span>
                  </div>
                </div>
              </div>

              {/* Subscribe Button */}
              <motion.button
                onClick={() => handleSubscribe(product.priceId)}
                disabled={isCheckingOut}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-red-600 text-white font-bold rounded-lg shadow-lg hover:from-blue-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isCheckingOut ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Starting Checkout...</span>
                  </div>
                ) : (
                  'Start Subscription'
                )}
              </motion.button>

              <p className="text-xs text-gray-500 text-center mt-4">
                By subscribing, you agree to our terms of service. Cancel anytime from your account settings.
              </p>
            </div>
          </motion.div>
        )}

        {/* Additional Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 space-y-6"
        >
          {/* Cost Comparison */}
          <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
            <h3 className="text-lg font-semibold text-yellow-900 mb-4">💡 Smart Investment in Your Future</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <h4 className="font-semibold text-yellow-800 mb-2">⏱️ Time & Convenience</h4>
                <ul className="space-y-2 text-yellow-700">
                  <li>• Complete your entire claim statement in under an hour</li>
                  <li>• Work from the comfort of your home</li>
                  <li>• No scheduling appointments or travel required</li>
                  <li>• Available 24/7 when you're ready to work</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-yellow-800 mb-2">💰 Cost-Effective Solution</h4>
                <ul className="space-y-2 text-yellow-700">
                  <li>• Significantly less than many single consultation fees</li>
                  <li>• More affordable than professional nexus letters</li>
                  <li>• Saves on travel costs to VSO meetings</li>
                  <li>• Cancel anytime - no long-term commitments</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Why Choose Section */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Why Choose Vets4Claims?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <h4 className="font-semibold mb-2">🎯 Specialized Expertise</h4>
                <p>Our AI is specifically trained on VA regulations and procedures to provide accurate, relevant guidance.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🤝 Veteran-Centric</h4>
                <p>Built by veterans, for veterans. We understand the unique challenges you face in the claims process.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">⚡ Real-Time Support</h4>
                <p>Get instant answers to your questions and stay updated on your claim status throughout the process.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🔒 Secure & Private</h4>
                <p>Your personal information and claim details are protected with military-grade security.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </MobileShell>
  );
};

export default SubscriptionPage;
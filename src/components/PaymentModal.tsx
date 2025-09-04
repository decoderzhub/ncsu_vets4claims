import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Shield, Check, Star } from 'lucide-react';
import { stripePromise } from '../lib/stripe';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  veteranEmail: string;
}

const PaymentModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, veteranEmail }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast.success('Payment successful! Unlocking premium services...');
      onSuccess();
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 to-red-800 text-white p-6 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="text-center">
                <Shield className="h-12 w-12 mx-auto mb-3 text-yellow-400" />
                <h2 className="text-2xl font-bold mb-2">Premium Claims Service</h2>
                <p className="text-blue-100">Complete your VA disability claim with professional support</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900 mb-1">$50</div>
                <div className="text-gray-600">One-time fee</div>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                {[
                  'Professional claim statement generation',
                  'DocuSeal integration for secure signing',
                  'Email delivery of completed forms',
                  'Step-by-step submission guidance',
                  'Priority customer support'
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
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Shield className="h-4 w-4" />
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CreditCard className="h-4 w-4" />
                    <span>Encrypted</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>Trusted by Veterans</span>
                  </div>
                </div>
              </div>

              {/* Payment Button */}
              <motion.button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-red-600 text-white font-bold rounded-lg shadow-lg hover:from-blue-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Complete Payment & Generate Claim'
                )}
              </motion.button>

              <p className="text-xs text-gray-500 text-center mt-4">
                By proceeding, you agree to our terms of service. Your payment information is secure and encrypted.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PaymentModal;
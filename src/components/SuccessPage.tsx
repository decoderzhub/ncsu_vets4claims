import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Shield, ArrowRight } from 'lucide-react';

interface Props {
  onContinue: () => void;
}

const SuccessPage: React.FC<Props> = ({ onContinue }) => {
  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      onContinue();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="h-12 w-12 text-white" />
        </motion.div>

        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            🇺🇸 Welcome to Vets4Claims Premium!
          </h1>
          <p className="text-gray-600 mb-6">
            Your subscription has been activated successfully. You now have access to our full suite of VA claims assistance tools.
          </p>
        </motion.div>

        {/* Features Unlocked */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-blue-50 rounded-lg p-4 mb-6"
        >
          <h3 className="font-semibold text-blue-900 mb-3">What's Now Available:</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>AI-powered claims assistance</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Dedicated case support</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Priority customer service</span>
            </div>
          </div>
        </motion.div>

        {/* Continue Button */}
        <motion.button
          onClick={onContinue}
          className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-red-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-red-700 transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-center justify-center space-x-2">
            <span>Continue to Claims Assistant</span>
            <ArrowRight className="h-5 w-5" />
          </div>
        </motion.button>

        <p className="text-xs text-gray-500 mt-4">
          Redirecting automatically in 3 seconds...
        </p>
      </motion.div>
    </div>
  );
};

export default SuccessPage;
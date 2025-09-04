import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Code, Mail, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDevModeEnabled: () => void;
}

const DevModeModal: React.FC<Props> = ({ isOpen, onClose, onDevModeEnabled }) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingPassword, setIsSendingPassword] = useState(false);

  const handleSendPassword = async () => {
    setIsSendingPassword(true);
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      
      if (!backendUrl) {
        throw new Error('Backend URL not configured. Please check VITE_BACKEND_URL environment variable.');
      }
      
      const response = await fetch(`${backendUrl}/dev-auth-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'darin.manley@vets4claims.com'
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Development password sent to your email!');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to send password');
      }
    } catch (error) {
      console.error('Error sending password:', error);
      toast.error('Failed to send password');
    } finally {
      setIsSendingPassword(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      toast.error('Please enter the password');
      return;
    }

    setIsLoading(true);
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      
      const response = await fetch(`${backendUrl}/dev-auth-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'darin.manley@vets4claims.com',
          password: password.trim(),
          verify: true
        })
      });

      const result = await response.json();
      
      if (result.valid) {
        toast.success('Developer mode enabled!');
        onDevModeEnabled();
        onClose();
        setPassword('');
      } else {
        toast.error('Invalid or expired password');
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      toast.error('Failed to verify password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    onClose();
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
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="text-center">
                <Code className="h-12 w-12 mx-auto mb-3 text-yellow-400" />
                <h2 className="text-2xl font-bold mb-2">Developer Authentication</h2>
                <p className="text-blue-100">Enter password to enable development mode</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Password Input */}
                <div>
                  <label htmlFor="devPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Development Password
                  </label>
                  <input
                    id="devPassword"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-center font-mono text-lg tracking-widest"
                    maxLength={6}
                    onKeyPress={(e) => e.key === 'Enter' && handleVerifyPassword()}
                  />
                </div>

                {/* Send Password Button */}
                <motion.button
                  onClick={handleSendPassword}
                  disabled={isSendingPassword}
                  className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSendingPassword ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Password...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Mail className="h-5 w-5" />
                      <span>Send code to Email</span>
                    </div>
                  )}
                </motion.button>

                {/* Verify Button */}
                <motion.button
                  onClick={handleVerifyPassword}
                  disabled={isLoading || !password.trim()}
                  className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>Enable Dev Mode</span>
                    </div>
                  )}
                </motion.button>
              </div>

              {/* Instructions */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Instructions:</h4>
                <ol className="text-sm text-gray-600 space-y-1">
                  <li>1. Click "Send Password to Email"</li>
                  <li>2. Check your email for the 6-digit code</li>
                  <li>3. Enter the code above</li>
                  <li>4. Click "Enable Dev Mode"</li>
                </ol>
                <p className="text-xs text-gray-500 mt-3">
                  Password expires in 10 minutes for security.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DevModeModal;
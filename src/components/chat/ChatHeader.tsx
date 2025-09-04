import React from 'react';
import { motion } from 'framer-motion';
import { Code, RotateCcw, LogOut, ArrowLeft } from 'lucide-react';

interface Props {
  headerKey: number;
  user?: any;
  isDevMode: boolean;
  isStructuredMode: boolean;
  isEditMode: boolean;
  isPostClaimMode: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  onLogin: () => void;
  onSignup: () => void;
  onLogout: () => void;
  onStartNewClaim: () => void;
  onToggleDevMode: () => void;
  onBackToDocumentPreview?: () => void;
}

const ChatHeader: React.FC<Props> = ({
  headerKey,
  user,
  isDevMode,
  isStructuredMode,
  isEditMode,
  isPostClaimMode,
  currentQuestionIndex,
  totalQuestions,
  onLogin,
  onSignup,
  onLogout,
  onStartNewClaim,
  onToggleDevMode,
  onBackToDocumentPreview
}) => {
  const progress = (currentQuestionIndex / totalQuestions) * 100;

  return (
    <motion.div 
      key={headerKey}
      className="bg-gradient-to-r from-blue-900 via-blue-800 to-red-800 text-white p-2 sm:p-4 md:p-6 shadow-lg"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center space-x-4">
          <img src="/v4c_icon.png" alt="Vets4Claims" className="h-8 w-8" />
          <div>
            <h1 className="text-base sm:text-lg md:text-2xl font-bold truncate">
              {isPostClaimMode ? 'Claims Guide' : 'V4C Assistant'}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 hidden sm:block">
              {isPostClaimMode ? 'Next Steps & VA Process Guidance' : 'Serving Those Who Served'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          {/* Auth Buttons */}
          {!user ? (
            <div className="flex items-center space-x-1 sm:space-x-2 mr-1 sm:mr-3">
              <button
                onClick={onLogin}
                className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm bg-white/10 text-white hover:bg-white/20 rounded-full border border-white/20 transition-all duration-200 font-medium"
              >
                Login
              </button>
              <button
                onClick={onSignup}
                className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm bg-white text-blue-900 hover:bg-blue-50 rounded-full shadow-sm transition-all duration-200 font-medium"
              >
                Sign Up
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-1 sm:space-x-3 mr-1 sm:mr-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs sm:text-sm text-blue-100">Welcome back,</p>
                <p className="text-sm font-semibold">{user?.user_metadata?.first_name || user?.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm bg-white/10 text-white hover:bg-white/20 rounded-full border border-white/20 transition-all duration-200 font-medium"
              >
                Logout
              </button>
            </div>
          )}
          
          {/* Control Buttons */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {isPostClaimMode && onBackToDocumentPreview && (
              <button
                onClick={onBackToDocumentPreview}
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-white/10 text-white hover:bg-white/20 rounded-full border border-white/20 transition-all duration-200"
                title="Back to Document"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            )}
            <button
              onClick={onStartNewClaim}
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 bg-white/10 text-white hover:bg-white/20 rounded-full border border-white/20 transition-all duration-200"
              title="Start New Claim"
            >
              <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={onToggleDevMode}
              className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-xs font-medium transition-all duration-200 ${
                isDevMode 
                  ? 'bg-green-500 text-white border border-green-400' 
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
              }`}
              title={isDevMode ? 'Dev Mode On' : 'Dev Mode Off'}
            >
              <Code className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      {(isStructuredMode || isEditMode) && !isPostClaimMode && (
        <motion.div 
          className="mt-2 sm:mt-4 bg-white/20 rounded-full h-1 sm:h-2"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="bg-gradient-to-r from-red-500 to-red-400 h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${isEditMode ? 100 : progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      )}
    </motion.div>
  );
};

export default ChatHeader;
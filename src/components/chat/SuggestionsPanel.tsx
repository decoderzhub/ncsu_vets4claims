import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, RefreshCw, X } from 'lucide-react';

interface Props {
  suggestions: string[];
  isGeneratingSuggestions: boolean;
  isStructuredMode: boolean;
  isEditMode: boolean;
  isHidden: boolean;
  hasInputText: boolean;
  onRefreshSuggestions: () => void;
  onSelectSuggestion: (suggestion: string) => void;
  onHide: () => void;
  onShow: () => void;
}

const SuggestionsPanel: React.FC<Props> = ({
  suggestions,
  isGeneratingSuggestions,
  isStructuredMode,
  isEditMode,
  isHidden,
  hasInputText,
  onRefreshSuggestions,
  onSelectSuggestion,
  onHide,
  onShow,
}) => {
  // Show panel if we have suggestions OR if we're generating them for claim questions, and not hidden
  const shouldShow = isStructuredMode && !isEditMode && !isHidden && (suggestions.length > 0 || isGeneratingSuggestions);
  
  // Show tooltip if hidden but user has input text
  const shouldShowTooltip = isStructuredMode && !isEditMode && isHidden && hasInputText;
  
  if (!shouldShow && !shouldShowTooltip) {
    return null;
  }

  if (shouldShowTooltip) {
    return (
      <div className="bg-yellow-50/95 backdrop-blur-sm border-t border-yellow-200 p-3">
        <div className="flex items-center justify-center space-x-3">
          <p className="text-xs text-yellow-700">
            💡 See your AI generated suggestions
          </p>
          <motion.button
            onClick={onShow}
            className="flex items-center space-x-1 px-2 py-1 text-xs text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100 rounded transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Show</span>
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50/95 backdrop-blur-sm border-t border-blue-200 p-3">
      <div className="flex justify-center mb-2">
        <motion.button
          onClick={onHide}
          className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <X className="h-3 w-3" />
          <span>Hide suggestions</span>
        </motion.button>
      </div>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center space-x-2">
          <Lightbulb className="h-5 w-5 text-blue-600" />
          <span className="text-xs sm:text-sm font-medium text-blue-900">AI Suggestions to Strengthen Your Claim</span>
        </div>
        <motion.button
          onClick={onRefreshSuggestions}
          disabled={isGeneratingSuggestions}
          className="flex items-center space-x-1 px-1 sm:px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors flex-shrink-0"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw className={`h-4 w-4 ${isGeneratingSuggestions ? 'animate-spin' : ''}`} />
          <span className="text-xs hidden sm:inline">Refresh</span>
        </motion.button>
      </div>
      
      {isGeneratingSuggestions ? (
        <div className="flex items-center justify-center py-2 sm:py-4">
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs sm:text-sm">Generating helpful suggestions...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1 sm:gap-2">
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white border border-blue-200 rounded-lg p-2 sm:p-3 text-xs sm:text-sm text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer break-words"
              onClick={() => onSelectSuggestion(suggestion)}
            >
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full mt-1.5 sm:mt-2 flex-shrink-0" />
                <span className="leading-relaxed">{suggestion}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      <p className="text-xs text-blue-600 mt-2 text-center">
        💡 Click any example to add it to your response
      </p>
    </div>
  );
};

export default SuggestionsPanel;
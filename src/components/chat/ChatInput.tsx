import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';

interface Props {
  inputValue: string;
  isTyping: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
}

const ChatInput: React.FC<Props> = ({
  inputValue,
  isTyping,
  onInputChange,
  onSendMessage
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus input after sending message (when inputValue becomes empty)
  useEffect(() => {
    if (!inputValue && !isTyping && textareaRef.current) {
      // Small delay to ensure the message has been processed
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [inputValue, isTyping]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = 24; // Approximate line height in pixels
      const maxHeight = lineHeight * 5; // 5 lines max
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputValue]);
  const handleKeyPress = (e: React.KeyboardEvent) => {
    // On desktop: Enter sends, Shift+Enter adds new line
    // On mobile: Enter adds new line, must use send button
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (e.key === 'Enter') {
      if (!isMobile && !e.shiftKey) {
        e.preventDefault();
        onSendMessage();
      }
      // On mobile or with Shift key, allow the default behavior (new line)
    }
  };

  const handleFocus = () => {
    // Scroll chat to bottom when input focuses to prevent iOS jumping
    setTimeout(() => {
      const chatContainer = document.querySelector('main[data-chat-scroller]');
      if (chatContainer) {
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'auto' });
      }
    }, 100);
  };

  // Detect if user is on mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const placeholderText = isMobile 
    ? "Share your response..."
    : "Share your response... (Shift+Enter for new line)";

  return (
    <div 
      className="bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600 backdrop-blur-sm border-t border-gray-600 p-3"
    >
      <div className="flex space-x-3 max-w-full">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={handleFocus}
          placeholder={placeholderText}
          className="flex-1 min-w-0 px-4 py-3 text-base bg-black text-gray-100 placeholder-gray-400 border border-gray-600 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 touch-manipulation resize-none overflow-y-auto invisible-scrollbar"
          style={{ minHeight: '48px', maxHeight: '120px' }}
          disabled={isTyping}
        />
        <motion.button
          onClick={onSendMessage}
          disabled={!inputValue.trim() || isTyping}
          className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-blue-600 to-red-600 text-white rounded-full hover:from-blue-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-200 touch-manipulation self-end"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Send className="h-5 w-5" />
        </motion.button>
      </div>
      
      {/* Powered by link */}
      <div className="text-center mt-2">
        <p className="text-xs text-gray-500">
          Powered by{' '}
          <a 
            href="https://codeofhonor.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 transition-colors"
          >
            CodeOfHonor.ai
          </a>
        </p>
      </div>
    </div>
  );
};

export default ChatInput;
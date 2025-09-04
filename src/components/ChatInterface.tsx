import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { VeteranProfile } from '../types/veteran';
import ChatMessageComponent from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import ChatHeader from './chat/ChatHeader';
import DevModeModal from './chat/DevModeModal';
import SuggestionsPanel from './chat/SuggestionsPanel';
import ChatInput from './chat/ChatInput';
import MobileShell from './layout/MobileShell';
import useChatLogic from './chat/hooks/useChatLogic';
import useSuggestions from './chat/hooks/useSuggestions';
import toast from 'react-hot-toast';

interface Props {
  veteranData: Partial<VeteranProfile>;
  setVeteranData: (data: Partial<VeteranProfile>) => void;
  onCompleteIntake: () => void;
  isEditMode?: boolean;
  onEditComplete?: () => void;
  isPostClaimMode?: boolean;
  onBackToDocumentPreview?: () => void;
  user?: any;
  onLogin?: () => void;
  onSignup?: () => void;
  onLogout?: () => void;
  onStartNewClaim?: () => void;
}

const ChatInterface: React.FC<Props> = ({ 
  veteranData, 
  setVeteranData, 
  onCompleteIntake, 
  isEditMode = false,
  onEditComplete,
  isPostClaimMode = false,
  onBackToDocumentPreview,
  user,
  onLogin,
  onSignup,
  onLogout,
  onStartNewClaim
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isDevMode, setIsDevMode] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const [headerKey, setHeaderKey] = useState(Date.now());
  const scrollerRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen for post-claim chat navigation event
  useEffect(() => {
    const handleGoToPostClaimChat = () => {
      if (onStartNewClaim) {
        // Use the App's navigation to go to post-claim chat
        const event = new CustomEvent('navigateToPostClaimChat');
        window.dispatchEvent(event);
      }
    };

    window.addEventListener('goToPostClaimChat', handleGoToPostClaimChat);
    return () => window.removeEventListener('goToPostClaimChat', handleGoToPostClaimChat);
  }, [onStartNewClaim]);

  const {
    messages,
    setMessages,
    currentQuestionIndex,
    isStructuredMode,
    isTyping,
    handleSendMessage,
    STRUCTURED_QUESTIONS
  } = useChatLogic({
    veteranData,
    setVeteranData,
    onCompleteIntake,
    isEditMode,
    onEditComplete,
    isDevMode,
    isPostClaimMode,
    onBackToDocumentPreview,
    user,
    onStartNewClaim
  });

  const {
    suggestions,
    isGeneratingSuggestions,
    generateSuggestions,
    clearSuggestions,
    showSuggestions,
    isHidden
  } = useSuggestions({
    inputValue,
    currentQuestionIndex,
    isStructuredMode,
    isEditMode,
    veteranData,
    structuredQuestions: STRUCTURED_QUESTIONS
  });

  useEffect(() => {
    if (!isEditMode) {
      setHeaderKey(Date.now());
    }
  }, [isEditMode]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added - use requestAnimationFrame for better timing
    const id = requestAnimationFrame(() => scrollToBottom());
    return () => cancelAnimationFrame(id);
  }, [messages]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ 
      top: el.scrollHeight, 
      behavior 
    });
  };

  // Handle typewriter content updates
  const handleTypewriterTick = () => {
    // Use auto behavior for typewriter updates to avoid jarring smooth scrolls
    scrollToBottom('auto');
  };

  const handleSendMessageWrapper = async () => {
    if (!inputValue.trim()) return;
    
    await handleSendMessage(inputValue);
    setInputValue('');
  };

  const handleOptionSelect = (option: string) => {
    setInputValue(option);
    setTimeout(() => handleSendMessageWrapper(), 100);
  };

  const handleStartNewClaim = () => {
    if (window.confirm('Are you sure you want to start a new claim? This will clear all current information.')) {
      setVeteranData({});
      localStorage.removeItem('veteranData');
      
      setMessages([]);
      clearSuggestions();
      
      if (onStartNewClaim) {
        onStartNewClaim();
      }
      
      toast.success('Started new claim process');
    }
  };

  const handleToggleDevMode = () => {
    if (isDevMode) {
      setIsDevMode(false);
      toast.success('Developer mode disabled');
    } else {
      setShowDevModal(true);
    }
  };

  const handleDevModeEnabled = () => {
    setIsDevMode(true);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setInputValue(prev => prev ? `${prev} ${suggestion}` : suggestion);
  };

  const handleHideSuggestions = () => {
    clearSuggestions();
  };

  return (
    <>
    <MobileShell
      ref={scrollerRef}
      header={
        <ChatHeader
        headerKey={headerKey}
        user={user}
        isDevMode={isDevMode}
        isStructuredMode={isStructuredMode}
        isEditMode={isEditMode}
        isPostClaimMode={isPostClaimMode}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={STRUCTURED_QUESTIONS.length}
        onLogin={onLogin || (() => {})}
        onSignup={onSignup || (() => {})}
        onLogout={onLogout || (() => {})}
        onStartNewClaim={handleStartNewClaim}
        onToggleDevMode={handleToggleDevMode}
        onBackToDocumentPreview={onBackToDocumentPreview}
      />
      }
      footer={
        <>
          <SuggestionsPanel
            suggestions={suggestions}
            isGeneratingSuggestions={isGeneratingSuggestions}
            isStructuredMode={isStructuredMode}
            isEditMode={isEditMode}
            isHidden={isHidden}
            hasInputText={inputValue.trim().length > 0}
            onRefreshSuggestions={generateSuggestions}
            onSelectSuggestion={handleSelectSuggestion}
            onHide={handleHideSuggestions}
            onShow={showSuggestions}
          />

          <ChatInput
            inputValue={inputValue}
            isTyping={isTyping}
            onInputChange={setInputValue}
            onSendMessage={handleSendMessageWrapper}
          />
        </>
      }
    >
      {/* Chat Messages with Enhanced Background */}
      <div className="relative min-h-full w-full">
        <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-gray-900/60 via-gray-700/50 to-gray-500/40">
          {/* Dark overlay */}
          <div className="relative w-full h-full overflow-y-auto overscroll-contain">
          {/* Waving flag gradient overlay */}
          <div 
            className="absolute inset-0 w-full min-h-full bg-gradient-to-br from-blue-900/80 via-blue-700/60 to-red-800/70"
          >
            <div className="absolute inset-0 w-full min-h-full bg-gradient-to-br from-blue-900/40 via-purple-800/30 to-red-900/40" />
          </div>
        </div>
        </div>
        
        {/* Messages Container */}
        <div 
          className="relative z-10 py-4 space-y-3 sm:space-y-4 w-full" 
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 7rem)' }}
        >
          <AnimatePresence>
            {messages.map((message) => (
              <ChatMessageComponent
                key={message.id}
                message={message}
                onOptionSelect={handleOptionSelect}
                onTypewriterTick={handleTypewriterTick}
              />
            ))}
          </AnimatePresence>
          
          {isTyping && <TypingIndicator />}
          
          {/* Invisible element to scroll to */}
          <div 
            ref={messagesEndRef} 
            className="h-8" 
            style={{ scrollMarginBottom: '6rem' }} 
          />
        </div>
        
      </div>
    </MobileShell>

      <DevModeModal
        isOpen={showDevModal}
        onClose={() => setShowDevModal(false)}
        onDevModeEnabled={handleDevModeEnabled}
      />
    </>
  );
};

export default ChatInterface;
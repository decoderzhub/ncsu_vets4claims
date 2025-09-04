import React from 'react';
import { motion } from 'framer-motion';
import { ChatMessage as ChatMessageType } from '../types/veteran';
import TypewriterText from './TypewriterText';

interface Props {
  message: ChatMessageType;
  onOptionSelect?: (option: string) => void;
  onTypewriterTick?: () => void;
}

const ChatMessage: React.FC<Props> = ({ message, onOptionSelect, onTypewriterTick }) => {
  const isUser = message.role === 'user';

  return (
    <>
    <motion.div
      className="relative z-20"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 px-3`}>
        <div className={`w-full max-w-[85vw] sm:max-w-sm md:max-w-lg lg:max-w-2xl xl:max-w-4xl`}>

        {/* Message Content */}
        <motion.div
          className={`px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shadow-lg text-sm sm:text-base min-w-0 break-words ${
            isUser
              ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white border border-slate-600/50'
              : 'bg-gradient-to-br from-slate-900 to-slate-800 border border-cyan-500/20 text-cyan-50 shadow-xl shadow-cyan-500/10'
          }`}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          {/* Message Text */}
          {isUser ? (
            <div 
              className="prose prose-xs sm:prose-sm prose-invert max-w-none leading-relaxed break-words"
              dangerouslySetInnerHTML={{ 
                __html: message.content
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-300 hover:text-blue-100 underline transition-colors duration-200">$1</a>')
                  .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-300 hover:text-blue-100 underline transition-colors duration-200">$1</a>')
                  .replace(/\n/g, '<br>')
              }}
            />
          ) : (
            <TypewriterText 
              text={message.content}
              className="prose prose-xs sm:prose-sm prose-invert max-w-none text-cyan-50 leading-relaxed break-words"
              onTick={onTypewriterTick}
            />
          )}

          {/* Options */}
          {message.options && onOptionSelect && (
            <motion.div 
              className="mt-2 sm:mt-3 flex flex-wrap gap-1 sm:gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {message.options.map((option, index) => (
                <motion.button
                  key={option}
                  onClick={() => onOptionSelect(option)}
                  className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 rounded-full transition-all duration-200 backdrop-blur-sm text-cyan-100 hover:text-white"
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.3)' }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  {option}
                </motion.button>
              ))}
            </motion.div>
          )}
        </motion.div>
        </div>
      </div>
    </motion.div>

      {/* Timestamp */}
      <div className={`text-xs text-white/80 mt-1 sm:mt-2 px-3 ${isUser ? 'text-right' : 'text-left'}`}>
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </>
  );
};

export default ChatMessage;
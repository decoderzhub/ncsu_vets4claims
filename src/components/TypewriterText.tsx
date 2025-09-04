import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  text: string;
  className?: string;
  wordsPerBatch?: number;
  batchDelay?: number;
  isHTML?: boolean;
  onTick?: () => void;
}

const TypewriterText: React.FC<Props> = ({ 
  text, 
  className = '', 
  wordsPerBatch = 3, 
  batchDelay = 100,
 isHTML = false,
  onTick
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Split text into words while preserving formatting
  const words = text.split(/(\s+)/); // This preserves whitespace
  const totalWords = words.filter(word => word.trim().length > 0).length;

  useEffect(() => {
    if (currentWordIndex < words.length) {
      const timer = setTimeout(() => {
        // Add the next batch of words
        const endIndex = Math.min(currentWordIndex + wordsPerBatch * 2, words.length); // *2 to account for spaces
        const newWords = words.slice(currentWordIndex, endIndex).join('');
        setDisplayedText(prev => prev + newWords);
        setCurrentWordIndex(endIndex);
        
        // Notify parent that content has updated
        if (onTick) {
          onTick();
        }
      }, batchDelay);

      return () => clearTimeout(timer);
    } else if (!isComplete) {
      setIsComplete(true);
    }
  }, [currentWordIndex, words, batchDelay, wordsPerBatch, isComplete]);

  // Convert URLs to clickable links
  const linkify = (text: string) => {
    return text.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-cyan-300 hover:text-cyan-100 underline transition-colors duration-200">$1</a>'
    );
  };

  // Apply markdown formatting to the displayed text
  const applyMarkdownFormatting = (text: string) => {
    // If the text already contains HTML tags, don't apply markdown formatting
    if (text.includes('<a ') || text.includes('<strong>') || text.includes('<br>')) {
      return text; // Return as-is since it's already formatted HTML
    }
    
    // Otherwise, apply markdown formatting for plain text
    let formatted = linkify(text);
    formatted = formatted
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cyan-300 hover:text-cyan-100 underline transition-colors duration-200">$1</a>')
      .replace(/\n/g, '<br>');
    
    return formatted;
  };

  return (
    <div className={className}>
      {/* Main text content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <div
          dangerouslySetInnerHTML={{ 
            __html: isHTML || true ? applyMarkdownFormatting(isComplete ? text : displayedText) : (isComplete ? text : displayedText)
          }}
        />
        
        {/* Typing cursor - only show when not complete */}
        {!isComplete && (
          <motion.span
            className="inline-block w-0.5 h-4 bg-cyan-400 ml-1"
            animate={{
              opacity: [1, 0, 1],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
        
        {/* Subtle glow effect when typing */}
        {!isComplete && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl pointer-events-none"
            animate={{
              opacity: [0, 0.3, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </motion.div>
    </div>
  );
};

export default TypewriterText;
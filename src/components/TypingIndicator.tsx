import React from 'react';
import { motion } from 'framer-motion';

const TypingIndicator: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex justify-start mb-4 relative z-30 px-3"
    >
      <div className="max-w-[85vw] sm:max-w-sm md:max-w-lg lg:max-w-2xl xl:max-w-4xl">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-cyan-500/20 px-4 py-3 rounded-2xl shadow-xl shadow-cyan-500/10 min-w-0 break-words">
          <div className="flex space-x-2 items-center">
            <span className="text-cyan-300 text-xs font-medium">AI thinking</span>
            <div className="flex space-x-1">
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  className="w-1.5 h-1.5 bg-cyan-400 rounded-full"
                  animate={{
                    scale: [1, 1.8, 1],
                    opacity: [0.4, 1, 0.4]
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: index * 0.15,
                    ease: 'easeInOut'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TypingIndicator;
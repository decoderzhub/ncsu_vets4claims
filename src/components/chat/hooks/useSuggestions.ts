import { useState, useEffect } from 'react';
import { bastionGPT } from '../../../lib/bastionGPT';
import { VeteranProfile } from '../../../types/veteran';

interface UseSuggestionsProps {
  inputValue: string;
  currentQuestionIndex: number;
  isStructuredMode: boolean;
  isEditMode: boolean;
  veteranData: Partial<VeteranProfile>;
  structuredQuestions: any[];
}

export const useSuggestions = ({
  inputValue,
  currentQuestionIndex,
  isStructuredMode,
  isEditMode,
  veteranData,
  structuredQuestions
}: UseSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [lastInputForSuggestions, setLastInputForSuggestions] = useState('');
  const [isHidden, setIsHidden] = useState(false);

  const generateSuggestions = async (userInput?: string) => {
    if (isHidden) return;
    if (!isStructuredMode || isEditMode || currentQuestionIndex >= structuredQuestions.length) return;
    
    const currentQuestion = structuredQuestions[currentQuestionIndex];
    
    const claimQuestions = [
      'claimInfo.primaryCondition',
      'claimInfo.serviceConnection', 
      'claimInfo.symptoms',
      'claimInfo.medicalTreatment',
      'claimInfo.workImpact'
    ];
    
    if (!claimQuestions.includes(currentQuestion.key)) {
      setSuggestions([]);
      return;
    }

    const inputToAnalyze = userInput !== undefined ? userInput : inputValue;
    
    if (inputToAnalyze === lastInputForSuggestions) {
      return;
    }
    
    setLastInputForSuggestions(inputToAnalyze);
    setIsGeneratingSuggestions(true);
    
    try {
      const systemPrompt = {
        role: 'system',
        content: `You are a VA claims expert helping veterans provide comprehensive information for their disability claims. Generate 3-4 specific EXAMPLES that relate to their condition and could help them expand their response.
        
        Generate examples that are specific to their condition type and show concrete impacts. Format as a simple JSON array of example strings.
        
        Current veteran data context:
        - Condition Type: ${veteranData.claimInfo?.conditionType || 'Not specified'}
        - Primary Condition: ${veteranData.claimInfo?.primaryCondition || 'Not specified'}
        - Service Branch: ${veteranData.militaryService?.branch || 'Not specified'}
        
        Question: "${currentQuestion.question}"
        Current input: "${inputToAnalyze}"
        
        Return ONLY a JSON array of specific example strings.`
      };
      
      const userPrompt = {
        role: 'user',
        content: `Generate specific examples for: "${currentQuestion.question}"`
      };
      
      const response = await bastionGPT.sendMessage([systemPrompt, userPrompt]);
      
      try {
        const parsedSuggestions = JSON.parse(response);
        if (Array.isArray(parsedSuggestions)) {
          setSuggestions(parsedSuggestions);
        } else {
          setSuggestions([]);
        }
      } catch (parseError) {
        console.error('Error parsing suggestions:', parseError);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Generate suggestions when input changes (with debounce)
  useEffect(() => {
    if (isHidden) return;
    if (isStructuredMode && !isEditMode && inputValue.trim().length > 5) {
      const timer = setTimeout(() => {
        generateSuggestions(inputValue);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [inputValue, currentQuestionIndex, isStructuredMode, isEditMode, veteranData]);

  // Also generate suggestions when reaching a claim question, even without input
  useEffect(() => {
    if (isHidden) return;
    if (isStructuredMode && !isEditMode && currentQuestionIndex < structuredQuestions.length) {
      const currentQuestion = structuredQuestions[currentQuestionIndex];
      const claimQuestions = [
        'claimInfo.primaryCondition',
        'claimInfo.serviceConnection', 
        'claimInfo.symptoms',
        'claimInfo.medicalTreatment',
        'claimInfo.workImpact'
      ];
      
      if (claimQuestions.includes(currentQuestion.key)) {
        // Generate initial suggestions for claim questions
        setTimeout(() => {
          generateSuggestions('');
        }, 1500);
      }
    }
  }, [currentQuestionIndex, isStructuredMode, isEditMode]);

  const clearSuggestions = () => {
    setSuggestions([]);
    setLastInputForSuggestions('');
    setIsHidden(true);
  };

  const showSuggestions = () => {
    setIsHidden(false);
    // Regenerate suggestions if we have input text
    if (inputValue.trim().length > 5) {
      generateSuggestions(inputValue);
    }
  };

  // Reset hidden state when question changes
  useEffect(() => {
    setIsHidden(false);
  }, [currentQuestionIndex]);

  return {
    suggestions,
    isGeneratingSuggestions,
    generateSuggestions,
    clearSuggestions,
    showSuggestions,
    isHidden
  };
};

export default useSuggestions;
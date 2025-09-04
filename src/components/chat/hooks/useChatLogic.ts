import { useState, useEffect } from 'react';
import { ChatMessage, VeteranProfile } from '../../../types/veteran';
import { bastionGPT } from '../../../lib/bastionGPT';
import toast from 'react-hot-toast';

const STRUCTURED_QUESTIONS = [
  { key: 'firstName', question: "What's your first name?", type: 'text' },
  { key: 'lastName', question: "What's your last name?", type: 'text' },
  { key: 'email', question: "What's your email address?", type: 'email' },
  { key: 'ssn', question: "What's your Social Security Number? Please enter it in the format XXX-XX-XXXX (This will be encrypted and secured)", type: 'ssn' },
  { key: 'phone', question: "What's your phone number?", type: 'phone' },
  { key: 'dateOfBirth', question: "What's your date of birth? Please enter it in MM/DD/YYYY format (for example: 01/15/1985)", type: 'date' },
  { key: 'militaryService.branch', question: "Which branch of the military did you serve in?", type: 'options', options: ['Army', 'Navy', 'Air Force', 'Marines', 'Coast Guard', 'Space Force'] },
  { key: 'militaryService.serviceYears', question: "What were your dates of service? (From - To)", type: 'text' },
  { key: 'militaryService.rank', question: "What was your rank at discharge?", type: 'text' },
  { key: 'claimInfo.conditionType', question: "What type of disability are you claiming?", type: 'options', options: ['Physical Injury', 'Mental Health (PTSD/Anxiety/Depression)', 'Hearing Loss', 'Multiple Conditions', 'Other'] },
  { key: 'claimInfo.primaryCondition', question: "What is your primary condition or injury you're claiming?", type: 'longtext' },
  { key: 'claimInfo.serviceConnection', question: "How is this condition connected to your military service? Please describe the incident, exposure, or circumstances.", type: 'longtext' },
  { key: 'claimInfo.symptoms', question: "What symptoms do you experience? Please describe how this condition affects your daily life.", type: 'longtext' },
  { key: 'claimInfo.medicalTreatment', question: "Have you received medical treatment for this condition? If yes, please provide details.", type: 'longtext' },
  { key: 'claimInfo.workImpact', question: "How does this condition affect your ability to work or perform daily activities?", type: 'longtext' },
  { key: 'address.street', question: "What's your complete street address? (Include house number and street name, e.g., '123 Main Street')", type: 'text' },
  { key: 'address.city', question: "What city do you live in?", type: 'text' },
  { key: 'address.state', question: "What state do you live in?", type: 'text' },
  { key: 'address.zipCode', question: "What's your ZIP code?", type: 'text' }
];

const DEMO_ANSWERS = [
  'Darin', 'Manley', 'darin.j.manley@gmail.com', '123-45-6789', '555-123-4567', '01/15/1985',
  'Army', '2003-2007', 'Staff Sergeant', 'Physical Injury',
  'Lower back injury and chronic pain from lifting heavy equipment during deployment',
  'During my deployment in Iraq in 2005, I was required to lift heavy ammunition boxes and equipment daily. One day while loading supplies, I felt a sharp pain in my lower back. The pain persisted throughout my deployment but I continued my duties. The injury was documented by the medic but I did not receive proper treatment until after returning home.',
  'I experience constant lower back pain that ranges from 4-8 on the pain scale daily. The pain is worse in the morning and after sitting for long periods. I have muscle spasms, stiffness, and shooting pain down my left leg. I have difficulty bending, lifting anything over 20 pounds, and standing for more than 30 minutes.',
  'I have been treated by Dr. Johnson at the VA Medical Center since 2008. I receive physical therapy twice a month and take prescription pain medication (Ibuprofen 800mg). I have had two MRI scans showing disc degeneration at L4-L5. I also see a pain management specialist quarterly for injections.',
  'My back injury significantly impacts my daily life and work capacity. I can no longer perform physical labor and had to change careers from construction to desk work. I have difficulty playing with my children, doing household chores, and sleeping through the night. I use a heating pad daily and have to take frequent breaks when walking or standing.',
  '123 Main Street', 'Springfield', 'Illinois', '62701'
];

interface UseChatLogicProps {
  veteranData: Partial<VeteranProfile>;
  setVeteranData: (data: Partial<VeteranProfile>) => void;
  onCompleteIntake: () => void;
  isEditMode: boolean;
  onEditComplete?: () => void;
  isDevMode: boolean;
  isPostClaimMode?: boolean;
  onBackToDocumentPreview?: () => void;
  user?: any;
  onStartNewClaim?: () => void;
}

export const useChatLogic = ({
  veteranData,
  setVeteranData,
  onCompleteIntake,
  isEditMode,
  onEditComplete,
  isDevMode,
  isPostClaimMode = false,
  onBackToDocumentPreview,
  user,
  onStartNewClaim
}: UseChatLogicProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isStructuredMode, setIsStructuredMode] = useState(!isEditMode);
  const [isTyping, setIsTyping] = useState(false);

  // Reset chat when starting new claim
  useEffect(() => {
    if (onStartNewClaim && Object.keys(veteranData).length === 0 && !isEditMode && !isPostClaimMode) {
      // Reset to initial state
      setCurrentQuestionIndex(0);
      setIsStructuredMode(true);
      
      // Set initial welcome message
      const welcomeMessage: ChatMessage = {
        id: '1',
        role: 'assistant',
        content: `🇺🇸 <strong>Welcome to Vets4Claims!</strong><br><br>

<a href="https://donorbox.org/donate-to-vets4claims" target="_blank" rel="noopener noreferrer" class="text-cyan-300 hover:text-cyan-100 underline transition-colors duration-200">You can donate to Vets4Claims here</a><br><br>

I'm your dedicated VA Claims Assistant—built by veterans, for veterans—to guide you step-by-step in preparing your disability claim statement.<br><br>

Here's what you can expect during our time together:<br><br>

1. <strong>Craft Your Claim Statement</strong> – We'll assist you in drafting a clear, VA-ready personal statement based on your service history and conditions, in your own words.<br><br>

2. <strong>Gather Supporting Evidence</strong> – later we'll assist you in identifying and organizing medical records, service documents, and buddy letters by offering guidance on what to collect so that you can generate a fully developed claim.<br><br>

3. <strong>Prepare for Exams</strong> – In the future I'll assist you in understanding what to expect in C&P exams by giving tips and explanations so you feel ready.<br><br>

<strong>Stay Informed</strong> – You'll review and approve everything the AI generates before using it.<br><br>

Your information is kept secure and private. We're not a law firm and don't provide legal advice—our role is to assist you by providing guidance and helping you generate the documentation you need for your claim.<br><br>

Let's get started so you can move forward with confidence.<br><br>

<strong>Do you already have a VA disability claim submitted?</strong><br><br>

If yes, just say <strong>"claim submitted"</strong> and I'll take you to our Claims Guide where you can get expert assistance with your existing claim process.<br><br>

If no, I'll guide you through creating a new claim statement`,
        timestamp: new Date(),
        options: ['Claim Submitted', 'Create New Claim']
      };
      setMessages([welcomeMessage]);
    }
  }, [veteranData, isEditMode, isPostClaimMode, onStartNewClaim]);

  // Initialize messages based on mode
  useEffect(() => {
    if (isPostClaimMode) {
      const postClaimWelcomeMessage: ChatMessage = {
        id: '1',
        role: 'assistant',
        content: `**Welcome to your Claims Guidance Assistant!**

Congratulations on completing your VA Form 21-4138 Statement in Support of Claim! You've taken an important step in your disability claims journey.

I'm here to help guide you through the next crucial steps in the VA claims process:

**📋 Immediate Next Steps:**
• **File an Intent to File (ITF)** - Protects your effective date while you gather evidence
• **Submit your signed VA Form 21-4138** - Get your statement officially filed
• **Understand the claims timeline** - Know what to expect and when

**🏥 Preparation & Evidence:**
• **Prepare for C&P exams** - Tips for Compensation & Pension examinations
• **Gather supporting evidence** - Medical records, buddy letters, service records
• **Secondary conditions** - Identify related conditions that may qualify

**📈 Claims Strategy:**
• **VA rating criteria** - Understand how the VA evaluates your condition
• **Appeal processes** - Know your options if the initial decision isn't favorable
• **Effective date strategies** - Maximize your benefits timeline

What would you like to discuss first? You can ask me anything about the VA claims process, deadlines, required documentation, or any concerns you have about moving forward with your claim.`,
        timestamp: new Date()
      };
      setMessages([postClaimWelcomeMessage]);
      setIsStructuredMode(false); // Ensure free-form chat mode
    } else if (isEditMode) {
      const editWelcomeMessage: ChatMessage = {
        id: '1',
        role: 'assistant',
        content: `🇺🇸 **Welcome back, warrior!** 🇺🇸

I'm here to help you update your information. What would you like to change or correct in your VA disability claim details?

You can tell me things like:
• "I need to update my address"
• "My phone number is wrong"
• "I want to add more details about my condition"
• "My service dates are incorrect"

Just let me know what you'd like to fix, and I'll help you update it. When you're finished making changes, just say "I'm finished", "I'm done", or "continue" to return to your claim statement.`,
        timestamp: new Date()
      };
      setMessages([editWelcomeMessage]);
    } else {
      const welcomeMessage: ChatMessage = {
        id: '1',
        role: 'assistant',
        content: `🇺🇸 <strong>Welcome to Vets4Claims!</strong><br><br>

<a href="https://donorbox.org/donate-to-vets4claims" target="_blank" rel="noopener noreferrer" class="text-cyan-300 hover:text-cyan-100 underline transition-colors duration-200">You can donate to Vets4Claims here</a><br><br>

I'm your dedicated VA Claims Assistant—built by veterans, for veterans—to guide you step-by-step in preparing your disability claim statement.<br><br>

Here's what you can expect during our time together:<br><br>

1. <strong>Craft Your Claim Statement</strong> – We'll assist you in drafting a clear, VA-ready personal statement based on your service history and conditions, in your own words.<br><br>

2. <strong>Gather Supporting Evidence</strong> – later we'll assist you in identifying and organizing medical records, service documents, and buddy letters by offering guidance on what to collect so that you can generate a fully developed claim.<br><br>

3. <strong>Prepare for Exams</strong> – In the future I'll assist you in understanding what to expect in C&P exams by giving tips and explanations so you feel ready.<br><br>

<strong>Stay Informed</strong> – You'll review and approve everything the AI generates before using it.<br><br>

Your information is kept secure and private. We're not a law firm and don't provide legal advice—our role is to assist you by providing guidance and helping you generate the documentation you need for your claim.<br><br>

Let's get started so you can move forward with confidence.<br><br>

<strong>Do you already have a VA disability claim submitted?</strong><br><br>

If yes, just say <strong>"claim submitted"</strong> and I'll take you to our Claims Guide where you can get expert assistance with your existing claim process.<br><br>

If no, say <strong>"create new claim"</strong>.`,
        timestamp: new Date(),
        options: ['Claim Submitted', 'Create New Claim']
      };
      setMessages([welcomeMessage]);
    }
  }, [isPostClaimMode, isEditMode]);

  // Auto-answer in dev mode
  useEffect(() => {
    if (isDevMode && isStructuredMode && currentQuestionIndex < STRUCTURED_QUESTIONS.length && messages.length > 0) {
      const timer = setTimeout(() => {
        const demoAnswer = DEMO_ANSWERS[currentQuestionIndex];
        if (demoAnswer) {
          handleSendMessage(demoAnswer);
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isDevMode, isStructuredMode, currentQuestionIndex, messages.length]);

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const setNestedValue = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  };

  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent || '';
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      if (isEditMode) {
        await handleEditModeResponse(userMessage);
      } else if (isStructuredMode && currentQuestionIndex < STRUCTURED_QUESTIONS.length) {
        await handleStructuredResponse(content);
      } else {
        await handleFreeFormResponse(userMessage);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      toast.error('Sorry, I encountered an error. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleEditModeResponse = async (userMessage: ChatMessage) => {
    const conversationHistory = messages.slice(-5).map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    conversationHistory.push({
      role: 'user',
      content: userMessage.content
    });

    const systemContext = {
      role: 'system',
      content: `You are helping a veteran update their VA disability claim information. Help them identify what they want to change and guide them through updating that specific information. 

CRITICAL: When updating addresses, you MUST break down the address into separate components:
- address.street = [street number and name only]
- address.city = [city name]
- address.state = [state name]
- address.zipCode = [zip code]

For example, if user says "My address is 2628 Cedar St., Quincy, IL 62301", respond with:
UPDATE_FIELD: address.street = 2628 Cedar St.
UPDATE_FIELD: address.city = Quincy
UPDATE_FIELD: address.state = Illinois
UPDATE_FIELD: address.zipCode = 62301

NEVER use just "address" as a field name - always use the specific nested fields.
Format your response naturally, but if you're updating data, end your message with one or more update commands:
UPDATE_FIELD: [field_path] = [new_value]

For addresses, use separate fields like:
UPDATE_FIELD: address.street = [street_address]
UPDATE_FIELD: address.city = [city_name]
UPDATE_FIELD: address.state = [state_name]
UPDATE_FIELD: address.zipCode = [zip_code]

For other nested fields, use dot notation like:
UPDATE_FIELD: militaryService.branch = [branch_name]
UPDATE_FIELD: claimInfo.primaryCondition = [condition_description]

Current veteran data for context:
Name: ${veteranData.firstName} ${veteranData.lastName}
Email: ${veteranData.email}
Current Address: ${veteranData.address?.street || 'Not set'}, ${veteranData.address?.city || 'Not set'}, ${veteranData.address?.state || 'Not set'} ${veteranData.address?.zipCode || 'Not set'}`
    };

    const response = await bastionGPT.sendMessage([systemContext, ...conversationHistory]);
    
    // Check for field updates
    const updateMatches = response.match(/UPDATE_FIELD: ([^\s=]+) = (.+)/g);
    if (updateMatches) {
      const updatedData = { ...veteranData };
      
      updateMatches.forEach(match => {
        const [, fieldPath, newValue] = match.match(/UPDATE_FIELD: ([^\s=]+) = (.+)/) || [];
        if (fieldPath && newValue) {
          const cleanValue = newValue.trim();
          
          // Special handling for address fields to ensure proper object structure
          if (fieldPath.startsWith('address.')) {
            if (!updatedData.address) {
              updatedData.address = {
                street: '',
                city: '',
                state: '',
                zipCode: '',
                country: 'USA'
              };
            }
          }
          
          setNestedValue(updatedData, fieldPath, cleanValue);
          
          // Debug logging for address updates
          if (fieldPath.startsWith('address.')) {
            console.log(`Updated ${fieldPath} to:`, cleanValue);
            console.log('Full address object:', updatedData.address);
          }
          
          // Show user-friendly field names in toast
          const fieldDisplayName = getFieldDisplayName(fieldPath);
          toast.success(`Updated ${fieldDisplayName}`);
        }
      });
      
      setVeteranData(updatedData);
      
      const cleanResponse = response.replace(/UPDATE_FIELD: [^\n]+\n?/g, '').trim();
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: cleanResponse + '\n\nIs there anything else you\'d like to update, or are you ready to continue with your claim?',
        timestamp: new Date()
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, assistantMessage]);
      }, 1000);
    } else {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, assistantMessage]);
      }, 1500);
    }

    // Check if user wants to finish editing
    if (userMessage.content.toLowerCase().includes('done') || 
        userMessage.content.toLowerCase().includes('finished') ||
        userMessage.content.toLowerCase().includes('continue') ||
        userMessage.content.toLowerCase().includes('ready')) {
      
      setTimeout(() => {
        const completionMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Perfect! I've updated your information. Let me take you back to your claim statement.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, completionMessage]);
        
        setTimeout(() => {
          if (onEditComplete) {
            onEditComplete();
          }
        }, 2000);
      }, 2000);
    }
  };

  const handleStructuredResponse = async (response: string) => {
    // Check if user wants to go to post-claim chat (existing claim)
    if (currentQuestionIndex === 0 && (
        response.toLowerCase().includes('claim submitted') ||
        response.toLowerCase().includes('already have') ||
        response.toLowerCase().includes('existing claim') ||
        response.toLowerCase().includes('submitted')
    )) {
      const redirectMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Perfect! I'll take you to our Claims Guide where you can get expert assistance with your existing VA disability claim. You can ask me about the claims process, C&P exams, appeals, timelines, and any other questions you have.`,
        timestamp: new Date()
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, redirectMessage]);
        
        // Redirect to post-claim chat after message
        setTimeout(() => {
          // Trigger navigation to post-claim chat
          if (onStartNewClaim) {
            const event = new CustomEvent('navigateToPostClaimChat');
            window.dispatchEvent(event);
          }
        }, 2000);
      }, 1000);
      
      return;
    }
    
    // Check if user wants to start new claim process
    if (currentQuestionIndex === 0 && (
        response.toLowerCase().includes('new claim') ||
        response.toLowerCase().includes('create') ||
        response.toLowerCase().includes('start')
    )) {
      // Start the structured questioning
      setCurrentQuestionIndex(0); // Move to first actual question (firstName)
      
      const startMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Excellent! I'll guide you through creating your VA disability claim statement step by step.<br><br>${STRUCTURED_QUESTIONS[0].question}`,
        timestamp: new Date(),
        options: STRUCTURED_QUESTIONS[0].type === 'options' ? STRUCTURED_QUESTIONS[0].options : undefined
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, startMessage]);
      }, 1000);
      
      return;
    }
    
    const currentQuestion = STRUCTURED_QUESTIONS[currentQuestionIndex];
    
    const isValidResponse = await validateResponseWithAI(response, currentQuestion);
    
    if (!isValidResponse.isValid) {
      const clarificationMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: isValidResponse.feedback,
        timestamp: new Date()
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, clarificationMessage]);
      }, 1000);
      
      return;
    }

    const updatedData = { ...veteranData };
    setNestedValue(updatedData, currentQuestion.key, response);
    setVeteranData(updatedData);

    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex >= STRUCTURED_QUESTIONS.length) {
      setIsStructuredMode(false);
      const completionMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🎉 **Excellent work!** We've gathered all the essential information for your VA disability claim.

Your dedication to providing thorough details will greatly strengthen your claim. Based on our conversation, I can now generate a comprehensive statement that properly documents your service-connected condition and its impact on your daily life.

Would you like me to generate your claim statement now, or do you have any additional information you'd like to discuss?`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, completionMessage]);
      
      const hasRequiredInfo = checkRequiredFields(updatedData);
      if (hasRequiredInfo) {
        // Add user feedback and complete intake immediately
        setTimeout(() => {
          toast.success('Generating your claim statement...');
          onCompleteIntake();
        }, 2000); // Reduced delay for better UX
      }
    } else {
      setCurrentQuestionIndex(nextIndex);
      const nextQuestion = STRUCTURED_QUESTIONS[nextIndex];
      
      const nextMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Thank you for that information. ${nextQuestion.question}`,
        timestamp: new Date(),
        options: nextQuestion.type === 'options' ? nextQuestion.options : undefined
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, nextMessage]);
      }, 1000);
    }
  };

  const getFieldDisplayName = (fieldPath: string): string => {
    const fieldMap: { [key: string]: string } = {
      'firstName': 'first name',
      'lastName': 'last name',
      'middleInitial': 'middle initial',
      'email': 'email address',
      'phone': 'phone number',
      'ssn': 'Social Security Number',
      'dateOfBirth': 'date of birth',
      'address.street': 'street address',
      'address.city': 'city',
      'address.state': 'state',
      'address.zipCode': 'ZIP code',
      'address.apt': 'apartment number',
      'militaryService.branch': 'service branch',
      'militaryService.serviceYears': 'service years',
      'militaryService.rank': 'military rank',
      'claimInfo.primaryCondition': 'primary condition',
      'claimInfo.serviceConnection': 'service connection',
      'claimInfo.symptoms': 'symptoms',
      'claimInfo.medicalTreatment': 'medical treatment',
      'claimInfo.workImpact': 'work impact'
    };
    
    return fieldMap[fieldPath] || fieldPath.split('.').pop() || fieldPath;
  };

  const handleFreeFormResponse = async (userMessage: ChatMessage) => {
    // Check if user wants to go back to document preview in post-claim mode
    if (isPostClaimMode && (
        userMessage.content.toLowerCase().includes('back to document') || 
        userMessage.content.toLowerCase().includes('return to claim') ||
        userMessage.content.toLowerCase().includes('go back'))) {
      
      const backMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I'll take you back to your claim document now.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, backMessage]);
      
      setTimeout(() => {
        if (onBackToDocumentPreview) {
          onBackToDocumentPreview();
        }
      }, 1500);
      return;
    }

    const conversationHistory = messages.slice(-5).map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    conversationHistory.push({
      role: 'user',
      content: userMessage.content
    });

    // Use specialized system prompt for post-claim mode
    const systemPrompt = isPostClaimMode ? {
      role: 'system',
      content: `You are a VA claims expert helping a veteran who has just completed their VA Form 21-4138 Statement in Support of Claim. Provide guidance on:

1. Filing an Intent to File (ITF) to protect their effective date
2. Submitting their signed form to the VA
3. Understanding the claims process timeline
4. Preparing for C&P exams
5. Gathering additional supporting evidence
6. Understanding VA rating criteria
7. Secondary conditions and nexus letters
8. Appeal processes if needed

Be encouraging, professional, and provide actionable advice. Focus on next steps and practical guidance for navigating the VA system.`
    } : null;

    const messagesToSend = systemPrompt 
      ? [systemPrompt, ...conversationHistory]
      : conversationHistory;

    const response = await bastionGPT.sendMessage(messagesToSend);
    
    const assistantMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: response,
      timestamp: new Date()
    };
    
    setTimeout(() => {
      setMessages(prev => [...prev, assistantMessage]);
    }, 1500);
  };

  const validateResponseWithAI = async (response: string, question: any): Promise<{isValid: boolean, feedback: string}> => {
    try {
      // Special validation for firstName and lastName - alphanumeric only
      if (question.key === 'firstName' || question.key === 'lastName') {
        const namePattern = /^[a-zA-Z\s'-]+$/;
        if (!namePattern.test(response.trim())) {
          return {
            isValid: false,
            feedback: `Please enter a valid ${question.key === 'firstName' ? 'first' : 'last'} name using only letters, spaces, hyphens, and apostrophes. ${question.question}`
          };
        }
        if (response.trim().length < 1) {
          return {
            isValid: false,
            feedback: `${question.key === 'firstName' ? 'First' : 'Last'} name cannot be empty. ${question.question}`
          };
        }
      }

      // Special validation for email format
      if (question.key === 'email') {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(response.trim())) {
          return {
            isValid: false,
            feedback: `Please enter a valid email address (for example: john.smith@email.com). ${question.question}`
          };
        }
      }

      // Special validation for SSN format
      if (question.type === 'ssn') {
        const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;
        if (!ssnPattern.test(response.trim())) {
          return {
            isValid: false,
            feedback: `Please enter your Social Security Number in the correct format: XXX-XX-XXXX (for example: 123-45-6789). ${question.question}`
          };
        }
      }

      // Special validation for date format
      if (question.type === 'date') {
        const datePattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
        if (!datePattern.test(response.trim())) {
          return {
            isValid: false,
            feedback: `Please enter your date of birth in MM/DD/YYYY format (for example: 01/15/1985). ${question.question}`
          };
        }
        
        const [month, day, year] = response.trim().split('/').map(Number);
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
          return {
            isValid: false,
            feedback: `Please enter a valid date in MM/DD/YYYY format. ${question.question}`
          };
        }
      }

      return { isValid: true, feedback: '' };
    } catch (error) {
      console.error('Error validating response:', error);
      return { isValid: true, feedback: '' };
    }
  };

  const checkRequiredFields = (data: any): boolean => {
    const requiredFields = [
      'firstName', 'lastName', 'email', 'ssn', 'phone',
      'militaryService.branch', 'militaryService.serviceYears',
      'claimInfo.primaryCondition', 'claimInfo.serviceConnection'
    ];
    
    return requiredFields.every(field => {
      const value = getNestedValue(data, field);
      return value && value.trim().length > 0;
    });
  };

  return {
    messages,
    setMessages,
    currentQuestionIndex,
    isStructuredMode,
    isTyping,
    handleSendMessage,
    STRUCTURED_QUESTIONS
  };
};

export default useChatLogic;
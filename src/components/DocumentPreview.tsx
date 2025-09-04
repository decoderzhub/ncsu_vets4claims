import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { FileText, Download, Send, ExternalLink, Mail, CheckCircle, ArrowLeft, Edit3, Save, X, MessageCircle, User } from 'lucide-react';
import { VeteranProfile, VA214138FormData } from '../types/veteran';
import { bastionGPT } from '../lib/bastionGPT';
import MobileShell from './layout/MobileShell';
import toast from 'react-hot-toast';

interface Props {
  veteranData: VeteranProfile;
  onDocuSealSign: (formData: VA214138FormData) => void;
  isBlurredPreview?: boolean;
  onConfirmValidity?: () => void;
  onGoBackToChat?: () => void;
  showBackToChat?: boolean;
  user?: any;
  onOpenPostClaimChat?: () => void;
  onStatementGenerated?: (statement: string) => void;
  onSaveClaimData?: (data: Partial<VeteranProfile>) => Promise<void>;
  onPromptSignup?: () => void;
}

const DocumentPreview: React.FC<Props> = ({ 
  veteranData, 
  onDocuSealSign, 
  isBlurredPreview = false,
  onConfirmValidity,
  onGoBackToChat,
  showBackToChat = false,
  user,
  onOpenPostClaimChat,
  onStatementGenerated,
  onSaveClaimData,
  onPromptSignup
}) => {
  const [claimStatement, setClaimStatement] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedStatement, setEditedStatement] = useState<string>('');
  const [claimSavedStatus, setClaimSavedStatus] = useState<'saved' | 'unsaved' | 'saving'>('unsaved');

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return;
      
      try {
        const { supabase } = await import('../lib/supabase');
        // Check if user has a Stripe customer record (means they've paid)
        const { data } = await supabase
          .from('stripe_customers')
          .select('customer_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .maybeSingle();
        
        setHasActiveSubscription(!!data?.customer_id);
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };
    
    checkSubscription();
  }, [user]);

  useEffect(() => {
    generateClaimStatement();
  }, [veteranData]);

  const generateClaimStatement = async () => {
    setIsGenerating(true);
    try {
      const statement = await bastionGPT.generateClaimStatement(veteranData);
      setClaimStatement(statement);
      setEditedStatement(statement);
      
      // Check if this statement matches what's already saved
      if (veteranData.claimStatement === statement) {
        setClaimSavedStatus('saved');
      } else {
        setClaimSavedStatus('unsaved');
      }
      
      // Notify parent component that statement was generated
      if (onStatementGenerated) {
        onStatementGenerated(statement);
      }
    } catch (error) {
      console.error('Error generating claim statement:', error);
      toast.error(`Error opening DocuSeal: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const convertToFormData = (): VA214138FormData => {
    // Clean and format SSN
    const ssnClean = veteranData.ssn?.replace(/\D/g, '') || '';
    const ssn1 = ssnClean.substring(0, 3).padEnd(3, '');
    const ssn2 = ssnClean.substring(3, 5).padEnd(2, '');
    const ssn3 = ssnClean.substring(5, 9).padEnd(4, '');
    
    // Clean and format phone number
    const phoneClean = veteranData.phone?.replace(/\D/g, '') || '';
    const phone1 = phoneClean.substring(0, 3).padEnd(3, '');
    const phone2 = phoneClean.substring(3, 6).padEnd(3, '');
    const phone3 = phoneClean.substring(6, 10).padEnd(4, '');
    
    // Parse date of birth from MM/DD/YYYY format
    let dobMonth = '', dobDay = '', dobYear = '';
    if (veteranData.dateOfBirth) {
      const dobParts = veteranData.dateOfBirth.split('/');
      if (dobParts.length === 3) {
        dobMonth = dobParts[0].padStart(2, '0');
        dobDay = dobParts[1].padStart(2, '0');
        dobYear = dobParts[2];
      }
    }
    
    // Format ZIP code
    const zipClean = veteranData.address?.zipCode?.replace(/\D/g, '') || '';
    const zipCode1 = zipClean.substring(0, 5).padEnd(5, '');
    const zipCode2 = zipClean.substring(5, 9);
    
    // Format email for character-by-character fields
    const email = veteranData.email || '';
    const email1 = email.substring(0, 20);
    const email2 = email.length > 20 ? email.substring(20, 40) : '';
    
    // Format country to 2-letter code
    const countryCode = veteranData.address?.country === 'USA' || !veteranData.address?.country ? 'US' : 
                       veteranData.address.country.substring(0, 2).toUpperCase();
    
    // Format ZIP code to first 6 digits only
    const zipFormatted = zipClean.substring(0, 5);
    
    // Format state to 2-letter abbreviation
    const stateAbbr = getStateAbbreviation(veteranData.address?.state || '');

    return {
      FirstName: veteranData.firstName || '',
      MiddleInitial: veteranData.middleInitial || '',
      LastName: veteranData.lastName || '',
      SSN1: ssn1,
      SSN2: ssn2,
      SSN3: ssn3,
      SSN4: ssn1,
      SSN5: ssn2,
      SSN6: ssn3,
      FileNumber: veteranData.fileNumber || '',
      BirthMonth: dobMonth,
      BirthDay: dobDay,
      BirthYear: dobYear,
      VeteransServiceNumber: veteranData.veteransServiceNumber || '',
      Phone1: phone1,
      Phone2: phone2,
      Phone3: phone3,
      Email: email1,
      Email2: email2,
      FullEmail: veteranData.email || '',
      StreetAddress: veteranData.address?.street || '',
      AptNum: veteranData.address?.apt || '',
      City: veteranData.address?.city || '',
      State: stateAbbr,
      Country: countryCode,
      ZipCode1: zipFormatted,
      ZipCode2: '',
      Remarks1: claimStatement.substring(0, 2000),
      Remarks2: claimStatement.length > 2000 ? claimStatement.substring(2000, 4000) : ''
    };
  };

  const getStateAbbreviation = (state: string): string => {
    const stateMap: { [key: string]: string } = {
      'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
      'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
      'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
      'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
      'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
      'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
      'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
      'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
      'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
      'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
      'district of columbia': 'DC', 'puerto rico': 'PR', 'guam': 'GU', 'virgin islands': 'VI'
    };
    
    const normalized = state.toLowerCase().trim();
    
    // If it's already a 2-letter code, return it uppercase
    if (state.length === 2) {
      return state.toUpperCase();
    }
    
    // Look up the abbreviation
    return stateMap[normalized] || state.substring(0, 2).toUpperCase();
  };

  const handleStartEditing = () => {
    setIsEditing(true);
    setEditedStatement(claimStatement);
  };

  const handleSaveEdit = () => {
    setClaimStatement(editedStatement);
    setIsEditing(false);
    setClaimSavedStatus('unsaved'); // Mark as unsaved since statement was edited
    toast.success('Claim statement updated successfully!');
    
    // Notify parent component that statement was updated
    if (onStatementGenerated) {
      onStatementGenerated(editedStatement);
    }
  };

  const handleCancelEdit = () => {
    setEditedStatement(claimStatement);
    setIsEditing(false);
  };

  const handleDocuSealSign = () => {
    const formData = convertToFormData();
    onDocuSealSign(formData);
  };

  const handleSaveClaimToProfile = async () => {
    if (!onSaveClaimData) return;
    
    setClaimSavedStatus('saving');
    
    try {
      const updatedData = {
        ...veteranData,
        claimStatement: claimStatement
      };
      
      await onSaveClaimData(updatedData);
      setClaimSavedStatus('saved');
      toast.success('Claim statement saved to your profile!');
    } catch (error) {
      console.error('Error saving claim to profile:', error);
      setClaimSavedStatus('unsaved');
      toast.error('Failed to save claim statement.');
    }
  };

  // Determine if content should be blurred
  const shouldBlurContent = isBlurredPreview && !hasActiveSubscription;
  const handleEmailClaim = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      
      if (!backendUrl) {
        throw new Error('Backend URL not configured. Please check VITE_BACKEND_URL environment variable.');
      }
      
      // Ensure we have valid data before sending
      const emailData = {
        email: veteranData.email || '',
        name: `${veteranData.firstName || ''} ${veteranData.lastName || ''}`.trim(),
        claim_statement: claimStatement || ''
      };
      
      // Validate required fields
      if (!emailData.email) {
        throw new Error('Email address is required');
      }
      
      if (!emailData.name.trim()) {
        throw new Error('Name is required');
      }
      
      if (!emailData.claim_statement) {
        throw new Error('Claim statement is required');
      }
      
      const response = await fetch(`${backendUrl}/send-claim-email`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (response.ok) {
        setIsEmailSent(true);
        toast.success('Claim statement sent to your email!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    }
  };

  if (isGenerating) {
    return (
      <MobileShell className="bg-gradient-to-br from-blue-50 via-white to-red-50">
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-4 text-lg text-gray-600">Generating your claim statement...</span>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell className="bg-gradient-to-br from-blue-50 via-white to-red-50">
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-red-800 text-white p-6">
        <div className="flex items-center space-x-4">
          <FileText className="h-8 w-8 text-yellow-400" />
          <div>
            <h2 className="text-2xl font-bold">VA Form 21-4138</h2>
            <p className="text-blue-100">
              {isBlurredPreview ? 'Preview - Statement in Support of Claim' : 'Statement in Support of Claim'}
            </p>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="p-6">
        {/* Veteran Information Section - Always visible */}
        <div className="bg-gray-50 border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Veteran Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Name:</span>
              <span className="ml-2">{veteranData.firstName || 'Not provided'} {veteranData.middleInitial || ''} {veteranData.lastName || 'Not provided'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Email:</span>
              <span className="ml-2">{veteranData.email || 'Not provided'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Phone:</span>
              <span className="ml-2">{veteranData.phone || 'Not provided'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Date of Birth:</span>
              <span className="ml-2">{veteranData.dateOfBirth || 'Not provided'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">SSN:</span>
              <span className="ml-2">{veteranData.ssn ? `***-**-${veteranData.ssn.slice(-4)}` : 'Not provided'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Service Branch:</span>
              <span className="ml-2">{veteranData.militaryService?.branch}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Service Years:</span>
              <span className="ml-2">{veteranData.militaryService?.serviceYears}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Rank:</span>
              <span className="ml-2">{veteranData.militaryService?.rank}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Condition Type:</span>
              <span className="ml-2">{veteranData.claimInfo?.conditionType || 'Not specified'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Primary Condition:</span>
              <span className="ml-2">{veteranData.claimInfo?.primaryCondition || 'Not provided'}</span>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium text-gray-700">Address:</span>
              <span className="ml-2">
                {veteranData.address?.street || 'Not provided'}
                {veteranData.address?.apt ? `, Apt ${veteranData.address.apt}` : ''}
                {veteranData.address?.city ? `, ${veteranData.address.city}` : ''}
                {veteranData.address?.state ? `, ${veteranData.address.state}` : ''}
                {veteranData.address?.zipCode ? ` ${veteranData.address.zipCode}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Generated Claim Statement Section */}
        <div className="bg-gray-50 border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Generated Claim Statement</h3>
            {!shouldBlurContent && !isEditing && (
              <button
                onClick={handleStartEditing}
                className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit3 className="h-4 w-4" />
                <span className="text-sm font-medium">Edit Statement</span>
              </button>
            )}
            {isEditing && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span className="text-sm font-medium">Save</span>
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span className="text-sm font-medium">Cancel</span>
                </button>
              </div>
            )}
          </div>
          <div className={`bg-white border rounded-lg p-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 font-mono text-sm leading-relaxed ${
            shouldBlurContent ? 'blur-[4px] select-none relative' : ''
          }`}>
          {shouldBlurContent && (
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-white/40 pointer-events-none z-10 rounded-lg" />
          )}
          <div 
            className={`font-mono text-sm leading-relaxed ${
              shouldBlurContent ? '' : ''
            }`}>
            {isEditing ? (
              <textarea
                value={editedStatement}
                onChange={(e) => setEditedStatement(e.target.value)}
                className="w-full h-96 p-0 border-0 focus:ring-0 focus:outline-none resize-none font-mono text-sm leading-relaxed bg-transparent"
                placeholder="Edit your claim statement here..."
              />
            ) : (
              <div className="prose prose-sm max-w-none leading-relaxed">
                <ReactMarkdown 
                  components={{
                  h1: ({children}) => <h1 className="text-xl font-bold text-gray-900 mb-4">{children}</h1>,
                  h2: ({children}) => <h2 className="text-lg font-semibold text-gray-800 mb-3 mt-6">{children}</h2>,
                  h3: ({children}) => <h3 className="text-base font-semibold text-gray-700 mb-2 mt-4">{children}</h3>,
                  p: ({children}) => <p className="text-gray-700 mb-3 leading-relaxed">{children}</p>,
                  strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                  em: ({children}) => <em className="italic text-gray-700">{children}</em>,
                  ul: ({children}) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                  li: ({children}) => <li className="text-gray-700">{children}</li>,
                  code: ({children}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                  blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4">{children}</blockquote>
                  }}
                >
                  {claimStatement}
                </ReactMarkdown>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Review Section for Blurred Preview */}
        {shouldBlurContent && (
          <div className="mt-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-xl font-semibold text-blue-900 mb-4 text-center">
              Review Your Information
            </h3>
            <p className="text-blue-800 mb-6 text-center">
              We've generated your comprehensive VA disability claim statement based on the information you provided. 
              Please confirm that all the details you shared are accurate before proceeding to payment.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={onConfirmValidity}
                  className="flex items-center justify-center space-x-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  <CheckCircle className="h-5 w-5" />
                  <span>Yes, this information is correct</span>
                </button>

                <button
                  onClick={onGoBackToChat}
                  className="flex items-center justify-center space-x-2 px-6 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>No, I need to make changes</span>
                </button>
            </div>
          </div>
        )}

        {/* Action Buttons - Only show after payment */}
        {!shouldBlurContent && (
          <>
            {/* Back to Chat Button */}
            {showBackToChat && onGoBackToChat && (
              <div className="mt-6">
                <button
                  onClick={onGoBackToChat}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Make Changes to Information</span>
                </button>
                <p className="text-sm text-gray-600 mt-2 text-center">
                  When finished making changes, just say "I'm finished", "I'm done", or "continue" to return to your claim statement.
                </p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              {onOpenPostClaimChat && (
                <button
                  onClick={onOpenPostClaimChat}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>AI Chat Assistant</span>
                </button>
              )}

              <button
                onClick={handleEmailClaim}
                disabled={isEmailSent}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-green-500 disabled:cursor-not-allowed transition-colors"
              >
                <Mail className="h-5 w-5" />
                <span>{isEmailSent ? 'Email Sent!' : 'Email Copy'}</span>
              </button>

              <button
                onClick={handleDocuSealSign}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <ExternalLink className="h-5 w-5" />
                <span>Sign Claim</span>
              </button>

              <button
                onClick={() => {
                  const element = document.createElement('a');
                  const file = new Blob([claimStatement], { type: 'text/plain' });
                  element.href = URL.createObjectURL(file);
                  element.download = `VA-Form-21-4138-${veteranData.lastName}.txt`;
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Download className="h-5 w-5" />
                <span>Download</span>
              </button>
            </div>

            {/* Save to Profile Section */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              {user ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">Save to Your Profile</h4>
                    <p className="text-sm text-gray-600">Keep your claim statement saved to your account for future reference</p>
                  </div>
                  <motion.button
                    onClick={handleSaveClaimToProfile}
                    disabled={claimSavedStatus === 'saving' || claimSavedStatus === 'saved'}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      claimSavedStatus === 'saved' 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    whileHover={{ scale: claimSavedStatus === 'saved' ? 1 : 1.02 }}
                    whileTap={{ scale: claimSavedStatus === 'saved' ? 1 : 0.98 }}
                  >
                    {claimSavedStatus === 'saving' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : claimSavedStatus === 'saved' ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save to Profile</span>
                      </>
                    )}
                  </motion.button>
                </div>
              ) : (
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 mb-2">Save Your Claim Statement</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Create an account to save your claim statement and access it anytime from any device
                  </p>
                  <motion.button
                    onClick={onPromptSignup}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-red-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-red-700 transition-all duration-200 mx-auto"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <User className="h-5 w-5" />
                    <span>Create Account to Save</span>
                  </motion.button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Next Steps */}
        {!shouldBlurContent && (
          <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Next Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Review your claim statement for accuracy</li>
              <li>Sign the document using DocuSeal for legal validity</li>
              <li>Submit your signed form to the VA online or by mail</li>
              <li>Track your claim status at va.gov</li>
            </ol>
          </div>
        )}
      </div>
        </div>
      </div>
    </MobileShell>
  );
};

export default DocumentPreview;
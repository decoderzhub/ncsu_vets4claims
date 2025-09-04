import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { VeteranProfile, VA214138FormData } from './types/veteran';
import { saveVeteranProfile, updatePaymentStatus, supabase } from './lib/supabase';
import ChatInterface from './components/ChatInterface';
import DocumentPreview from './components/DocumentPreview';
import DocusealForm from './components/DocusealForm';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import SubscriptionPage from './components/SubscriptionPage';
import SuccessPage from './components/SuccessPage';
import toast from 'react-hot-toast';

enum AppState {
  CHAT = 'CHAT',
  EDIT_MODE = 'EDIT_MODE',
  POST_CLAIM_CHAT = 'POST_CLAIM_CHAT',
  CLAIM_REVIEW = 'CLAIM_REVIEW',
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_SIGNUP = 'AUTH_SIGNUP',
  SUBSCRIPTION = 'SUBSCRIPTION',
  SUCCESS = 'SUCCESS',
  DOCUMENT_PREVIEW = 'DOCUMENT_PREVIEW',
  DOCUMENT_SIGNING = 'DOCUMENT_SIGNING'
}

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.CHAT);
  const [veteranData, setVeteranData] = useState<Partial<VeteranProfile>>({});
  const [user, setUser] = useState<any>(null);
  const [signingData, setSigningData] = useState<{submissionSlug: string, claimId: string} | null>(null);
  const [documentKey, setDocumentKey] = useState(0);

  const handleNavigateToPostClaimChat = () => {
    setAppState(AppState.POST_CLAIM_CHAT);
  };

  const handleStartNewClaim = () => {
    // Reset all state to initial values
    setVeteranData({});
    setSigningData(null);
    setAppState(AppState.CHAT);
    
    // Clear localStorage
    localStorage.removeItem('veteranData');
    setDocumentKey(prev => prev + 1);
  };

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };

    checkAuth();

    window.addEventListener('navigateToPostClaimChat', handleNavigateToPostClaimChat);
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        // After login/signup, check subscription status
        checkSubscriptionAndProceed(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      window.removeEventListener('navigateToPostClaimChat', handleNavigateToPostClaimChat);
      subscription.unsubscribe();
    };
  }, []);

  // Check subscription status and proceed accordingly
  const checkSubscriptionAndProceed = async (currentUser: any) => {
    try {
      // After login/signup, ensure the veteran profile is linked to the auth user
      if (veteranData.email && currentUser?.id) {
        try {
          await saveVeteranProfileData(veteranData);
          console.log('Veteran profile linked to authenticated user');
        } catch (error) {
          console.error('Error linking veteran profile to user:', error);
        }
      }
      
      // Check if user has a Stripe customer record (means they've paid)
      const { data: customer } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', currentUser.id)
        .is('deleted_at', null)
        .maybeSingle();
      
      if (customer?.customer_id) {
        // User has paid (has Stripe customer record), go to document preview
        setAppState(AppState.DOCUMENT_PREVIEW);
      } else {
        // User hasn't paid yet, go to subscription page
        setAppState(AppState.SUBSCRIPTION);
      }
      saveVeteranProfileData(veteranData);
    } catch (error) {
      console.error('Error checking subscription:', error);
      // On error, default to subscription page
      setAppState(AppState.SUBSCRIPTION);
    }
  };

  // Save data to localStorage whenever it changes
  // Load veteran data from backend when user is authenticated
  useEffect(() => {
    const loadVeteranData = async () => {
      if (user?.email) {
        try {
          const { getVeteranProfile } = await import('./lib/supabase');
          const profile = await getVeteranProfile(user.email);
          
          if (profile) {
            // Convert backend profile format to frontend format
            const frontendData: Partial<VeteranProfile> = {
              email: profile.email,
              firstName: profile.first_name,
              middleInitial: profile.middle_initial,
              lastName: profile.last_name,
              ssn: profile.ssn, // Already decrypted by backend
              phone: profile.phone,
              dateOfBirth: profile.date_of_birth,
              fileNumber: profile.file_number,
              veteransServiceNumber: profile.veterans_service_number,
              militaryService: profile.military_service,
              claimInfo: profile.claim_info,
              address: profile.address,
              claimStatement: profile.claim_statement,
              hasSignedUp: profile.has_signed_up,
              hasPaid: profile.has_paid
            };
            
            setVeteranData(frontendData);
            console.log('Veteran data loaded from backend');
          }
        } catch (error) {
          console.error('Error loading veteran data:', error);
          // Don't show error to user as this is background loading
        }
      }
    };

    loadVeteranData();
  }, [user]);
  // Handle URL parameters for success page
  useEffect(() => {
    if (window.location.pathname.includes('/success')) {
      setAppState(AppState.SUCCESS);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleCompleteIntake = () => {
    // Save veteran profile data when intake is completed
    saveVeteranProfileData(veteranData);
    
    // Determine next state based on user authentication and subscription
    if (!user) {
      // User not logged in - show blurred preview
      setAppState(AppState.CLAIM_REVIEW);
    } else {
      // User is logged in - check subscription status
      checkSubscriptionAndProceed(user);
    }
  };

  const saveVeteranProfileData = async (dataToSave = veteranData) => {
    try {
      // Only save if we have sufficient data
      if (!dataToSave.email || !dataToSave.firstName || !dataToSave.lastName) {
        console.log('Insufficient data to save veteran profile - missing required fields');
        toast.error('Cannot save profile: Missing required information (email, first name, or last name)');
        return;
      }

      const profileData = {
        email: dataToSave.email || '',
        first_name: dataToSave.firstName || '',
        middle_initial: dataToSave.middleInitial || '',
        last_name: dataToSave.lastName || '',
        ssn: dataToSave.ssn || '', // Send raw SSN, backend will encrypt it
        phone: dataToSave.phone || '',
        date_of_birth: dataToSave.dateOfBirth || null,
        file_number: dataToSave.fileNumber || '',
        veterans_service_number: dataToSave.veteransServiceNumber || '',
        military_service: {
          branch: dataToSave.militaryService?.branch || '',
          serviceYears: dataToSave.militaryService?.serviceYears || '',
          rank: dataToSave.militaryService?.rank || '',
          dischargeType: dataToSave.militaryService?.dischargeType || ''
        },
        claim_info: {
          primaryCondition: dataToSave.claimInfo?.primaryCondition || '',
          conditionType: dataToSave.claimInfo?.conditionType || '',
          serviceConnection: dataToSave.claimInfo?.serviceConnection || '',
          symptoms: dataToSave.claimInfo?.symptoms || '',
          medicalTreatment: dataToSave.claimInfo?.medicalTreatment || '',
          workImpact: dataToSave.claimInfo?.workImpact || '',
          witnesses: dataToSave.claimInfo?.witnesses || '',
          additionalInfo: dataToSave.claimInfo?.additionalInfo || ''
        },
        address: {
          street: dataToSave.address?.street || '',
          apt: dataToSave.address?.apt || '',
          city: dataToSave.address?.city || '',
          state: dataToSave.address?.state || '',
          zipCode: dataToSave.address?.zipCode || '',
          country: dataToSave.address?.country || 'USA'
        },
        claim_statement: dataToSave.claimStatement || null,
        has_signed_up: !!user,
        has_paid: false
      };

      await saveVeteranProfile(profileData);
      console.log('Veteran profile saved successfully');
    } catch (error) {
      console.error('Error saving veteran profile:', error);
      toast.error('Failed to save your information to the database. Please try again.');
      throw error; // Re-throw so calling functions can handle it
    }
  };

  const handleGoBackToChat = () => {
    setAppState(AppState.EDIT_MODE);
  };

  const handleStatementGenerated = (statement: string) => {
    const updatedData = { ...veteranData, claimStatement: statement };
    setVeteranData(updatedData);
    
    // Save the updated data with the statement to the database
    saveVeteranProfileData(updatedData);
  };

  const handleEditComplete = () => {
    // Save updated data when editing is complete
    handleEditCompleteAsync();
  };

  const handleEditCompleteAsync = async () => {
    try {
      // Save updated data when editing is complete
      await saveVeteranProfileData(veteranData);
      toast.success('Your information has been saved successfully!');
    } catch (error) {
      console.error('Error saving data after edit:', error);
      toast.error('Failed to save your changes. Please try again.');
      return; // Don't proceed if save failed
    }
    
    setDocumentKey(prev => prev + 1);
    // Return to appropriate state based on subscription status
    if (user) {
      // User is logged in, check if they have active subscription
      checkSubscriptionAndProceed(user);
    } else {
      // User not logged in, go to claim review (blurred preview)
      setAppState(AppState.CLAIM_REVIEW);
    }
  };

  const handleLogin = () => {
    // After login, check subscription status
    if (user) {
      checkSubscriptionAndProceed(user);
    }
  };

  const handleSignup = () => {
    // After signup, go to subscription page
    setAppState(AppState.SUBSCRIPTION);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    // Reset to initial chat state after logout
    setVeteranData({});
    setSigningData(null);
    setAppState(AppState.CHAT);
    setDocumentKey(prev => prev + 1);
    
    // Clear localStorage
    localStorage.removeItem('veteranData');
    
    toast.success('Logged out successfully');
  };

  const handleSubscriptionActive = () => {
    // Save veteran profile data when subscription becomes active
    saveVeteranProfileData();
    setAppState(AppState.DOCUMENT_PREVIEW);
  };

  const handleSuccessComplete = () => {
    // Save veteran profile data on success page completion
    saveVeteranProfileData(veteranData);
    setDocumentKey(prev => prev + 1);
    setAppState(AppState.DOCUMENT_PREVIEW);
  };

  const handleProceedToPayment = () => {
    if (user) {
      // User is logged in, check subscription
      checkSubscriptionAndProceed(user);
    } else {
      // User needs to sign up first
      setAppState(AppState.AUTH_SIGNUP);
    }
  };

  const handleConfirmValidity = async () => {
    // If user is not logged in, require signup before payment
    if (!user) {
      toast.error('Please sign up to proceed with payment');
      setAppState(AppState.AUTH_SIGNUP);
      return;
    }

    try {
      // Save veteran profile to database
      const profileData = {
        email: veteranData.email || '',
        first_name: veteranData.firstName || '',
        middle_initial: veteranData.middleInitial || '',
        last_name: veteranData.lastName || '',
        ssn_encrypted: veteranData.ssn || '',
        phone: veteranData.phone || '',
        date_of_birth: veteranData.dateOfBirth || null,
        file_number: veteranData.fileNumber || '',
        veterans_service_number: veteranData.veteransServiceNumber || '',
        military_service: {
          branch: veteranData.militaryService?.branch || '',
          serviceYears: veteranData.militaryService?.serviceYears || '',
          rank: veteranData.militaryService?.rank || '',
          dischargeType: veteranData.militaryService?.dischargeType || ''
        },
        claim_info: {
          primaryCondition: veteranData.claimInfo?.primaryCondition || '',
          conditionType: veteranData.claimInfo?.conditionType || '',
          serviceConnection: veteranData.claimInfo?.serviceConnection || '',
          symptoms: veteranData.claimInfo?.symptoms || '',
          medicalTreatment: veteranData.claimInfo?.medicalTreatment || '',
          workImpact: veteranData.claimInfo?.workImpact || '',
          witnesses: veteranData.claimInfo?.witnesses || '',
          additionalInfo: veteranData.claimInfo?.additionalInfo || ''
        },
        address: {
          street: veteranData.address?.street || '',
          apt: veteranData.address?.apt || '',
          city: veteranData.address?.city || '',
          state: veteranData.address?.state || '',
          zipCode: veteranData.address?.zipCode || '',
          country: veteranData.address?.country || 'USA'
        },
        claim_statement: veteranData.claimStatement || null,
        has_signed_up: true,
        has_paid: false
      };

      await saveVeteranProfile(profileData);
      
      // Check subscription status
      checkSubscriptionAndProceed(user);
      
      toast.success('Information saved! Proceeding to payment...');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Error saving claim information. Please try again.');
    }
  };

  const handleDocuSealSign = async (formData: VA214138FormData) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      
      if (!backendUrl) {
        throw new Error('Backend URL not configured. Please check VITE_BACKEND_URL environment variable.');
      }

      const response = await fetch(`${backendUrl}/docuseal-submission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.submissionSlug && result.claimId) {
          setSigningData({
            submissionSlug: result.submissionSlug,
            claimId: result.claimId
          });
          setAppState(AppState.DOCUMENT_SIGNING);
          toast.success('Document ready for signing');
        } else {
          throw new Error('No submission data received');
        }
      } else {
        const errorData = await response.json();
        
        // Check for validation errors (missing fields)
        if (errorData.details && (
          errorData.details.includes('email') || 
          errorData.details.includes('required') ||
          errorData.details.includes('field') ||
          errorData.details.includes('missing')
        )) {
          toast.error('Please ensure all required fields are filled out before signing');
        } else {
          throw new Error(errorData.error || 'Failed to create DocuSeal submission');
        }
      }
    } catch (error) {
      console.error('DocuSeal error:', error);
      if (!error.message.includes('Please ensure all required fields')) {
        toast.error(`Error opening DocuSeal: ${error.message}`);
      }
    }
  };

  const handleSigningComplete = () => {
    toast.success('Document signed successfully!');
    setAppState(AppState.DOCUMENT_PREVIEW);
  };

  const handleFinishLater = () => {
    toast('You can complete signing later from your email');
    setAppState(AppState.DOCUMENT_PREVIEW);
  };

  const handleOpenPostClaimChat = () => {
    setAppState(AppState.POST_CLAIM_CHAT);
  };

  const handleBackToDocumentPreview = () => {
    setAppState(AppState.DOCUMENT_PREVIEW);
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden">
      <AnimatePresence mode="wait">
        {appState === AppState.CHAT && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <ChatInterface
              veteranData={veteranData}
              setVeteranData={setVeteranData}
              onCompleteIntake={handleCompleteIntake}
              user={user}
              onLogin={() => setAppState(AppState.AUTH_LOGIN)}
              onSignup={() => setAppState(AppState.AUTH_SIGNUP)}
              onLogout={handleLogout}
              onStartNewClaim={handleStartNewClaim}
            />
          </motion.div>
        )}

        {appState === AppState.EDIT_MODE && (
          <motion.div
            key="edit-mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <ChatInterface
              veteranData={veteranData}
              setVeteranData={setVeteranData}
              onCompleteIntake={handleCompleteIntake}
              isEditMode={true}
              onEditComplete={handleEditComplete}
              user={user}
              onLogin={() => setAppState(AppState.AUTH_LOGIN)}
              onSignup={() => setAppState(AppState.AUTH_SIGNUP)}
              onLogout={handleLogout}
              onStartNewClaim={handleStartNewClaim}
            />
          </motion.div>
        )}

        {appState === AppState.CLAIM_REVIEW && (
          <motion.div
            key="claim-review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <DocumentPreview
              key={`claim-review-${documentKey}`}
              veteranData={veteranData as VeteranProfile}
              onDocuSealSign={handleDocuSealSign}
              isBlurredPreview={true}
              onConfirmValidity={handleConfirmValidity}
              onGoBackToChat={handleGoBackToChat}
              user={user}
              onSaveClaimData={saveVeteranProfileData}
              onPromptSignup={() => setAppState(AppState.AUTH_SIGNUP)}
            />
          </motion.div>
        )}

        {appState === AppState.AUTH_LOGIN && (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoginPage
              onLogin={handleLogin}
              onSwitchToSignup={() => setAppState(AppState.AUTH_SIGNUP)}
              onBackToChat={() => setAppState(AppState.CHAT)}
            />
          </motion.div>
        )}

        {appState === AppState.AUTH_SIGNUP && (
          <motion.div
            key="signup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SignupPage
              onSignup={handleSignup}
              onSwitchToLogin={() => setAppState(AppState.AUTH_LOGIN)}
              onBackToChat={() => setAppState(AppState.CHAT)}
            />
          </motion.div>
        )}

        {appState === AppState.SUBSCRIPTION && (
          <motion.div
            key="subscription"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SubscriptionPage
              user={user}
              onLogout={handleLogout}
              onSubscriptionActive={handleSubscriptionActive}
            />
          </motion.div>
        )}

        {appState === AppState.SUCCESS && (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SuccessPage onContinue={handleSuccessComplete} />
          </motion.div>
        )}

        {appState === AppState.DOCUMENT_PREVIEW && (
          <motion.div
            key={`document-preview-${documentKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <DocumentPreview
              key={`document-preview-content-${documentKey}-${JSON.stringify(veteranData.address)}`}
              veteranData={veteranData as VeteranProfile}
              onDocuSealSign={handleDocuSealSign}
              isBlurredPreview={false}
              showBackToChat={true}
              onGoBackToChat={() => setAppState(AppState.EDIT_MODE)}
              user={user}
              onOpenPostClaimChat={handleOpenPostClaimChat}
              onSaveClaimData={saveVeteranProfileData}
              onPromptSignup={() => setAppState(AppState.AUTH_SIGNUP)}
            />
          </motion.div>
        )}

        {appState === AppState.POST_CLAIM_CHAT && (
          <motion.div
            key="post-claim-chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <ChatInterface
              veteranData={veteranData}
              setVeteranData={setVeteranData}
              onCompleteIntake={() => {}} // Not used in post-claim mode
              isPostClaimMode={true}
              onBackToDocumentPreview={handleBackToDocumentPreview}
              user={user}
              onLogin={() => setAppState(AppState.AUTH_LOGIN)}
              onSignup={() => setAppState(AppState.AUTH_SIGNUP)}
              onLogout={handleLogout}
              onStartNewClaim={handleStartNewClaim}
            />
          </motion.div>
        )}

        {appState === AppState.DOCUMENT_SIGNING && signingData && (
          <motion.div
            key="signing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50"
          >
            <div className="max-w-4xl mx-auto p-6">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 to-red-800 text-white p-6">
                  <h1 className="text-2xl font-bold">Sign Your VA Claim</h1>
                  <p className="text-blue-100">Please review and sign your claim document to complete the submission.</p>
                </div>

                {/* Signing Interface */}
                <div className="p-6">
                  <div className="text-center space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3">Ready to Sign</h3>
                      <p className="text-blue-800 mb-4">
                        Your VA Form 21-4138 has been prepared and is ready for your signature. 
                        Click the button below to open the secure DocuSeal signing interface.
                      </p>
                      <motion.button
                        onClick={() => {
                          const signingUrl = `https://docuseal.com/s/${signingData.submissionSlug}`;
                          window.open(signingUrl, '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes');
                          toast.success('Signing window opened. Complete your signature and return here.');
                        }}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-red-600 text-white font-bold rounded-lg shadow-lg hover:from-blue-700 hover:to-red-700 transition-all duration-200"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Open Signing Document
                      </motion.button>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 text-sm">
                        <strong>Note:</strong> After signing, you can close the DocuSeal window and return here. 
                        Your signed document will be automatically processed.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <motion.button
                      onClick={handleSigningComplete}
                      className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span>I've Completed Signing</span>
                    </motion.button>
                    
                    <button
                      onClick={handleFinishLater}
                      className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <span>Complete Later</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e3a8a',
            color: '#fff',
            fontWeight: 'bold'
          }
        }}
      />
    </div>
  );
}

export default App;
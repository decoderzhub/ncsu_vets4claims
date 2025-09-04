import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

// Database functions
export const saveVeteranProfile = async (profile: any) => {
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    
    if (!backendUrl) {
      throw new Error('Backend URL not configured. Please check VITE_BACKEND_URL environment variable.');
    }
    
    // Get current session to include auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Include auth token if available
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    const response = await fetch(`${backendUrl}/veteran-profiles`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to save veteran profile');
    }

    const result = await response.json();
    return result.profile;
  } catch (error) {
    console.error('Error saving veteran profile:', error);
    throw error;
  }
};
export const getVeteranProfile = async (email: string) => {
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    
    if (!backendUrl) {
      throw new Error('Backend URL not configured. Please check VITE_BACKEND_URL environment variable.');
    }
    
    const response = await fetch(`${backendUrl}/veteran-profiles/${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null; // Profile not found
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch veteran profile');
    }
    
    const result = await response.json();
    return result.profile;
  } catch (error) {
    console.error('Error fetching veteran profile:', error);
    throw error;
  }
    }
export const updatePaymentStatus = async (email: string, hasPaid: boolean) => {
  try {
    // Get current profile first
    const currentProfile = await getVeteranProfile(email);
    if (!currentProfile) {
      throw new Error('Veteran profile not found');
    }

    // Update payment status
    const updatedProfile = {
      ...currentProfile,
      has_paid: hasPaid
    };
    return await saveVeteranProfile(updatedProfile);
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
};
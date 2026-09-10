import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  fetchProfile,
  upsertProfile,
  formatAuthError,
} from '../lib/supabase';
import { UserProfile, UserRole, OnboardingData } from '../types';

interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  isDemoMode: boolean;
  demoRole: UserRole;
  onboardingPending: boolean;
  signUp: (params: SignUpParams) => Promise<{
    success: boolean;
    requiresVerification?: boolean;
    message?: string;
    error?: string;
  }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  completeOnboarding: (data: OnboardingData) => Promise<{ success: boolean; error?: string }>;
  enterDemoMode: (role?: UserRole) => void;
  exitDemoMode: () => void;
  dismissOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default demo profile for offline/preview mode
const DEMO_FAMILY_PROFILE: UserProfile = {
  id: 'demo-profile-caregiver',
  user_id: 'demo-user-id-caregiver',
  full_name: 'Rahul (Demo Caregiver)',
  email: 'rahul.demo@eldercare.ai',
  phone: '+91 98765 43210',
  role: 'family',
  language: 'auto',
  created_at: new Date().toISOString(),
};

const DEMO_ELDERLY_PROFILE: UserProfile = {
  id: 'demo-profile-elderly',
  user_id: 'demo-user-id-elderly',
  full_name: 'Sharma ji (Demo Senior)',
  email: 'sharmaji.demo@eldercare.ai',
  phone: '+91 98110 43210',
  role: 'elderly',
  language: 'hinglish',
  created_at: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoRole, setDemoRole] = useState<UserRole>('family');
  const [onboardingPending, setOnboardingPending] = useState<boolean>(false);

  // Initialize session and listen to Supabase Auth state changes
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function initializeAuth() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.auth.getSession();
        console.log("SESSION_RESULT", {
          userId: data?.session?.user?.id ?? null,
          email: data?.session?.user?.email ?? null,
          error: error?.message ?? null
        });

        if (isMounted) {
          if (data?.session) {
            setSession(data.session);
            setUser(data.session.user);
            await loadProfile(data.session.user.id, data.session.user);
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        }
      } catch (err: any) {
        console.log("SESSION_RESULT", {
          userId: null,
          email: null,
          error: err?.message ?? 'Initialization failed'
        });
        if (isMounted) setLoading(false);
      }
    }

    initializeAuth();

    // Listen to auth events (SIGNED_IN, SIGNED_OUT, PASSWORD_RECOVERY, TOKEN_REFRESHED)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        console.log("SESSION_RESULT", {
          event,
          userId: newSession?.user?.id ?? null,
          email: newSession?.user?.email ?? null,
          error: null
        });

        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
          await loadProfile(newSession.user.id, newSession.user);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Helper to load or construct profile from public.profiles table
  const loadProfile = async (userId: string, authUser?: User) => {
    if (!userId) return;

    const metaFullName =
      authUser?.user_metadata?.full_name ||
      authUser?.user_metadata?.name ||
      authUser?.user_metadata?.fullName ||
      authUser?.email?.split('@')[0] ||
      '';
    const metaPhone = authUser?.user_metadata?.phone || undefined;
    const metaRole = (authUser?.user_metadata?.role as UserRole) || 'family';

    // 1. Fetch from public.profiles table
    const p = await fetchProfile(userId);
    if (p && p.full_name && p.full_name.trim() !== '' && p.full_name !== 'Family Member') {
      setProfile({
        ...p,
        email: p.email || authUser?.email || '',
      });
      return;
    }

    // 2. If row not found in profiles or full_name is empty, attempt to insert/upsert row into profiles table
    // (Now that user is authenticated, RLS permits inserting own row)
    const resolvedFullName = (p && p.full_name && p.full_name !== 'Family Member') ? p.full_name : metaFullName || 'Caregiver';
    const upsertRes = await upsertProfile({
      id: userId,
      user_id: userId,
      full_name: resolvedFullName,
      email: authUser?.email || '',
      phone: (p && p.phone) || metaPhone,
      role: (p && p.role) || metaRole,
    });

    if (upsertRes.data) {
      setProfile(upsertRes.data);
    } else {
      setProfile({
        id: userId,
        user_id: userId,
        full_name: resolvedFullName,
        email: authUser?.email || '',
        phone: metaPhone,
        role: metaRole,
        language: 'auto',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  };

  // 1. Sign Up with Email + Password via Supabase Auth signUp()
  const signUp = async (params: SignUpParams): Promise<{
    success: boolean;
    requiresVerification?: boolean;
    message?: string;
    error?: string;
  }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        error: 'Supabase authentication is not configured yet. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    try {
      setLoading(true);
      console.log('Supabase signup started');
      const { data, error } = await supabase.auth.signUp({
        email: params.email.trim().toLowerCase(),
        password: params.password,
        options: {
          data: {
            full_name: params.fullName.trim(),
            phone: params.phone?.trim() || null,
          },
        },
      });

      console.log('Supabase signup response received', {
        success: !error && Boolean(data?.user),
        userId: data?.user?.id,
        error: error?.message,
      });

      if (error) {
        setLoading(false);
        return { success: false, error: formatAuthError(error) };
      }

      if (!data?.user) {
        setLoading(false);
        return {
          success: false,
          error: 'No user was created by authentication server. Please try again.',
        };
      }

      // If user identities array is empty, this email is already registered in Supabase
      if (data.user.identities && data.user.identities.length === 0) {
        setLoading(false);
        return {
          success: false,
          error: 'This email is already registered. Please sign in instead.',
        };
      }

      // If session exists immediately (email confirmation disabled or auto-confirmed)
      if (data.session) {
        setIsDemoMode(false);
        setSession(data.session);
        setUser(data.user);

        // Attempt profile creation with id = data.user.id in public.profiles
        try {
          await upsertProfile({
            id: data.user.id,
            user_id: data.user.id,
            full_name: params.fullName.trim(),
            email: params.email.trim().toLowerCase(),
            phone: params.phone?.trim() || undefined,
            role: params.role || 'caregiver',
          });
        } catch (profileErr) {
          console.warn('Profile creation during signup notice:', profileErr);
        }

        await loadProfile(data.user.id, data.user);

        setLoading(false);
        return {
          success: true,
          requiresVerification: false,
          message: 'Account created successfully! Welcome to ElderCare AI.',
        };
      }

      // Supabase requires email verification (data.user exists, but data.session is null)
      setLoading(false);
      return {
        success: true,
        requiresVerification: true,
        message: 'Account created successfully. Please verify your email before logging in.',
      };
    } catch (err: any) {
      console.log('Supabase signup response received', {
        success: false,
        error: err?.message || 'Signup failed',
      });
      setLoading(false);
      return { success: false, error: formatAuthError(err) };
    }
  };

  // 2. Sign In with Email + Password via Supabase Auth signInWithPassword()
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        error: 'Supabase authentication is not configured yet. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    try {
      setLoading(true);
      console.log('Supabase login started');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      console.log('Supabase login response received', {
        success: !error && Boolean(data?.user),
        userId: data?.user?.id,
        error: error?.message,
      });

      if (error) {
        setLoading(false);
        return { success: false, error: formatAuthError(error) };
      }

      if (data.session && data.user) {
        setIsDemoMode(false);
        setSession(data.session);
        setUser(data.user);
        // Fetch the logged-in user profile from Supabase profiles table
        await loadProfile(data.user.id, data.user);
      }

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      console.log('Supabase login response received', {
        success: false,
        error: err?.message || 'Login failed',
      });
      setLoading(false);
      return { success: false, error: formatAuthError(err) };
    }
  };

  // 3. Sign Out
  const signOut = async () => {
    try {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsDemoMode(false);
      setOnboardingPending(false);
      setLoading(false);
    }
  };

  // 4. Forgot Password - Reset Password Link
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        error: 'Supabase authentication is not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.',
      };
    }

    try {
      const redirectUrl = window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectUrl}/#reset-password`,
      });

      if (error) {
        return { success: false, error: formatAuthError(error) };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatAuthError(err) };
    }
  };

  // 5. Update Password
  const updatePassword = async (password: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        return { success: false, error: formatAuthError(error) };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: formatAuthError(err) };
    }
  };

  // 6. Update Profile
  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    if (isDemoMode) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      return { success: true };
    }

    if (!user) return { success: false, error: 'User is not logged in' };

    const res = await upsertProfile({
      ...profile,
      ...updates,
      user_id: user.id,
    });

    if (res.error) {
      return { success: false, error: res.error };
    }

    if (res.data) {
      setProfile(res.data);
    }
    return { success: true };
  };

  // 7. Complete Onboarding Flow
  const completeOnboarding = async (data: OnboardingData): Promise<{ success: boolean; error?: string }> => {
    setOnboardingPending(false);
    return updateProfile({
      full_name: data.fullName,
      language: data.language,
    });
  };

  // 8. Demo Mode handling
  const enterDemoMode = (role: UserRole = 'family') => {
    setIsDemoMode(true);
    setDemoRole(role);
    setProfile(role === 'family' ? DEMO_FAMILY_PROFILE : DEMO_ELDERLY_PROFILE);
    setOnboardingPending(false);
  };

  const exitDemoMode = () => {
    setIsDemoMode(false);
    setProfile(null);
  };

  const dismissOnboarding = () => {
    setOnboardingPending(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isConfigured: isSupabaseConfigured,
        isDemoMode,
        demoRole,
        onboardingPending,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        completeOnboarding,
        enterDemoMode,
        exitDemoMode,
        dismissOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

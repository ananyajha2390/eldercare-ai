import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, UserRole } from '../types';

// Environment variables exactly matching VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

/**
 * Validates whether Supabase environment variables are provided and not default templates.
 */
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey.trim() !== '' &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key')
);

/**
 * Supabase client initialized directly from VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Format raw Supabase authentication errors into friendly, professional guidance.
 */
export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const message = (typeof error === 'string' ? error : error.message || error.error_description || String(error)).toLowerCase();

  if (message.includes('invalid login credentials') || message.includes('invalid credentials') || message.includes('wrong password')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (message.includes('user already registered') || message.includes('already exists') || message.includes('user already exists')) {
    return 'This email is already registered. Please sign in instead.';
  }
  if (message.includes('email not confirmed') || message.includes('not verified') || message.includes('unconfirmed')) {
    return 'Please verify your email address before logging in. Check your inbox for the confirmation link.';
  }
  if (message.includes('invalid email') || message.includes('valid email') || message.includes('email format') || message.includes('unable to validate email')) {
    return 'Please enter a valid email address.';
  }
  if (message.includes('password should be') || message.includes('weak password') || message.includes('at least 6 characters') || message.includes('password is too short')) {
    return 'Password must be at least 6 characters long.';
  }
  if (message.includes('rate limit') || message.includes('too many requests') || message.includes('over_email_send_rate_limit')) {
    return 'Email rate limit reached. Please wait a moment before trying again.';
  }
  if (message.includes('failed to fetch') || message.includes('network') || message.includes('unavailable') || message.includes('timeout')) {
    return 'Unable to connect to the authentication server. Please check your internet connection and try again.';
  }

  // Fallback to error message or clean description
  return (error && error.message) || 'Authentication error. Please try again.';
}

/**
 * Fetch a user profile by authenticated user_id from public.profiles.
 * The primary key in profiles is `id` which references auth.users(id).
 */
export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !supabase || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching Supabase profile:', error.message);
      return null;
    }
    if (!data) return null;

    return {
      id: data.id,
      user_id: data.id,
      full_name: data.full_name || '',
      email: data.email || '',
      phone: data.phone || undefined,
      role: (data.role as UserRole) || 'family',
      language: data.language || 'auto',
      avatar_url: data.avatar_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (err) {
    console.error('Exception fetching profile:', err);
    return null;
  }
}

/**
 * Upsert user profile in public.profiles.
 * Works with the public.profiles schema (id, full_name, phone, role, created_at, updated_at).
 */
export async function upsertProfile(
  profile: Partial<UserProfile> & { id?: string; user_id?: string }
): Promise<{ data: UserProfile | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase is not configured yet.' };
  }

  const userId = profile.id || profile.user_id;
  if (!userId) {
    return { data: null, error: 'User ID is required to save profile.' };
  }

  const payload: Record<string, any> = {
    id: userId,
    full_name: profile.full_name || 'Caregiver',
    phone: profile.phone || null,
    role: profile.role || 'caregiver',
    updated_at: new Date().toISOString(),
  };

  try {
    const res = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .maybeSingle();

    if (res.error) {
      console.warn('Supabase profile upsert warning:', res.error.message);
      return { data: null, error: formatAuthError(res.error) };
    }

    const row = res.data || payload;
    const formatted: UserProfile = {
      id: row.id,
      user_id: row.id,
      full_name: row.full_name || profile.full_name || 'Caregiver',
      email: row.email || profile.email || '',
      phone: row.phone || profile.phone || undefined,
      role: (row.role as UserRole) || (profile.role as UserRole) || 'family',
      language: profile.language || 'auto',
      avatar_url: row.avatar_url || profile.avatar_url,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    };

    return { data: formatted, error: null };
  } catch (err: any) {
    console.error('Exception saving profile:', err);
    return { data: null, error: err.message || 'Failed to update profile.' };
  }
}

/**
 * Insert a care relationship between a caregiver user and an elderly profile.
 */
export async function createCareRelationship(
  caregiverUserId: string,
  elderlyProfileId: string,
  relationship: 'parent' | 'grandparent' | 'spouse' | 'other' = 'parent'
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) return { success: false, error: 'Supabase not configured' };

  try {
    const { error } = await supabase.from('care_relationships').insert({
      caregiver_user_id: caregiverUserId,
      elderly_profile_id: elderlyProfileId,
      relationship,
      status: 'active',
    });

    if (error) {
      return { success: false, error: formatAuthError(error) };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create care relationship' };
  }
}

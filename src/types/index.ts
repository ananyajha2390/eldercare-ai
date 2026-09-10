export type AIMode = 'gemini' | 'demo';

export type UserRole = 'family' | 'elderly' | 'caregiver';

export type AppView =
  | 'landing'
  | 'login'
  | 'signup'
  | 'forgot-password'
  | 'reset-password'
  | 'profile'
  | 'settings'
  | 'calls'
  | 'voice'
  | 'family'
  | 'health'
  | 'medications'
  | 'simple'
  | 'history';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  language: 'auto' | 'hindi' | 'hinglish' | 'english';
  created_at?: string;
  updated_at?: string;
}

export interface CareRelationship {
  id: string;
  caregiver_user_id: string;
  elderly_profile_id: string;
  relationship: 'parent' | 'grandparent' | 'spouse' | 'other';
  status: 'active' | 'pending' | 'inactive';
  created_at?: string;
}

export interface OnboardingData {
  fullName: string;
  caregiverFor: string;
  seniorName: string;
  language: 'auto' | 'hindi' | 'hinglish' | 'english';
}

export type AudioState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface CallScheduleItem {
  id: string;
  time: string;
  title: string;
  status: 'completed' | 'scheduled' | 'missed';
  duration?: string;
  purpose: string;
  language: 'auto' | 'hindi' | 'hinglish' | 'english';
  enabled: boolean;
}

export interface CallHistoryItem {
  id: string;
  timestamp: string;
  title: string;
  status: 'completed' | 'missed';
  duration: string;
  summary: string;
  caregiverSummary: string;
  transcript: { role: 'ai' | 'user'; text: string; time: string }[];
  healthEvents: { type: string; value: string; isUnusual?: boolean }[];
  medicationEvents: { name: string; status: 'confirmed' | 'unconfirmed'; time: string }[];
  wellbeingObservation: string;
  alertsGenerated: string[];
}

export interface TelephonyConfig {
  provider: 'browser_demo' | 'twilio' | 'exotel' | 'plivo';
  isConfigured: boolean;
  phoneNumber?: string;
  targetPhone?: string;
  demoModeLabel: string;
}

export interface ElderlyProfile {
  id: string;
  owner_id?: string;
  name: string;
  honorific?: string;
  age: number;
  location?: string;
  address?: string;
  relationship?: string;
  phone?: string;
  preferredLanguage?: 'hinglish' | 'hindi' | 'english';
  primaryCaregiver?: string;
  emergencyContact?: string;
  avatarUrl?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  instruction: string;
  status: 'taken' | 'pending' | 'upcoming';
  takenAt?: string;
  category: 'cardio' | 'diabetes' | 'general' | 'supplement';
}

export interface HealthReading {
  id: string;
  timestamp: string;
  type: 'bp' | 'sugar' | 'hydration' | 'heartRate' | 'mood';
  label: string;
  value: string;
  unit?: string;
  systolic?: number;
  diastolic?: number;
  numericValue?: number;
  isUnusual: boolean;
  status: 'normal' | 'attention' | 'urgent';
  note?: string;
}

export interface SmartAlert {
  id: string;
  timestamp: string;
  timeAgo: string;
  title: string;
  readingType: string;
  readingValue: string;
  message: string;
  severity: 'normal' | 'attention' | 'urgent';
  caregiverNotified: boolean;
  recipientName: string;
  isDismissed: boolean;
  suggestedAction: string;
}

export interface ExtractedHealthData {
  bloodPressure: string | null;
  bloodPressureValues?: { systolic: number; diastolic: number } | null;
  bloodSugar: string | null;
  medicationStatus: 'taken' | 'missed' | 'pending' | null;
  mood: 'great' | 'good' | 'neutral' | 'tired' | 'dizzy' | 'unwell';
  symptoms: string[];
  isUnusual: boolean;
  alertSeverity: 'normal' | 'attention' | 'urgent';
  safeNote: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  extracted?: ExtractedHealthData | null;
  audioPlayed?: boolean;
}

export interface FamilyMember {
  id: string;
  owner_id?: string;
  elderly_id?: string;
  name: string;
  role: string;
  relationship: string;
  status: 'online' | 'offline';
  lastSeen?: string;
  avatarColor?: string;
  phone: string;
  location?: string;
  email?: string;
  is_primary_caregiver?: boolean;
  is_emergency_contact?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ConversationInsight {
  id: string;
  date: string;
  observation: string;
  category: 'routine' | 'fatigue' | 'recall' | 'wellness';
  significance: 'routine' | 'noteworthy';
  safetyGuidance: string;
}

export interface DemoStep {
  step: number;
  title: string;
  description: string;
  userSpeech?: string;
  aiResponse?: string;
  actionSummary: string;
  activeView: AppView;
}

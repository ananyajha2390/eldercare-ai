import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ProblemSection } from './components/ProblemSection';
import { SolutionSection } from './components/SolutionSection';
import { VoiceCompanion } from './components/VoiceCompanion';
import { FamilyDashboard } from './components/FamilyDashboard';
import { HealthAnalytics } from './components/HealthAnalytics';
import { MedicationTracker } from './components/MedicationTracker';
import { DailyAISummary } from './components/DailyAISummary';
import { ConversationMemory } from './components/ConversationMemory';
import { FamilyCircle } from './components/FamilyCircle';
import { EmergencySafety } from './components/EmergencySafety';
import { SimpleElderlyMode } from './components/SimpleElderlyMode';
import { DemoController } from './components/DemoController';
import { IncomingCallModal } from './components/IncomingCallModal';
import { AICareCallsPage } from './components/AICareCallsPage';
import { CallHistoryPage } from './components/CallHistoryPage';
import { DevelopmentDebugPanel } from './components/DevelopmentDebugPanel';
import { Footer } from './components/Footer';

// Auth Components & Context
import { useAuth } from './contexts/AuthContext';
import { getHonorificName } from './lib/nameUtils';
import { AuthPage } from './components/auth/AuthPage';
import { OnboardingModal } from './components/auth/OnboardingModal';
import { ProfileModal } from './components/auth/ProfileModal';
import { SettingsModal } from './components/auth/SettingsModal';
import { PrivacySecurityModal } from './components/auth/PrivacySecurityModal';
import {
  HeartPulse,
  Sparkles,
  User,
  LogIn,
  UserPlus,
  PlayCircle,
  AlertCircle,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

import {
  AppView,
  AIMode,
  SmartAlert,
  Medication,
  ExtractedHealthData,
  CallScheduleItem,
  CallHistoryItem,
  FamilyMember,
  ElderlyProfile
} from './types';
import { familyDataService } from './lib/familyDataService';
import {
  initialMedications,
  initialFamilyMembers,
  initialAlerts,
  initialInsights,
  initialCallSchedule,
  initialCallHistory
} from './data/mockData';

export default function App() {
  const {
    user,
    session,
    profile,
    loading: authLoading,
    isConfigured,
    isDemoMode,
    demoRole,
    onboardingPending,
    completeOnboarding,
    signOut,
  } = useAuth();

  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [simpleMode, setSimpleMode] = useState<boolean>(false);
  const [aiMode, setAIMode] = useState<AIMode>('gemini');
  const [demoOpen, setDemoOpen] = useState<boolean>(false);

  // Modal dialog states
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Proactive Calling & Telephony state
  const [callModalOpen, setCallModalOpen] = useState<boolean>(false);
  const [callModalScenario, setCallModalScenario] = useState<'high_bp' | 'normal' | null>(null);
  const [callSchedules, setCallSchedules] = useState<CallScheduleItem[]>(initialCallSchedule);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>(initialCallHistory);

  // Dynamic Family & Elderly Profile State
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [elderlyProfile, setElderlyProfile] = useState<ElderlyProfile | null>(null);
  const [hasRealHealthData, setHasRealHealthData] = useState<boolean>(false);

  // Live health and caregiver states
  const [currentBP, setCurrentBP] = useState<string>('');
  const [currentSugar, setCurrentSugar] = useState<string>('');
  const [currentMood, setCurrentMood] = useState<string>('');
  const [lastCheckInTime, setLastCheckInTime] = useState<string>('');
  const [hydrationStatus, setHydrationStatus] = useState<string>('');
  const [isStable, setIsStable] = useState<boolean>(true);

  const [medications, setMedications] = useState<Medication[]>(initialMedications);
  const [activeAlerts, setActiveAlerts] = useState<SmartAlert[]>(initialAlerts);
  const [insights, setInsights] = useState(initialInsights);

  // Debug Panel Telemetry
  const [geminiConnected, setGeminiConnected] = useState<boolean>(true);
  const [lastUserInput, setLastUserInput] = useState<string>('Mera BP 158 by 98 hai.');
  const [lastGeminiResponse, setLastGeminiResponse] = useState<string>('Sharma ji, aaram se baithiye. Kya subah medicine le li thi?');
  const [lastExtractedEvent, setLastExtractedEvent] = useState<string>('logHealthReading({ type: "blood_pressure", value: "158/98" })');
  const [lastError, setLastError] = useState<string | null>(null);

  // Check URL hash on mount for Supabase password recovery
  useEffect(() => {
    if (window.location.hash.includes('type=recovery') || window.location.hash.includes('reset-password')) {
      setCurrentView('reset-password');
    }
  }, []);

  // Synchronize onboarding prompt when user signs up
  useEffect(() => {
    if (user && onboardingPending) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [user, onboardingPending]);

  // Set default role view on profile load
  useEffect(() => {
    if (profile?.role === 'elderly' && currentView === 'landing') {
      setSimpleMode(true);
      setCurrentView('simple');
    }
  }, [profile?.role]);

  // Check backend AI status on mount
  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        setGeminiConnected(Boolean(data.geminiConfigured));
      })
      .catch(() => {
        setGeminiConnected(false);
      });
  }, []);

  // Load real user data from Supabase (multi-tenant isolated by user.id)
  useEffect(() => {
    let isMounted = true;
    const loadUserData = async () => {
      if (user) {
        try {
          // 1. Fetch elderly profile
          const elder = await familyDataService.getElderlyProfile(user.id);
          if (!isMounted) return;
          setElderlyProfile(elder);

          // 2. Fetch family members
          const members = await familyDataService.getFamilyMembers(user.id);
          if (!isMounted) return;
          setFamilyMembers(members);

          // 3. Fetch latest health reading
          const reading = await familyDataService.getLatestHealthReading(user.id);
          if (!isMounted) return;

          if (reading && reading.hasData) {
            setHasRealHealthData(true);
            if (reading.latestBP) {
              setCurrentBP(reading.latestBP);
            }
            if (reading.latestSugar) {
              setCurrentSugar(reading.latestSugar);
            }
            if (reading.mood) {
              setCurrentMood(reading.mood);
            }
            if (reading.hydration) {
              setHydrationStatus(reading.hydration);
            }
            if (reading.recordedAt) {
              setLastCheckInTime(
                new Date(reading.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              );
            }
          } else {
            // New user with no health readings yet
            setHasRealHealthData(false);
            setCurrentBP('');
            setCurrentSugar('');
            setCurrentMood('');
            setLastCheckInTime('');
            setHydrationStatus('');
          }
        } catch (err) {
          console.warn('Error loading user family data:', err);
        }
      } else if (isDemoMode) {
        setFamilyMembers(initialFamilyMembers);
        setElderlyProfile({
          id: 'demo-elderly-1',
          name: 'Sunita Sharma',
          relationship: 'Mom',
          age: 74,
          phone: '+91 98110 43210',
          address: 'Vasant Kunj, New Delhi',
        });
        setCurrentBP('128 / 82');
        setCurrentSugar('142');
        setCurrentMood('good');
        setLastCheckInTime('10:32 AM');
        setHydrationStatus('Good');
        setHasRealHealthData(true);
      } else {
        setFamilyMembers([]);
        setElderlyProfile(null);
        setHasRealHealthData(false);
        setCurrentBP('');
        setCurrentSugar('');
        setCurrentMood('');
        setLastCheckInTime('');
        setHydrationStatus('');
      }
    };

    loadUserData();
    return () => {
      isMounted = false;
    };
  }, [user?.id, isDemoMode]);

  // Family Circle CRUD handlers
  const handleRefreshFamilyMembers = async () => {
    if (user) {
      try {
        const members = await familyDataService.getFamilyMembers(user.id, elderlyProfile?.id);
        setFamilyMembers(members);
      } catch (err) {
        console.warn('Error refreshing family members:', err);
      }
    }
  };

  const handleAddFamilyMember = async (memberData: Omit<FamilyMember, 'id'>) => {
    if (user) {
      const saved = await familyDataService.addFamilyMember(user.id, {
        ...memberData,
        elderly_id: memberData.elderly_id || elderlyProfile?.id,
      });
      await handleRefreshFamilyMembers();
      return saved;
    } else {
      const newMem: FamilyMember = {
        ...memberData,
        id: `mem-${Date.now()}`,
        avatarColor: 'bg-teal-600',
      };
      setFamilyMembers(prev => [...prev, newMem]);
    }
  };

  const handleUpdateFamilyMember = async (id: string, updates: Partial<FamilyMember>) => {
    if (user) {
      await familyDataService.updateFamilyMember(id, updates, user.id);
    }
    setFamilyMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleDeleteFamilyMember = async (id: string) => {
    if (user) {
      await familyDataService.deleteFamilyMember(id, user.id);
    }
    setFamilyMembers(prev => prev.filter(m => m.id !== id));
  };

  const handleSaveElderlyProfile = async (profileData: {
    name: string;
    relationship: string;
    age: number;
    phone?: string;
    address?: string;
  }) => {
    if (user) {
      const saved = await familyDataService.saveElderlyProfile(user.id, profileData);
      setElderlyProfile(saved);
    } else {
      setElderlyProfile({
        id: `local-elder-${Date.now()}`,
        ...profileData,
      });
    }
  };

  // Open Proactive Call
  const handleTriggerCall = (scenario: 'high_bp' | 'normal' = 'normal') => {
    setCallModalScenario(scenario);
    setCallModalOpen(true);
  };

  // Update vitals when voice companion or live call extracts data
  const handleHealthDataExtracted = (data: ExtractedHealthData) => {
    if (data.bloodPressure) {
      setCurrentBP(data.bloodPressure);
      setLastExtractedEvent(`Extracted BP: ${data.bloodPressure}`);
      if (data.bloodPressureValues && data.bloodPressureValues.systolic >= 150) {
        setIsStable(false);
      }
    }
    if (data.bloodSugar) {
      setCurrentSugar(data.bloodSugar);
    }
    if (data.mood) {
      setCurrentMood(data.mood);
    }
    if (data.medicationStatus === 'taken') {
      setMedications(prev =>
        prev.map((m, idx) => (idx === 0 ? { ...m, status: 'taken', takenAt: 'Just now' } : m))
      );
      setLastExtractedEvent('Extracted Medication: Confirmed via voice');
    }
    setLastCheckInTime('Just now');
  };

  // Called when IncomingCallModal ends and saves history
  const handleCallCompleted = (completedCall: CallHistoryItem) => {
    setCallHistory(prev => [completedCall, ...prev]);
    setLastCheckInTime('Just now');

    if (completedCall.healthEvents && completedCall.healthEvents.length > 0) {
      completedCall.healthEvents.forEach(evt => {
        if (evt.type.toLowerCase().includes('pressure') || evt.type.toLowerCase() === 'bp') {
          setCurrentBP(evt.value);
        }
        if (evt.type.toLowerCase().includes('sugar')) {
          setCurrentSugar(evt.value);
        }
      });
    }

    if (completedCall.medicationEvents && completedCall.medicationEvents.length > 0) {
      const hasConfirmed = completedCall.medicationEvents.some(m => m.status === 'confirmed');
      if (hasConfirmed) {
        setMedications(prev =>
          prev.map((m, idx) => (idx === 0 ? { ...m, status: 'taken', takenAt: 'Just now' } : m))
        );
      }
    }
  };

  const handleNewAlert = (alert: SmartAlert) => {
    setActiveAlerts(prev => [alert, ...prev]);
    setIsStable(false);
  };

  const handleDismissAlert = (id: string) => {
    setActiveAlerts(prev => prev.filter(a => a.id !== id));
    if (activeAlerts.length <= 1) {
      setIsStable(true);
    }
  };

  const handleToggleMedStatus = (id: string) => {
    setMedications(prev =>
      prev.map(m => {
        if (m.id === id) {
          const next = m.status === 'taken' ? 'pending' : 'taken';
          return { ...m, status: next, takenAt: next === 'taken' ? 'Just now' : undefined };
        }
        return m;
      })
    );
  };

  const handleAddMedication = (newMed: Omit<Medication, 'id'>) => {
    const created: Medication = {
      ...newMed,
      id: `med-${Date.now()}`,
    };
    setMedications(prev => [...prev, created]);
  };

  const handleResetToBaseline = () => {
    setCurrentBP('128 / 82');
    setCurrentSugar('142 mg/dL');
    setCurrentMood('good');
    setIsStable(true);
    setActiveAlerts(initialAlerts);
  };

  // Quick simulate alert (BP 158/98)
  const handleQuickSimulateAlert = () => {
    setCurrentBP('158 / 98');
    setIsStable(false);
    const alert: SmartAlert = {
      id: `alert-${Date.now()}`,
      timestamp: 'Just now',
      timeAgo: 'Just now',
      title: '⚠️ Unusual Reading Detected',
      readingType: 'Blood Pressure',
      readingValue: '158 / 98',
      message: "Today's reading is higher than recent readings recorded for this profile.",
      severity: 'attention',
      caregiverNotified: true,
      recipientName: 'Rahul',
      isDismissed: false,
      suggestedAction: 'Consider rechecking after 15 minutes of quiet rest and hydration.',
    };
    setActiveAlerts(prev => [alert, ...prev]);
  };

  const handleSimulateMissedCall = () => {
    const alert: SmartAlert = {
      id: `alert-missed-${Date.now()}`,
      timestamp: 'Just now',
      timeAgo: 'Just now',
      title: '⚠️ Unanswered Morning Call',
      readingType: 'Call Status',
      readingValue: 'No Answer after 45s',
      message: 'Scheduled 09:00 AM check-in call was unanswered. Initiating caregiver escalation.',
      severity: 'urgent',
      caregiverNotified: true,
      recipientName: 'Rahul',
      isDismissed: false,
      suggestedAction: 'Call Sharma ji directly or contact neighbor Sunil ji.',
    };
    setActiveAlerts(prev => [alert, ...prev]);
    setIsStable(false);
    setCurrentView('family');
  };

  const takenCount = medications.filter(m => m.status === 'taken').length;
  const isAuthenticated = Boolean(user || isDemoMode);

  // Authentication Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/25 animate-pulse">
            <HeartPulse className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">ELDERCARE AI</h2>
            <p className="text-xs text-slate-500">Checking session credentials securely...</p>
          </div>
        </div>
      </div>
    );
  }

  // Explicit Auth Views
  if (
    currentView === 'login' ||
    currentView === 'signup' ||
    currentView === 'forgot-password' ||
    currentView === 'reset-password'
  ) {
    if (isAuthenticated && currentView !== 'reset-password') {
      // Already logged in, navigate to dashboard
      setCurrentView(profile?.role === 'elderly' ? 'simple' : 'family');
    } else {
      const mode =
        currentView === 'signup'
          ? 'signup'
          : currentView === 'forgot-password'
          ? 'forgot'
          : currentView === 'reset-password'
          ? 'reset'
          : 'login';

      return (
        <AuthPage
          initialMode={mode}
          onSuccess={() => {
            if (profile?.role === 'elderly') {
              setSimpleMode(true);
              setCurrentView('simple');
            } else {
              setCurrentView('family');
            }
          }}
          onCancel={() => setCurrentView('landing')}
        />
      );
    }
  }

  // Protected Views: Check authentication
  const protectedViews: AppView[] = ['family', 'calls', 'health', 'medications', 'simple', 'history'];
  if (!isAuthenticated && protectedViews.includes(currentView)) {
    return (
      <AuthPage
        initialMode="login"
        onSuccess={() => {
          if (profile?.role === 'elderly') {
            setSimpleMode(true);
            setCurrentView('simple');
          } else {
            setCurrentView(currentView);
          }
        }}
        onCancel={() => setCurrentView('landing')}
      />
    );
  }

  // Simple Elderly Mode view
  if (simpleMode || currentView === 'simple') {
    return (
      <>
        {isDemoMode && (
          <div className="bg-amber-100 border-b border-amber-300 px-4 py-1.5 text-xs text-amber-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold bg-amber-200 text-amber-950 px-2 py-0.5 rounded text-[10px] uppercase">
                Demo Mode
              </span>
              <span>Elderly Senior View ({elderlyProfile?.name || profile?.care_recipient_name || (isDemoMode ? 'Sharma ji' : 'Elderly Member')})</span>
            </div>
            <button
              onClick={() => {
                setSimpleMode(false);
                setCurrentView('family');
              }}
              className="text-xs font-bold underline text-amber-900 cursor-pointer"
            >
              Switch to Family Caregiver Mode
            </button>
          </div>
        )}

        <SimpleElderlyMode
          onExit={() => {
            setSimpleMode(false);
            setCurrentView(profile?.role === 'elderly' ? 'landing' : 'family');
          }}
          onOpenVoice={() => handleTriggerCall('normal')}
          medications={medications}
          currentBP={currentBP}
          onQuickVoiceUtterance={(text) => {
            setLastUserInput(text);
            handleTriggerCall('normal');
          }}
        />

        {/* Incoming Call Modal inside Simple Mode */}
        <IncomingCallModal
          isOpen={callModalOpen}
          onClose={() => setCallModalOpen(false)}
          elderlyName={elderlyProfile?.name || profile?.care_recipient_name || (isDemoMode ? 'Sharma ji' : 'Elderly Member')}
          checkInTitle="Scheduled Care Check-in"
          onHealthDataExtracted={handleHealthDataExtracted}
          onNewAlert={handleNewAlert}
          onCallCompleted={handleCallCompleted}
          prefillScenario={callModalScenario}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFA] text-slate-900 font-sans antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/80 px-4 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-amber-200 text-amber-950 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
              Demo Mode Active
            </span>
            <span className="text-slate-700">
              Viewing as <strong className="text-slate-900">{profile?.full_name || 'Rahul'}</strong> ({demoRole === 'elderly' ? 'Elderly' : 'Family Caregiver'}). Gemini calling & vitals telemetry are live.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentView('signup')}
              className="font-bold text-amber-950 hover:text-amber-800 underline cursor-pointer"
            >
              Sign up with real Supabase credentials
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 bg-white/70 px-2 py-0.5 rounded border border-amber-200 cursor-pointer"
            >
              Exit Demo
            </button>
          </div>
        </div>
      )}

      {/* Unconfigured Supabase Banner (shown only on public landing if not yet configured) */}
      {!isConfigured && !isDemoMode && currentView === 'landing' && (
        <div className="bg-teal-900 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-300 shrink-0" />
            <span>
              <strong>Supabase Auth Ready:</strong> Connect your <code className="bg-teal-950 px-1 py-0.5 rounded font-mono text-[10px]">VITE_SUPABASE_URL</code> in environment variables or explore right away in interactive demo mode.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDemoOpen(true)}
            className="px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-600 text-white font-bold text-[11px] cursor-pointer"
          >
            ▶ Run 90-Second Demo
          </button>
        </div>
      )}

      {/* Sticky Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        onStartDemo={() => setDemoOpen(true)}
        onStartCall={() => handleTriggerCall('normal')}
        simpleMode={simpleMode}
        onToggleSimpleMode={() => setSimpleMode(true)}
        aiMode={aiMode}
        onToggleAIMode={() => setAIMode(prev => (prev === 'gemini' ? 'demo' : 'gemini'))}
        hasUnreadAlerts={activeAlerts.length > 0}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenPrivacy={() => setPrivacyModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Landing Page */}
        {currentView === 'landing' && (
          <>
            <HeroSection
              onNavigate={setCurrentView}
              onQuickVoiceTest={() => handleTriggerCall('normal')}
              onStartCall={() => handleTriggerCall('normal')}
              onStartDemo={() => setDemoOpen(true)}
            />
            <ProblemSection />
            <SolutionSection />

            {/* Public vs Authenticated CTA Section */}
            <section className="py-16 bg-white border-t border-slate-200/80">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {isAuthenticated
                    ? 'Ready to test automated AI Care Calls?'
                    : 'Join families keeping parents safe & connected'}
                </h3>
                <p className="text-slate-600 max-w-xl mx-auto text-sm">
                  {isAuthenticated
                    ? 'Simulate an automated AI care call, test live voice conversations, or examine the real-time caregiver analytics dashboard.'
                    : 'Create your caregiver account or sign in to configure AI calling times, emergency contacts, and daily health tracking.'}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {isAuthenticated ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleTriggerCall('normal')}
                        className="px-6 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md shadow-teal-600/20 cursor-pointer"
                      >
                        📞 Start AI Care Call
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('calls')}
                        className="px-6 py-3 rounded-2xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                      >
                        Manage Call Schedules
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('family')}
                        className="px-6 py-3 rounded-2xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer"
                      >
                        Open Family Dashboard
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setCurrentView('signup')}
                        className="px-7 py-3.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-600/20 cursor-pointer flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Get Started Free</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('login')}
                        className="px-6 py-3.5 rounded-2xl text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer flex items-center gap-2"
                      >
                        <LogIn className="w-4 h-4 text-teal-600" />
                        <span>Sign In</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setDemoOpen(true)}
                    className="px-6 py-3.5 rounded-2xl text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 cursor-pointer flex items-center gap-1.5"
                  >
                    <PlayCircle className="w-4 h-4 text-teal-600" />
                    <span>▶ Run 90-Second Demo</span>
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* AI Care Calls Page */}
        {currentView === 'calls' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AICareCallsPage
              schedule={callSchedules}
              onTriggerCall={(title) => handleTriggerCall('normal')}
              onSimulateMissedCall={handleSimulateMissedCall}
              onUpdateSchedule={setCallSchedules}
              onNavigate={setCurrentView}
            />
          </div>
        )}

        {/* Call History Page */}
        {currentView === 'history' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <CallHistoryPage
              calls={callHistory}
              onStartNewCall={() => handleTriggerCall('normal')}
            />
          </div>
        )}

        {/* Voice Companion (Direct mic room) */}
        {currentView === 'voice' && (
          <VoiceCompanion
            aiMode={aiMode}
            onHealthDataExtracted={handleHealthDataExtracted}
            onNewAlert={handleNewAlert}
            onNavigateToFamily={() => setCurrentView('family')}
          />
        )}

        {/* Family Dashboard View */}
        {currentView === 'family' && (
          <>
            <FamilyDashboard
              elderlyProfile={elderlyProfile}
              onSaveElderlyProfile={handleSaveElderlyProfile}
              caregiverName={profile?.full_name || user?.user_metadata?.full_name || (isDemoMode ? 'Rahul Sharma' : 'Caregiver')}
              currentBP={currentBP || null}
              currentSugar={currentSugar || null}
              medsTakenCount={takenCount}
              totalMedsCount={medications.length}
              currentMood={currentMood || null}
              lastCheckInTime={lastCheckInTime || null}
              hydrationStatus={hydrationStatus || null}
              isStable={isStable}
              hasRealData={hasRealHealthData}
              activeAlerts={activeAlerts}
              onDismissAlert={handleDismissAlert}
              onOpenMedications={() => setCurrentView('medications')}
              onOpenHealth={() => setCurrentView('health')}
              onQuickSimulateAlert={handleQuickSimulateAlert}
              onStartCall={() => handleTriggerCall('normal')}
              onOpenCallHistory={() => setCurrentView('history')}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
              <DailyAISummary
                currentBP={currentBP || null}
                currentSugar={currentSugar || null}
                medsTakenText={medications.length > 0 ? `${takenCount} / ${medications.length} Taken` : null}
                moodText={currentMood || null}
                lastCheckIn={lastCheckInTime || null}
                elderlyName={elderlyProfile?.name}
                caregiverName={profile?.full_name || (isDemoMode ? 'Rahul' : 'Caregiver')}
                hasRealData={hasRealHealthData}
              />

              <ConversationMemory insights={insights} />

              <FamilyCircle
                members={familyMembers}
                elderlyId={elderlyProfile?.id}
                onAddMember={handleAddFamilyMember}
                onUpdateMember={handleUpdateFamilyMember}
                onDeleteMember={handleDeleteFamilyMember}
                onRefresh={handleRefreshFamilyMembers}
              />

              <EmergencySafety
                primaryCaregiver={
                  familyMembers.find((m) => m.is_primary_caregiver) ||
                  (familyMembers.length > 0 ? familyMembers[0] : null)
                }
                emergencyContacts={familyMembers.filter((m) => m.is_emergency_contact)}
                onConfigureContacts={() => {
                  const el = document.getElementById('family-circle');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            </div>
          </>
        )}

        {/* Health Analytics View */}
        {currentView === 'health' && (
          <HealthAnalytics />
        )}

        {/* Medications Tracker View */}
        {currentView === 'medications' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <MedicationTracker
              medications={medications}
              onToggleStatus={handleToggleMedStatus}
              onAddMedication={handleAddMedication}
              onChangeTime={() => {}}
            />
          </div>
        )}
      </main>

      {/* Incoming Call Modal (Bidirectional Audio / Live AI Call) */}
      <IncomingCallModal
        isOpen={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        elderlyName={elderlyProfile?.name || profile?.care_recipient_name || (isDemoMode ? 'Sharma ji' : 'Elderly Member')}
        checkInTitle="Scheduled Care Check-in"
        onHealthDataExtracted={handleHealthDataExtracted}
        onNewAlert={handleNewAlert}
        onCallCompleted={handleCallCompleted}
        prefillScenario={callModalScenario}
      />

      {/* 15-Step Hackathon Guided Demo Overlay Controller */}
      <DemoController
        isOpen={demoOpen}
        onClose={() => setDemoOpen(false)}
        onNavigate={setCurrentView}
        onOpenCallModal={(scenario) => {
          setCallModalScenario(scenario || 'high_bp');
          setCallModalOpen(true);
        }}
        onCloseCallModal={() => setCallModalOpen(false)}
        onUpdateBP={setCurrentBP}
        onUpdateMood={setCurrentMood}
        onConfirmMedication={() => {
          setMedications(prev =>
            prev.map((m, idx) => (idx === 0 ? { ...m, status: 'taken', takenAt: 'Just now' } : m))
          );
        }}
        onTriggerAlert={handleNewAlert}
        onResetToBaseline={handleResetToBaseline}
      />

      {/* Judge & Developer Debug Telemetry Panel */}
      <DevelopmentDebugPanel
        geminiConnected={geminiConnected}
        liveSessionActive={callModalOpen}
        micActive={callModalOpen}
        audioOutputActive={callModalOpen}
        lastUserInput={lastUserInput}
        lastGeminiResponse={lastGeminiResponse}
        lastExtractedEvent={lastExtractedEvent}
        lastError={lastError}
      />

      {/* Post-Signup Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={async (data) => {
          await completeOnboarding(data);
          setShowOnboarding(false);
          if (data.role === 'elderly') {
            setSimpleMode(true);
            setCurrentView('simple');
          } else {
            setCurrentView('family');
          }
        }}
        onSkip={() => setShowOnboarding(false)}
      />

      {/* User Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Settings & Alerts Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      {/* Privacy & RLS Security Modal */}
      <PrivacySecurityModal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
      />

      {/* Footer with Taglines & Medical Disclaimer */}
      <Footer />
    </div>
  );
}

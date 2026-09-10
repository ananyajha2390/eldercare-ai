import React, { useState, useEffect } from 'react';
import {
  Heart,
  Pill,
  Activity,
  Smile,
  Clock,
  Droplets,
  AlertTriangle,
  Send,
  PhoneCall,
  ChevronRight,
  CheckCircle2,
  Edit2,
  UserPlus,
  X,
  User
} from 'lucide-react';
import { SmartAlert, ElderlyProfile } from '../types';

interface FamilyDashboardProps {
  elderlyProfile: ElderlyProfile | null;
  onSaveElderlyProfile: (profile: {
    name: string;
    relationship: string;
    age: number;
    phone?: string;
    address?: string;
  }) => Promise<void> | void;
  caregiverName?: string;
  currentBP: string | null;
  currentSugar: string | null;
  medsTakenCount: number;
  totalMedsCount: number;
  currentMood: string | null;
  lastCheckInTime: string | null;
  hydrationStatus: string | null;
  isStable: boolean;
  hasRealData?: boolean;
  activeAlerts: SmartAlert[];
  onDismissAlert: (id: string) => void;
  onOpenMedications: () => void;
  onOpenHealth: () => void;
  onQuickSimulateAlert: () => void;
  onStartCall?: () => void;
  onOpenCallHistory?: () => void;
}

export const FamilyDashboard: React.FC<FamilyDashboardProps> = ({
  elderlyProfile,
  onSaveElderlyProfile,
  caregiverName = 'Caregiver',
  currentBP,
  currentSugar,
  medsTakenCount,
  totalMedsCount,
  currentMood,
  lastCheckInTime,
  hydrationStatus,
  isStable,
  hasRealData = false,
  activeAlerts,
  onDismissAlert,
  onOpenMedications,
  onOpenHealth,
  onQuickSimulateAlert,
  onStartCall,
  onOpenCallHistory,
}) => {
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Elderly Profile Edit Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [formElderName, setFormElderName] = useState('');
  const [formElderRel, setFormElderRel] = useState('Mom');
  const [formElderAge, setFormElderAge] = useState('74');
  const [formElderPhone, setFormElderPhone] = useState('');
  const [formElderAddress, setFormElderAddress] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (elderlyProfile) {
      setFormElderName(elderlyProfile.name || '');
      setFormElderRel(elderlyProfile.relationship || 'Mom');
      setFormElderAge(String(elderlyProfile.age || 74));
      setFormElderPhone(elderlyProfile.phone || '');
      setFormElderAddress(elderlyProfile.address || elderlyProfile.location || '');
    } else {
      setFormElderName('');
      setFormElderRel('Mother');
      setFormElderAge('70');
      setFormElderPhone('');
      setFormElderAddress('');
    }
  }, [elderlyProfile]);

  const triggerCaregiverAction = (action: string) => {
    setToastMessage(action);
    setShowNotificationToast(true);
    setTimeout(() => setShowNotificationToast(false), 3500);
  };

  const handleOpenEditProfile = () => {
    if (elderlyProfile) {
      setFormElderName(elderlyProfile.name);
      setFormElderRel(elderlyProfile.relationship || 'Mother');
      setFormElderAge(String(elderlyProfile.age || 70));
      setFormElderPhone(elderlyProfile.phone || '');
      setFormElderAddress(elderlyProfile.address || elderlyProfile.location || '');
    }
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formElderName.trim()) {
      triggerCaregiverAction('Please enter the elderly person\'s name.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await onSaveElderlyProfile({
        name: formElderName.trim(),
        relationship: formElderRel.trim(),
        age: parseInt(formElderAge, 10) || 70,
        phone: formElderPhone.trim() || undefined,
        address: formElderAddress.trim() || undefined,
      });
      setIsEditProfileOpen(false);
      triggerCaregiverAction(`Elderly profile updated for ${formElderName.trim()}.`);
    } catch (err) {
      console.warn('Error saving elderly profile:', err);
      triggerCaregiverAction('Could not save profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Names & formatting
  const caregiverFirstName = caregiverName.split(' ')[0] || 'Caregiver';
  const elderFirstName = elderlyProfile?.name?.split(' ')[0] || '';
  const elderDisplayName = elderlyProfile
    ? `${elderlyProfile.name} (${elderlyProfile.relationship || 'Family'}, ${elderlyProfile.age || 70} yrs)`
    : 'Elderly profile not set up';

  const initials = elderlyProfile?.name
    ? elderlyProfile.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '??';

  // Status display strings
  const bpDisplay = currentBP || '-- / --';
  const sugarDisplay = currentSugar ? `${currentSugar} mg/dL` : '-- mg/dL';
  const moodDisplay = currentMood || 'No data';
  const checkInDisplay = lastCheckInTime || 'No call today';
  const hydrationDisplay = hydrationStatus || 'No data';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10" id="family-dashboard">
      {/* Toast feedback simulation */}
      {showNotificationToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs font-medium">{toastMessage}</div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Caregiver Live Sync • {elderlyProfile?.address || 'Connected to Supabase'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Good morning, {caregiverFirstName} 👋
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-0.5">
            Here's how {elderFirstName || 'your family member'} is doing today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onStartCall && (
            <button
              type="button"
              id="dashboard-start-call-btn"
              onClick={onStartCall}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md shadow-teal-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Start AI Care Call</span>
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              triggerCaregiverAction(
                `Check-in reminder request sent to ${elderFirstName || 'elderly'}'s voice companion.`
              )
            }
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-teal-600" />
            <span>Send Reminder</span>
          </button>

          <button
            type="button"
            onClick={onQuickSimulateAlert}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Simulate sudden unusual BP reading (158/98) to test caregiver alert"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Simulate High BP Alert</span>
          </button>
        </div>
      </div>

      {/* Active Alerts Banner if any */}
      {activeAlerts.length > 0 && (
        <div className="mb-8 space-y-3">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              id={`alert-card-${alert.id}`}
              className={`rounded-2xl p-4 sm:p-5 border shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3 ${
                alert.severity === 'attention' || alert.severity === 'urgent'
                  ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-950'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-amber-800">
                      {alert.title}
                    </span>
                    {alert.readingValue && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-bold">
                        {alert.readingType}: {alert.readingValue}
                      </span>
                    )}
                    <span className="text-[10px] text-amber-800 font-medium">
                      {alert.timeAgo}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-amber-950 mt-1">
                    "{alert.message}"
                  </p>
                  <p className="text-xs text-amber-900 mt-0.5">
                    Suggested: {alert.suggestedAction} •{' '}
                    <span className="font-bold">{caregiverFirstName} has been notified.</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    triggerCaregiverAction(`Calling ${elderFirstName || 'family member'} via direct connection...`)
                  }
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-800 text-white hover:bg-amber-900 shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call {elderFirstName || 'Member'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDismissAlert(alert.id)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/80 hover:bg-white text-slate-700 border border-amber-300 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Status Card: Elderly Profile & Status */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm mb-8" id="elderly-profile-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
              {elderlyProfile ? initials : <User className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {elderDisplayName}
                </span>
                <button
                  type="button"
                  onClick={handleOpenEditProfile}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-md border border-teal-200 transition-colors cursor-pointer"
                  title="Edit Elderly Profile Details"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{elderlyProfile ? 'Edit' : 'Set Up'}</span>
                </button>
              </div>

              <div className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5 mt-0.5">
                {elderFirstName || 'Family Member'}'s Current Status:
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                    isStable
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900 animate-pulse'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isStable ? 'bg-emerald-600' : 'bg-amber-600'
                    }`}
                  />
                  {isStable ? '● Stable' : '● Attention Needed'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-3 border border-slate-200/70 text-xs">
            <div className="text-left">
              <span className="text-slate-700 block font-medium">Last Voice Check-in</span>
              <span className="text-slate-900 font-bold text-sm">{checkInDisplay}</span>
            </div>
            <div className="h-7 w-px bg-slate-200" />
            <div className="text-left">
              <span className="text-slate-700 block font-medium">Next Scheduled</span>
              <span className="text-slate-900 font-bold text-sm">01:00 PM (Lunch Meds)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Key Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {/* Card 1: Medication */}
        <div
          onClick={onOpenMedications}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-teal-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Medication
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Pill className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {totalMedsCount > 0 ? `${medsTakenCount} / ${totalMedsCount}` : '0 / 0'}
            </div>
            <div className="text-[11px] font-semibold text-emerald-700">
              {totalMedsCount === 0
                ? 'No medications logged'
                : medsTakenCount === totalMedsCount
                ? 'All Taken ✓'
                : `${medsTakenCount} taken`}
            </div>
          </div>
          <div className="text-[10px] text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>View list</span>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 2: Blood Pressure */}
        <div
          onClick={onOpenHealth}
          className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between ${
            currentBP && (currentBP.startsWith('15') || currentBP.startsWith('16'))
              ? 'border-amber-300 bg-amber-50/40'
              : 'border-slate-200/80 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Blood Pressure
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {bpDisplay}
            </div>
            <div
              className={`text-[11px] font-semibold ${
                currentBP && currentBP.startsWith('15')
                  ? 'text-amber-700'
                  : currentBP
                  ? 'text-slate-500'
                  : 'text-slate-400'
              }`}
            >
              {currentBP
                ? currentBP.startsWith('15')
                  ? 'Higher than normal'
                  : 'Recorded today'
                : 'No reading today'}
            </div>
          </div>
          <div className="text-[10px] text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Trend history</span>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 3: Blood Sugar */}
        <div
          onClick={onOpenHealth}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Blood Sugar
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {sugarDisplay}
            </div>
            <div className="text-[11px] font-semibold text-slate-500">
              {currentSugar ? 'Recorded today' : 'No reading today'}
            </div>
          </div>
          <div className="text-[10px] text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Chart log</span>
            <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 4: Mood */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Mood
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Smile className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-xl sm:text-2xl font-black text-slate-900 capitalize">
              {moodDisplay}
            </div>
            <div className="text-[11px] font-semibold text-teal-700">
              {currentMood ? 'Reported during call' : 'Awaiting voice check-in'}
            </div>
          </div>
          <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-100">
            {currentMood ? 'Check-in state' : 'No report logged'}
          </div>
        </div>

        {/* Card 5: Last Check-in */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Last Check-in
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {checkInDisplay}
            </div>
            <div className="text-[11px] font-semibold text-emerald-700">
              {lastCheckInTime ? 'Via Voice Companion' : 'Scheduled call pending'}
            </div>
          </div>
          <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-100">
            {lastCheckInTime ? 'Call completed' : 'No calls today'}
          </div>
        </div>

        {/* Card 6: Hydration */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Hydration
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Droplets className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {hydrationDisplay}
            </div>
            <div className="text-[11px] font-semibold text-teal-700">
              {hydrationStatus ? 'Recorded today' : 'Awaiting check-in'}
            </div>
          </div>
          <div className="text-[10px] text-slate-600 pt-2 border-t border-slate-100">
            {hydrationStatus ? 'Water intake logged' : 'No log today'}
          </div>
        </div>
      </div>

      {/* Edit Elderly Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {elderlyProfile ? 'Edit Elderly Profile' : 'Set Up Elderly Profile'}
                </h4>
                <p className="text-xs text-slate-500">
                  Manage the care recipient connected to your family account
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Elderly Person's Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formElderName}
                  onChange={(e) => setFormElderName(e.target.value)}
                  placeholder="e.g. Kanta Devi or Sunita Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Relationship <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formElderRel}
                    onChange={(e) => setFormElderRel(e.target.value)}
                    placeholder="e.g. Mom, Father, Grandparent"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Age (Years) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    value={formElderAge}
                    onChange={(e) => setFormElderAge(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formElderPhone}
                  onChange={(e) => setFormElderPhone(e.target.value)}
                  placeholder="e.g. +91 98110 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Address / City Location
                </label>
                <input
                  type="text"
                  value={formElderAddress}
                  onChange={(e) => setFormElderAddress(e.target.value)}
                  placeholder="e.g. Vasant Kunj, New Delhi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  disabled={isSavingProfile}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSavingProfile ? <span>Saving...</span> : <span>Save Profile</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

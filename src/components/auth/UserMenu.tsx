import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  LogOut,
  Settings,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  HeartPulse,
  Users,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AppView } from '../../types';

interface UserMenuProps {
  onNavigate: (view: AppView) => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenPrivacy: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  onNavigate,
  onOpenProfile,
  onOpenSettings,
  onOpenPrivacy,
}) => {
  const { user, profile, signOut, isDemoMode, demoRole } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split('@')[0] : (isDemoMode ? 'Rahul (Demo Caregiver)' : 'Caregiver'));
  const roleLabel = profile?.role === 'elderly' ? 'Elderly User' : 'Family / Caregiver';
  const email = profile?.email || user?.email || (isDemoMode ? 'demo@eldercare.ai' : '');

  // Get first letter for avatar
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    onNavigate('landing');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Menu Trigger Button */}
      <button
        type="button"
        id="user-profile-menu-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full sm:rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
          {initials || 'U'}
        </div>

        {/* User Info (Hidden on very small screens) */}
        <div className="hidden sm:block text-left pr-1 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 group-hover:text-teal-700 transition-colors truncate max-w-[110px]">
              {displayName}
            </span>
            {isDemoMode && (
              <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                DEMO
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-medium block">
            {roleLabel}
          </span>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Info */}
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
            <p className="text-[11px] text-slate-500 truncate">{email}</p>
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/80">
              <ShieldCheck className="w-3 h-3 text-teal-600" />
              <span>{roleLabel}</span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenProfile();
              }}
              className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <User className="w-4 h-4 text-slate-400" />
              <span>Profile Details</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Settings & Notifications</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenPrivacy();
              }}
              className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4 text-slate-400" />
              <span>Privacy & RLS Security</span>
            </button>

            {/* Quick role switcher for testing / demo */}
            <div className="px-4 py-1.5 border-t border-slate-100 my-1">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Active Interface
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate('family');
                  }}
                  className="flex-1 py-1 px-2 text-[10px] font-bold rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 text-slate-700 transition-colors text-center"
                >
                  Family Hub
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate('simple');
                  }}
                  className="flex-1 py-1 px-2 text-[10px] font-bold rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 text-slate-700 transition-colors text-center"
                >
                  Elderly Mode
                </button>
              </div>
            </div>
          </div>

          {/* Logout button */}
          <div className="pt-1 border-t border-slate-100">
            <button
              type="button"
              id="user-logout-btn"
              onClick={handleSignOut}
              className="w-full px-4 py-2.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

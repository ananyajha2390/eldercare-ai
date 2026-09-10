import React, { useState, useEffect } from 'react';
import { AppView, AIMode } from '../types';
import {
  HeartPulse,
  Sparkles,
  PlayCircle,
  Accessibility,
  Menu,
  X,
  Radio,
  LogIn,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserMenu } from './auth/UserMenu';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onStartDemo: () => void;
  onStartCall: () => void;
  simpleMode: boolean;
  onToggleSimpleMode: () => void;
  aiMode: AIMode;
  onToggleAIMode: () => void;
  hasUnreadAlerts?: boolean;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenPrivacy?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onStartDemo,
  onStartCall,
  simpleMode,
  onToggleSimpleMode,
  aiMode,
  onToggleAIMode,
  hasUnreadAlerts = false,
  onOpenProfile = () => {},
  onOpenSettings = () => {},
  onOpenPrivacy = () => {},
}) => {
  const { user, isDemoMode, profile } = useAuth();
  const isAuthenticated = Boolean(user || isDemoMode);

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Authenticated links vs Public links
  const authenticatedNavItems: { label: string; view: AppView }[] = [
    { label: 'Home', view: 'landing' },
    { label: 'AI Care Calls', view: 'calls' },
    { label: 'Elderly Mode', view: 'simple' },
    { label: 'Health', view: 'health' },
    { label: 'Medications', view: 'medications' },
    { label: 'Family Dashboard', view: 'family' },
    { label: 'Call History', view: 'history' },
  ];

  const publicNavItems: { label: string; action: () => void }[] = [
    { label: 'Home', action: () => onNavigate('landing') },
    {
      label: 'How It Works',
      action: () => {
        onNavigate('landing');
        setTimeout(() => {
          document.getElementById('solution-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
    },
    {
      label: 'Care Challenge',
      action: () => {
        onNavigate('landing');
        setTimeout(() => {
          document.getElementById('problem-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
    },
  ];

  const handleNavClick = (view: AppView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header
      id="main-header"
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-xs border-b border-slate-200/80 py-2.5'
          : 'bg-[#FBFBFA]/95 backdrop-blur-sm py-3.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <div
          id="brand-logo"
          onClick={() => handleNavClick('landing')}
          className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform duration-200">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 font-sans">
                ELDERCARE<span className="text-teal-600"> AI</span>
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/60">
                PROACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium tracking-wide">
              Care that calls. Care that listens.
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1 bg-slate-100/80 p-1 rounded-full border border-slate-200/60">
          {isAuthenticated ? (
            authenticatedNavItems.map((item) => {
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.label}
                  id={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  onClick={() => handleNavClick(item.view)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white text-teal-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {item.label}
                  {item.view === 'family' && hasUnreadAlerts && (
                    <span className="ml-1.5 w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse" />
                  )}
                </button>
              );
            })
          ) : (
            publicNavItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))
          )}
        </nav>

        {/* Right CTA Actions */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {isAuthenticated ? (
            <>
              {/* 90-Second Demo Button */}
              <button
                type="button"
                id="launch-demo-btn"
                onClick={onStartDemo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200/80 hover:bg-teal-100 transition-all cursor-pointer active:scale-95"
                title="Interactive 15-step walkthrough of the ElderCare AI calling story"
              >
                <PlayCircle className="w-3.5 h-3.5 text-teal-600" />
                <span>▶ 90s Demo</span>
              </button>

              {/* Primary CTA: Start AI Care Call */}
              <button
                type="button"
                id="start-care-call-btn"
                onClick={onStartCall}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md shadow-teal-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Start AI Care Call</span>
              </button>

              {/* Top-Right Authenticated User Menu */}
              <UserMenu
                onNavigate={onNavigate}
                onOpenProfile={onOpenProfile}
                onOpenSettings={onOpenSettings}
                onOpenPrivacy={onOpenPrivacy}
              />
            </>
          ) : (
            <>
              {/* Public Actions: Demo, Sign In, Get Started */}
              <button
                type="button"
                id="public-run-demo-btn"
                onClick={onStartDemo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-all cursor-pointer"
              >
                <PlayCircle className="w-3.5 h-3.5 text-teal-600" />
                <span>▶ See How It Works</span>
              </button>

              <button
                type="button"
                id="public-signin-btn"
                onClick={() => onNavigate('login')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                id="public-getstarted-btn"
                onClick={() => onNavigate('signup')}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md shadow-teal-600/20 transition-all cursor-pointer active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Get Started</span>
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex xl:hidden items-center gap-2">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={onStartCall}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-600"
            >
              Call
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200"
            >
              Sign In
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-5 space-y-2.5 shadow-lg animate-in slide-in-from-top-2 duration-200">
          {isAuthenticated ? (
            <>
              <div className="grid grid-cols-2 gap-1">
                {authenticatedNavItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleNavClick(item.view)}
                    className={`text-left px-3 py-2 rounded-lg text-xs font-semibold ${
                      currentView === item.view
                        ? 'bg-teal-50 text-teal-800'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onStartCall();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold text-white bg-teal-600 shadow-sm"
                >
                  <Radio className="w-3.5 h-3.5" />
                  Start AI Care Call
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onStartDemo();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-teal-600" />
                  ▶ Run 90-Second Demo
                </button>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>Logged in as <strong>{profile?.full_name || 'User'}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenProfile();
                      setMobileMenuOpen(false);
                    }}
                    className="text-teal-600 font-bold"
                  >
                    Profile
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                {publicNavItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      item.action();
                      setMobileMenuOpen(false);
                    }}
                    className="text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('signup');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 flex items-center justify-center gap-2 shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Get Started Free</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onNavigate('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onStartDemo();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 flex items-center justify-center gap-2"
                >
                  <PlayCircle className="w-4 h-4 text-teal-600" />
                  <span>▶ See How It Works</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

import React from 'react';
import { AudioState } from '../types';
import { Mic, Sparkles, Volume2 } from 'lucide-react';

interface AIOrbProps {
  state: AudioState;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  onClick?: () => void;
  showRipples?: boolean;
}

export const AIOrb: React.FC<AIOrbProps> = ({
  state,
  size = 'md',
  onClick,
  showRipples = true,
}) => {
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-36 h-36',
    lg: 'w-52 h-52',
    hero: 'w-64 h-64 sm:w-80 sm:h-80',
  }[size];

  const stateColors = {
    idle: {
      gradient: 'from-teal-500 via-emerald-400 to-sky-400',
      glow: 'rgba(20, 184, 166, 0.35)',
      ring: 'border-teal-300/40',
      label: 'Tap to Talk',
    },
    listening: {
      gradient: 'from-emerald-400 via-teal-300 to-cyan-400',
      glow: 'rgba(52, 211, 153, 0.65)',
      ring: 'border-emerald-400',
      label: 'Listening...',
    },
    thinking: {
      gradient: 'from-sky-400 via-indigo-400 to-teal-400',
      glow: 'rgba(99, 102, 241, 0.55)',
      ring: 'border-indigo-300/60',
      label: 'Thinking...',
    },
    speaking: {
      gradient: 'from-teal-400 via-sky-400 to-emerald-300',
      glow: 'rgba(56, 189, 248, 0.6)',
      ring: 'border-teal-400',
      label: 'ElderCare Speaking',
    },
  }[state];

  return (
    <div className="relative flex items-center justify-center select-none" id="ai-orb-container">
      {/* Dynamic expanding ripple rings when listening or speaking */}
      {showRipples && (state === 'listening' || state === 'speaking') && (
        <>
          <div
            className="absolute -inset-6 sm:-inset-10 rounded-full border border-emerald-400/40 animate-ping opacity-35 pointer-events-none"
            style={{ animationDuration: state === 'listening' ? '1.8s' : '2.4s' }}
          />
          <div
            className="absolute -inset-12 sm:-inset-16 rounded-full border border-teal-300/30 animate-pulse opacity-25 pointer-events-none"
            style={{ animationDuration: '2.5s' }}
          />
        </>
      )}

      {/* Rotating gradient halo in thinking state */}
      {state === 'thinking' && (
        <div
          className="absolute -inset-4 sm:-inset-6 rounded-full bg-gradient-to-r from-teal-400/30 via-indigo-400/30 to-sky-400/30 blur-xl animate-spin pointer-events-none"
          style={{ animationDuration: '6s' }}
        />
      )}

      {/* Ambient background glow */}
      <div
        className="absolute -inset-8 rounded-full blur-2xl opacity-60 transition-all duration-700 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${stateColors.glow} 0%, rgba(255,255,255,0) 70%)`,
        }}
      />

      {/* Main interactive orb */}
      <button
        type="button"
        id="voice-orb-button"
        onClick={onClick}
        aria-label={`Voice companion status: ${stateColors.label}`}
        className={`relative ${sizeClasses} rounded-full cursor-pointer focus:outline-none focus:ring-4 focus:ring-teal-400/50 shadow-2xl transition-all duration-500 transform hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center overflow-hidden border-2 ${stateColors.ring}`}
        style={{
          boxShadow: `0 20px 50px -10px ${stateColors.glow}, 0 0 30px 0 ${stateColors.glow}`,
        }}
      >
        {/* Shifting radial gradient body */}
        <div
          className={`absolute inset-0 bg-gradient-to-tr ${stateColors.gradient} opacity-95 transition-all duration-700`}
        />

        {/* Inner specular gloss highlight */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-b from-white/40 via-transparent to-black/10 pointer-events-none" />

        {/* Waveform bars simulation in speaking & listening modes */}
        {state === 'speaking' && (
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 px-6 z-10">
            {[40, 75, 95, 60, 85, 50, 90, 70, 45].map((height, i) => (
              <span
                key={i}
                className="w-1.5 sm:w-2 bg-white/95 rounded-full shadow-sm animate-pulse"
                style={{
                  height: `${height}%`,
                  animationDuration: `${0.4 + (i % 4) * 0.15}s`,
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        )}

        {state === 'listening' && (
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 px-6 z-10">
            {[30, 60, 80, 50, 75, 40, 70].map((height, i) => (
              <span
                key={i}
                className="w-1.5 sm:w-2 bg-white/95 rounded-full shadow-sm animate-bounce"
                style={{
                  height: `${height}%`,
                  animationDuration: `${0.6 + (i % 3) * 0.2}s`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Center state icon when idle or thinking */}
        {state === 'idle' && (
          <div className="z-10 flex flex-col items-center justify-center text-white text-center">
            <Mic className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md transition-transform duration-300 hover:scale-110" />
            <span className="text-xs sm:text-sm font-semibold tracking-wide drop-shadow-sm mt-1">
              Tap to Speak
            </span>
          </div>
        )}

        {state === 'thinking' && (
          <div className="z-10 flex flex-col items-center justify-center text-white">
            <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-white drop-shadow-md" style={{ animationDuration: '4s' }} />
            <span className="text-xs sm:text-sm font-medium tracking-wide mt-1">
              Listening & Thinking
            </span>
          </div>
        )}
      </button>
    </div>
  );
};

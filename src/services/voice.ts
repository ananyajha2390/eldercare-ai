/**
 * Upgraded Speech Recognition and Audio Synthesis Service for ElderCare AI
 *
 * Provides:
 * 1. Smart Indian Voice Prioritization (hi-IN -> en-IN -> Natural English)
 * 2. Asynchronous voice loading cache with onvoiceschanged support
 * 3. Text & Vitals normalization with Hinglish -> Devanagari conversion
 * 4. Stale-speech cancellation and queue overlap protection
 * 5. Respectful, unhurried cadence tailored for elderly comprehension
 * 6. Live voice diagnostics inspector state
 */

import { prepareTextForSpeech, detectLanguage } from './voiceNormalizer';
import { getHonorificName, getGreeting } from '../lib/nameUtils';

export type VoiceLanguageMode = 'auto' | 'hinglish' | 'hindi' | 'english';

export interface VoiceDiagnostics {
  originalText: string;
  preparedText: string;
  voiceName: string;
  voiceLang: string;
  isIndianVoice: boolean;
  detectedLanguage: string;
  usedDevanagari: boolean;
  rate: number;
  pitch: number;
  timestamp: string;
  status: 'idle' | 'speaking' | 'paused' | 'stopped';
}

interface SpeechRecognitionEventLike {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal?: boolean;
    };
    length: number;
  };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: SpeechRecognitionEventLike) => void;
  onerror: (event: any) => void;
  onend: () => void;
  onstart: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export class VoiceService {
  private recognition: SpeechRecognitionLike | null = null;
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  public isSpeechSupported = false;
  public isListening = false;
  public isSpeaking = false;

  // Voice preferences
  private availableVoices: SpeechSynthesisVoice[] = [];
  private selectedVoiceURI: string | null = null;
  private languageMode: VoiceLanguageMode = 'auto';
  private rate = 0.92; // Slower, clear rate for elderly ears
  private pitch = 1.0;

  // Observers for voices changed
  private voiceListeners: Array<(voices: SpeechSynthesisVoice[]) => void> = [];

  // Diagnostics for Hackathon Inspector Panel
  private lastDiagnostics: VoiceDiagnostics = {
    originalText: 'ElderCare AI initialized',
    preparedText: 'एल्डरकेयर एआई प्रारंभ',
    voiceName: 'Detecting best Indian voice...',
    voiceLang: 'hi-IN',
    isIndianVoice: true,
    detectedLanguage: 'hinglish',
    usedDevanagari: true,
    rate: 0.92,
    pitch: 1.0,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: 'idle',
  };

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechClass) {
        try {
          this.recognition = new SpeechClass();
          this.isSpeechSupported = true;
        } catch {
          this.isSpeechSupported = false;
        }
      }

      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.loadVoices();
        // Browser asynchronously loads voices
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = () => {
            this.loadVoices();
          };
        }
      }
    }
  }

  /**
   * Loads and categorizes available voices
   */
  private loadVoices(): void {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (voices && voices.length > 0) {
      this.availableVoices = voices;
      this.voiceListeners.forEach(listener => listener(voices));
    }
  }

  /**
   * Subscribe to voice list updates
   */
  public onVoicesChanged(cb: (voices: SpeechSynthesisVoice[]) => void): () => void {
    this.voiceListeners.push(cb);
    if (this.availableVoices.length > 0) {
      cb(this.availableVoices);
    }
    return () => {
      this.voiceListeners = this.voiceListeners.filter(l => l !== cb);
    };
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (this.availableVoices.length === 0 && this.synth) {
      this.availableVoices = this.synth.getVoices();
    }
    return this.availableVoices;
  }

  /**
   * Smart Voice Selection:
   * Prioritizes:
   * 1. hi-IN (Google हिन्दी, Microsoft Swara Natural, Lekha)
   * 2. en-IN (Google English India, Microsoft Neerja Natural, Ravi)
   * 3. Other natural voices
   * NEVER blindly returns getVoices()[0]!
   */
  public getBestVoice(language?: string): SpeechSynthesisVoice | null {
    const voices = this.getAvailableVoices();
    if (voices.length === 0) return null;

    // If user explicitly selected a voice URI, honor it
    if (this.selectedVoiceURI) {
      const userSelected = voices.find(v => v.voiceURI === this.selectedVoiceURI);
      if (userSelected) return userSelected;
    }

    const requestedLang = language || this.languageMode;

    // Categorize Indian Hindi voices
    const hindiVoices = voices.filter(v => {
      const langLower = (v.lang || '').toLowerCase().replace('_', '-');
      return langLower.startsWith('hi') || langLower === 'hi-in';
    });

    // Sort Hindi voices preferring Natural/Google/Microsoft
    hindiVoices.sort((a, b) => {
      const score = (v: SpeechSynthesisVoice) => {
        const name = (v.name || '').toLowerCase();
        if (name.includes('natural') || name.includes('online')) return 50;
        if (name.includes('google')) return 40;
        if (name.includes('swara') || name.includes('madhur')) return 35;
        if (name.includes('lekha') || name.includes('kalpana')) return 30;
        return 10;
      };
      return score(b) - score(a);
    });

    // Categorize Indian English voices
    const indianEnglishVoices = voices.filter(v => {
      const langLower = (v.lang || '').toLowerCase().replace('_', '-');
      return langLower === 'en-in' || langLower.startsWith('en-in');
    });

    // Sort Indian English voices
    indianEnglishVoices.sort((a, b) => {
      const score = (v: SpeechSynthesisVoice) => {
        const name = (v.name || '').toLowerCase();
        if (name.includes('natural') || name.includes('online')) return 50;
        if (name.includes('google')) return 40;
        if (name.includes('neerja') || name.includes('prabhat')) return 35;
        if (name.includes('ravi') || name.includes('heera') || name.includes('veena')) return 30;
        return 10;
      };
      return score(b) - score(a);
    });

    // If Hindi or Hinglish requested:
    if (requestedLang === 'hindi' || requestedLang === 'hinglish' || requestedLang === 'auto') {
      if (hindiVoices.length > 0) {
        return hindiVoices[0];
      }
      if (indianEnglishVoices.length > 0) {
        return indianEnglishVoices[0];
      }
    }

    // If English requested:
    if (requestedLang === 'english') {
      if (indianEnglishVoices.length > 0) {
        return indianEnglishVoices[0];
      }
    }

    // High quality English fallbacks
    const naturalEnglish = voices.filter(v => {
      const name = (v.name || '').toLowerCase();
      const lang = (v.lang || '').toLowerCase();
      return lang.startsWith('en') && (name.includes('natural') || name.includes('google') || name.includes('samantha'));
    });
    if (naturalEnglish.length > 0) return naturalEnglish[0];

    const anyEnglish = voices.find(v => (v.lang || '').toLowerCase().startsWith('en'));
    if (anyEnglish) return anyEnglish;

    return voices[0] || null;
  }

  /**
   * Sets the user's manual voice selection
   */
  public setSelectedVoice(voiceURI: string): void {
    this.selectedVoiceURI = voiceURI;
  }

  public getSelectedVoiceURI(): string | null {
    return this.selectedVoiceURI;
  }

  public setLanguageMode(mode: VoiceLanguageMode): void {
    this.languageMode = mode;
  }

  public getLanguageMode(): VoiceLanguageMode {
    return this.languageMode;
  }

  public setRate(newRate: number): void {
    this.rate = Math.max(0.6, Math.min(1.5, newRate));
  }

  public getRate(): number {
    return this.rate;
  }

  public setPitch(newPitch: number): void {
    this.pitch = Math.max(0.7, Math.min(1.4, newPitch));
  }

  public getPitch(): number {
    return this.pitch;
  }

  public getLastDiagnostics(): VoiceDiagnostics {
    return this.lastDiagnostics;
  }

  /**
   * Starts speech recognition with Indian acoustic language model
   */
  public startListening(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (err: any) => void,
    onEnd: () => void
  ): boolean {
    if (!this.recognition) {
      onError({ error: 'Browser Speech Recognition is not supported in this frame or browser' });
      return false;
    }

    // Cancel any active speech output when the user starts speaking
    this.stopSpeaking();

    try {
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      // Use hi-IN acoustic model which recognizes both Hindi and Hinglish speech accurately
      this.recognition.lang = 'hi-IN';

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = '';
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item && item[0]) {
            if (item.isFinal) {
              finalTranscript += item[0].transcript;
            } else {
              interim += item[0].transcript;
            }
          }
        }
        const text = finalTranscript || interim;
        onResult(text, Boolean(finalTranscript));
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        onError(event);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        onEnd();
      };

      this.recognition.start();
      return true;
    } catch (e) {
      this.isListening = false;
      onError(e);
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.isListening = false;
    }
  }

  /**
   * Upgraded speak method:
   * - Cancels stale speech to prevent overlap
   * - Automatically selects best Indian voice
   * - Normalizes Roman Hindi to Devanagari for authentic phonetics
   * - Applies elderly-friendly rate (0.92) and gentle cadence pauses
   */
  public speak(
    rawText: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ): void {
    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }

    // 1. Cancel any stale speech before beginning new utterance
    this.stopSpeaking();

    try {
      // 2. Determine best voice
      const bestVoice = this.getBestVoice();
      const voiceLang = bestVoice ? bestVoice.lang : 'hi-IN';

      // 3. Prepare text using normalizer
      const { speechText, detectedLang, usedDevanagari } = prepareTextForSpeech(
        rawText,
        voiceLang,
        this.languageMode
      );

      const utterance = new SpeechSynthesisUtterance(speechText);
      this.currentUtterance = utterance;

      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang;
      }

      // Elderly speech optimization
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;

      const isIndian = Boolean(
        bestVoice &&
        ((bestVoice.lang || '').includes('IN') || (bestVoice.lang || '').includes('hi') || (bestVoice.name || '').includes('India'))
      );

      // Update diagnostics for live inspector
      this.lastDiagnostics = {
        originalText: rawText,
        preparedText: speechText,
        voiceName: bestVoice ? `${bestVoice.name} (${bestVoice.lang})` : 'System Default',
        voiceLang: bestVoice ? bestVoice.lang : 'en-US',
        isIndianVoice: isIndian,
        detectedLanguage: detectedLang,
        usedDevanagari,
        rate: this.rate,
        pitch: this.pitch,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: 'speaking',
      };

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.lastDiagnostics.status = 'speaking';
        if (onStart) onStart();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.lastDiagnostics.status = 'idle';
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.lastDiagnostics.status = 'idle';
        if (onError) onError(e);
        if (onEnd) onEnd();
      };

      this.synth.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onError) onError(e);
      if (onEnd) onEnd();
    }
  }

  public pauseSpeaking(): void {
    if (this.synth && this.isSpeaking) {
      this.synth.pause();
      this.lastDiagnostics.status = 'paused';
    }
  }

  public resumeSpeaking(): void {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.lastDiagnostics.status = 'speaking';
    }
  }

  public stopSpeaking(): void {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // ignore
      }
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.lastDiagnostics.status = 'idle';
    }
  }

  /**
   * Test current voice settings with an authentic greeting
   */
  public testVoice(
    sampleText?: string,
    onStart?: () => void,
    onEnd?: () => void,
    userName?: string
  ): void {
    const greeting = getGreeting(userName);
    const honorific = getHonorificName(userName);
    const textToSpeak =
      sampleText ||
      (this.languageMode === 'english'
        ? (honorific ? `Good morning ${honorific}, this is ElderCare AI. How are you feeling today?` : 'Good morning, this is ElderCare AI. How are you feeling today?')
        : `${greeting}! Main ElderCare hoon. Aaj aapki tabiyat kaisi hai?`);

    this.speak(textToSpeak, onStart, onEnd);
  }
}

export const voiceService = new VoiceService();
